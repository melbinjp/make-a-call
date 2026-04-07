import { FirebaseService } from './services/FirebaseService.js';
import { WebRTCService } from './services/WebRTCService.js';
import { UIManager } from './ui/UIManager.js';
import { ChatManager } from './ui/ChatManager.js';
import { generateDeviceHash, generateMemorableRoomId } from './utils.js';

class App {
    constructor() {
        this.deviceHash = generateDeviceHash();
        this.userName = null;
        this.channel = null;
        this.maxCallers = 5;
        this.isCallActive = false;
        this.othersInCall = false;

        this.initialize();
    }

    initialize() {
        const elements = this._getElements();
        
        // Initialize services
        this.firebase = new FirebaseService();
        this.ui = new UIManager(elements, {
            onJoin: () => this.joinRoom(),
            onQuickCall: () => this.quickCall(),
            onCopy: () => this.copyUrl(),
            onStartCall: () => this.startCall(),
            onEndCall: () => this.endCall(),
            onSendMessage: () => this.sendMessage()
        });
        
        this.chat = new ChatManager(elements, {
            onSendMessage: (text) => this.sendMessage(text)
        });

        this.webrtc = new WebRTCService({
            onTrack: (peerId, stream) => this.handleRemoteStream(peerId, stream),
            onSignal: (type, payload) => this.firebase.sendSignal(this.channel, this.userName, { type, payload }),
            onConnectionStateChange: (peerId, state) => this.handleConnectionState(peerId, state),
            onDataChannelOpen: (peerId) => console.log('P2P data channel open with', peerId),
            onMessage: (peerId, data) => this.chat.handleP2PMessage(peerId, data)
        });

        this._checkUrlParams(elements);
    }

    _getElements() {
        return {
            callSetup: document.getElementById('callSetup'),
            callInterface: document.getElementById('callInterface'),
            channelInput: document.getElementById('channelInput'),
            nameInput: document.getElementById('nameInput'),
            maxCallers: document.getElementById('maxCallers'),
            joinBtn: document.getElementById('joinBtn'),
            quickCallBtn: document.getElementById('quickCallBtn'),
            callStatus: document.getElementById('callStatus'),
            callerCount: document.getElementById('callerCount'),
            maxCallerCount: document.getElementById('maxCallerCount'),
            shareUrl: document.getElementById('shareUrl'),
            copyBtn: document.getElementById('copyBtn'),
            messagesList: document.getElementById('messagesList'),
            messageInput: document.getElementById('messageInput'),
            sendMessageBtn: document.getElementById('sendMessageBtn'),
            startCallBtn: document.getElementById('startCallBtn'),
            speakerBtn: document.getElementById('speakerBtn'),
            muteBtn: document.getElementById('muteBtn'),
            endCallBtn: document.getElementById('endCallBtn'),
            participantsList: document.getElementById('participantsList')
        };
    }

    async joinRoom() {
        const name = this.ui.elements.nameInput.value.trim();
        const room = this.ui.elements.channelInput.value.trim() || generateMemorableRoomId();
        
        if (!name) {
            this.ui.showNotification('Please enter your name', 'error');
            return;
        }

        this.userName = name;
        this.channel = room;
        this.maxCallers = parseInt(this.ui.elements.maxCallers.value);

        // Check capacity
        const count = await this.firebase.getParticipantCount(room);
        if (this.maxCallers > 0 && count >= this.maxCallers) {
            this.ui.showNotification('Room is full!', 'error');
            return;
        }

        this.firebase.addParticipant(room, name, this.deviceHash, this.isCallActive);
        this.ui.showCallInterface();
        this.ui.updateStatus('Connected to room');
        this.ui.updateParticipantCount(count + 1, this.maxCallers);
        this._setupSignaling(room);
    }

    quickCall() {
        this.ui.elements.channelInput.value = generateMemorableRoomId();
        this.joinRoom();
    }

    _setupSignaling(room) {
        this.firebase.database.ref(`channels/${room}/signals`).on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (data && data.sender !== this.userName && data.targetPeer === this.userName) {
                this.webrtc.handleSignal(data.sender, data.type, data.payload);
                snapshot.ref.remove();
            }
        });

        this.firebase.database.ref(`channels/${room}/participants`).on('value', (snapshot) => {
            const participants = snapshot.val() || {};
            this.ui.renderParticipants(participants);
            this.othersInCall = Object.values(participants).some(p => p.inCall && p.name !== this.userName);
            this.ui.updateButtonStates(this.isCallActive, this.othersInCall);
            
            // Auto-connect to participants if we are in a call
            if (this.isCallActive) {
                Object.entries(participants).forEach(([name, data]) => {
                    if (name !== this.userName && !this.webrtc.peerConnections.has(name)) {
                        if (this.deviceHash < data.deviceHash) {
                            this.webrtc.createPeerConnection(name);
                        }
                    }
                });
            }
        });
    }

    async startCall() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.webrtc.setLocalStream(stream);
            this.isCallActive = true;
            this.firebase.database.ref(`channels/${this.channel}/participants/${this.userName}`).update({ inCall: true });
            this.ui.updateButtonStates(true, this.othersInCall);
            this.ui.showNotification('Voice call started', 'success');
        } catch (e) {
            this.ui.showNotification('Microphone access denied', 'error');
        }
    }

    endCall() {
        if (this.isCallActive) {
            this.webrtc.localStream?.getTracks().forEach(t => t.stop());
            this.webrtc.setLocalStream(null);
            this.isCallActive = false;
            this.firebase.database.ref(`channels/${this.channel}/participants/${this.userName}`).update({ inCall: false });
            this.ui.updateButtonStates(false, this.othersInCall);
        } else {
            this.leaveRoom();
        }
    }

    leaveRoom() {
        this.firebase.removeParticipant(this.channel, this.userName);
        this.webrtc.closeAll();
        this.ui.showCallSetup();
        this.channel = null;
        this.userName = null;
    }

    sendMessage() {
        const text = this.ui.elements.messageInput.value.trim();
        if (!text) return;

        this.webrtc.broadcastMessage({ type: 'chat', sender: this.userName, text });
        this.chat.displayMessage(this.userName, text, true);
        this.ui.elements.messageInput.value = '';
    }

    handleRemoteStream(peerId, stream) {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.srcObject = stream;
        document.body.appendChild(audio);
    }

    handleConnectionState(peerId, state) {
        console.log(`Connection with ${peerId}: ${state}`);
        if (state === 'connected') {
            this.ui.showNotification(`Connected to ${peerId}`, 'success');
        }
    }

    copyUrl() {
        const url = `${window.location.origin}${window.location.pathname}?channel=${this.channel}`;
        navigator.clipboard.writeText(url);
        this.ui.showNotification('Room URL copied!', 'success');
    }

    _checkUrlParams(elements) {
        const params = new URLSearchParams(window.location.search);
        const channel = params.get('channel');
        if (channel) {
            elements.channelInput.value = channel;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
