import { SIGNAL_CLEANUP_TIMEOUT } from '../constants.js';

/**
 * Handles all database and signaling logic via Firebase.
 */
export class FirebaseService {
    constructor() {
        this.database = firebase.database();
        this.isConnected = false;
        
        this._setupPresence();
    }

    _setupPresence() {
        this.database.ref('.info/connected').on('value', (snapshot) => {
            this.isConnected = snapshot.val() === true;
            console.log(this.isConnected ? '✅ Firebase connected' : '❌ Firebase disconnected');
        });
    }

    /**
     * The room ID used to be the entire access control -- database.rules.json granted
     * read/write to anyone who had it. Rules now require `auth != null` plus a
     * `members/$uid` entry for the room being touched, so every join has to establish
     * one first. Anonymous auth is enough: it is not about who you are, only that you
     * are a distinguishable, rate-limitable client rather than an anonymous request
     * with no footprint at all.
     */
    async ensureAuth() {
        if (firebase.auth().currentUser) return firebase.auth().currentUser.uid;
        const credential = await firebase.auth().signInAnonymously();
        return credential.user.uid;
    }

    /**
     * Registers the signed-in user as a member of `channelId`, which is what the rules
     * check before allowing anything else in that room to be read or written. Must
     * happen before `getParticipantCount`, `addParticipant` or the signal/participant
     * listeners in main.js -- all of those now require it.
     */
    async joinAsMember(channelId) {
        const uid = await this.ensureAuth();
        const memberRef = this.database.ref(`channels/${channelId}/members/${uid}`);
        await memberRef.set(true);
        memberRef.onDisconnect().remove();
        return uid;
    }

    /** The explicit counterpart to joinAsMember, for a deliberate leave rather than a
     * dropped connection -- onDisconnect alone would not fire until the socket closes. */
    leaveMembership(channelId) {
        const uid = firebase.auth().currentUser?.uid;
        if (!uid) return;
        this.database.ref(`channels/${channelId}/members/${uid}`).remove();
    }

    async getParticipantCount(channelId) {
        try {
            const snapshot = await this.database.ref(`channels/${channelId}/participants`).once('value');
            const participants = snapshot.val() || {};
            return Object.keys(participants).length;
        } catch (error) {
            console.error('Failed to get participant count:', error);
            return 0;
        }
    }

    addParticipant(channelId, userName, deviceHash, inCall) {
        const participantRef = this.database.ref(`channels/${channelId}/participants/${userName}`);
        participantRef.set({
            joined: Date.now(),
            deviceHash,
            inCall,
            name: userName
        });
        participantRef.onDisconnect().remove();
    }

    removeParticipant(channelId, userName) {
        this.database.ref(`channels/${channelId}/participants/${userName}`).remove();
    }

    sendSignal(channelId, userName, signalData) {
        const signalRef = this.database.ref(`channels/${channelId}/signals`).push();
        signalRef.set({
            ...signalData,
            sender: userName,
            timestamp: Date.now()
        });

        // Auto-cleanup
        setTimeout(() => signalRef.remove(), 10000);
    }

    cleanupOldSignals(channelId) {
        const signalsRef = this.database.ref(`channels/${channelId}/signals`);
        const cutoff = Date.now() - SIGNAL_CLEANUP_TIMEOUT;
        signalsRef.orderByChild('timestamp').endAt(cutoff).once('value', (snapshot) => {
            snapshot.forEach(child => child.ref.remove());
        });
    }

    goOffline() {
        this.database.goOffline();
    }

    goOnline() {
        this.database.goOnline();
    }
}
