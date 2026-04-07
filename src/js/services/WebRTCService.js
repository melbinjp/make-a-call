import { ICE_SERVERS } from '../constants.js';

/**
 * Handles WebRTC PeerConnections, ICE candidates, and data channels.
 */
export class WebRTCService {
    constructor(callbacks) {
        this.peerConnections = new Map();
        this.remoteStreams = new Map();
        this.dataChannels = new Map();
        this.localStream = null;
        this.callbacks = callbacks; // onTrack, onSignal, onDataChannelOpen, ...
    }

    setLocalStream(stream) {
        this.localStream = stream;
        // Update all existing connections
        this.peerConnections.forEach(pc => {
            stream.getTracks().forEach(track => {
                const senders = pc.getSenders();
                const alreadyTracking = senders.some(s => s.track === track);
                if (!alreadyTracking) {
                    pc.addTrack(track, stream);
                }
            });
        });
    }

    createPeerConnection(peerId) {
        const configuration = {
            iceServers: ICE_SERVERS,
            iceCandidatePoolSize: 10
        };

        const pc = new RTCPeerConnection(configuration);

        pc.onicecandidate = (event) => {
            if (event.candidate && (event.candidate.sdpMid || event.candidate.sdpMLineIndex !== null)) {
                this.callbacks.onSignal('ice-candidate', { candidate: event.candidate, targetPeer: peerId });
            }
        };

        pc.ontrack = (event) => {
            console.log('🎵 Received track from', encodeURIComponent(peerId));
            this.remoteStreams.set(peerId, event.streams[0]);
            this.callbacks.onTrack(peerId, event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            this.callbacks.onConnectionStateChange(peerId, pc.connectionState);
        };

        pc.onnegotiationneeded = async () => {
            if (pc.signalingState !== 'stable') return;
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                this.callbacks.onSignal('offer', { offer, targetPeer: peerId });
            } catch (err) {
                console.error('Negotiation error:', err);
            }
        };

        // Create DataChannel for messaging
        const dataChannel = pc.createDataChannel('messages', { ordered: true });
        this._setupDataChannel(peerId, dataChannel);

        pc.ondatachannel = (event) => {
            this._setupDataChannel(peerId, event.channel);
        };

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        this.peerConnections.set(peerId, pc);
        return pc;
    }

    _setupDataChannel(peerId, channel) {
        channel.onopen = () => {
            console.log('DataChannel opened with', peerId);
            this.dataChannels.set(peerId, channel);
            this.callbacks.onDataChannelOpen(peerId, channel);
        };

        channel.onmessage = (event) => {
            this.callbacks.onMessage(peerId, event.data);
        };

        channel.onclose = () => {
            this.dataChannels.delete(peerId);
        };
    }

    async handleSignal(sender, type, payload) {
        let pc = this.peerConnections.get(sender);
        if (!pc) {
            pc = this.createPeerConnection(sender);
        }

        switch (type) {
            case 'offer':
                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.callbacks.onSignal('answer', { answer, targetPeer: sender });
                break;

            case 'answer':
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                }
                break;

            case 'ice-candidate':
                if (pc.remoteDescription && payload.candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                }
                break;
        }
    }

    disconnect(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(peerId);
        }
        this.remoteStreams.delete(peerId);
        this.dataChannels.delete(peerId);
    }

    broadcastMessage(data) {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        this.dataChannels.forEach(channel => {
            if (channel.readyState === 'open') {
                channel.send(dataStr);
            }
        });
    }

    closeAll() {
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.remoteStreams.clear();
        this.dataChannels.clear();
    }
}
