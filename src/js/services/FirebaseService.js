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
