// Firebase configuration loaded from external file

// Initialize Firebase with connection debugging
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    
    // Enable offline persistence and debugging
    database.goOnline();
    
    // Test connection
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('✅ Firebase connected');
        } else {
            console.log('❌ Firebase disconnected');
        }
    });
    
} catch (error) {
    console.error('Firebase initialization failed:', error);
    // Clean up on initialization failure
    if (database) {
        try {
            database.goOffline();
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }
    }
    alert('Connection failed. Please refresh the page.');
}

class PhoneCall {
    constructor() {
        try {
            this.localStream = null;
            this.peerConnections = new Map();
            this.remoteStreams = new Map();
            this.channel = null;
            this.userName = null;
            this.deviceHash = this.generateDeviceHash();
            this.isMuted = false;
            this.connectedPeers = new Set();
            this.maxCallers = 2;
            this.currentCallers = 0;
            this.audioContext = null; // Reusable AudioContext
            this.activeNotifications = new Set(); // Track notifications
            
            this.initializeElements();
            this.setupEventListeners();
            this.checkUrlParams();
            this.setupPageUnloadHandler();
        } catch (error) {
            console.error('PhoneCall initialization failed:', error);
            this.showNotification('App initialization failed', 'error');
        }
    }

    initializeElements() {
        this.elements = {
            callSetup: document.getElementById('callSetup'),
            callInterface: document.getElementById('callInterface'),
            channelInput: document.getElementById('channelInput'),
            nameInput: document.getElementById('nameInput'),
            maxCallers: document.getElementById('maxCallers'),
            quickCallBtn: document.getElementById('quickCallBtn'),
            joinBtn: document.getElementById('joinBtn'),
            settingsToggle: document.getElementById('settingsToggle'),
            settingsPanel: document.getElementById('settingsPanel'),
            currentChannel: document.getElementById('currentChannel'),
            callStatus: document.getElementById('callStatus'),
            statusDot: document.getElementById('statusDot'),
            callerCount: document.getElementById('callerCount'),
            maxCallerCount: document.getElementById('maxCallerCount'),
            participantCountMini: document.getElementById('participantCountMini'),
            shareSection: document.getElementById('shareSection'),
            shareUrl: document.getElementById('shareUrl'),
            copyBtn: document.getElementById('copyBtn'),
            startCallBtn: document.getElementById('startCallBtn'),
            muteBtn: document.getElementById('muteBtn'),
            endCallBtn: document.getElementById('endCallBtn'),
            participantsList: document.getElementById('participantsList'),
            participantsToggle: document.getElementById('participantsToggle'),
            helpToggle: document.getElementById('helpToggle'),
            helpContent: document.getElementById('helpContent'),
            messagesList: document.getElementById('messagesList'),
            messageInput: document.getElementById('messageInput'),
            sendMessageBtn: document.getElementById('sendMessageBtn'),
            chatHistory: document.getElementById('chatHistory'),
            historyToggle: document.getElementById('historyToggle'),
            historyList: document.getElementById('historyList'),
            roomTitle: document.getElementById('roomTitle')
        };
    }

    setupEventListeners() {
        this.elements.quickCallBtn.addEventListener('click', () => this.quickCall());
        this.elements.joinBtn.addEventListener('click', () => this.joinChannel());
        this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
        this.elements.copyBtn.addEventListener('click', () => this.copyShareUrl());
        this.elements.startCallBtn.addEventListener('click', () => this.startCall());
        this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        this.elements.endCallBtn.addEventListener('click', () => this.endCall());
        this.elements.participantsToggle.addEventListener('click', () => this.toggleParticipants());
        this.elements.helpToggle.addEventListener('click', () => this.toggleHelp());
        this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.elements.historyToggle.addEventListener('click', () => this.toggleHistory());
        this.elements.roomTitle.addEventListener('click', () => this.renameRoom());
        
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        this.elements.channelInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinChannel();
        });
        
        // Device-specific optimizations
        this.setupDeviceOptimizations();
    }
    
    setupDeviceOptimizations() {
        const isMobile = window.innerWidth <= 768;
        const isSmartwatch = window.innerWidth <= 300;
        const isDesktop = window.innerWidth >= 1024 && window.matchMedia('(pointer: fine)').matches;
        
        if (isSmartwatch) {
            // Minimal UI for smartwatch
            document.body.classList.add('smartwatch-mode');
            this.elements.helpSection?.remove();
            this.elements.settingsToggle?.remove();
        }
        
        if (isMobile && !isSmartwatch) {
            // Mobile optimizations
            this.elements.channelInput.addEventListener('focus', () => {
                setTimeout(() => this.elements.channelInput.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
            });
            
            // Prevent zoom on input focus
            this.elements.channelInput.addEventListener('touchstart', () => {
                this.elements.channelInput.style.fontSize = '16px';
            });
        }
        
        if (isDesktop) {
            // Desktop enhancements
            this.addKeyboardShortcuts();
            this.addHoverEffects();
        }
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
    }
    
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                try {
                    switch(e.key) {
                        case 'm':
                            e.preventDefault();
                            if (this.connectedPeers.size > 0) this.toggleMute();
                            break;
                        case 't':
                            e.preventDefault();
                            if (this.connectedPeers.size > 0) this.playTestTone();
                            break;
                        case 'h':
                            e.preventDefault();
                            if (this.connectedPeers.size > 0) this.hangUp();
                            break;
                    }
                } catch (error) {
                    console.error('Keyboard shortcut error:', error);
                }
            }
        });
    }
    
    addHoverEffects() {
        // Add visual feedback for desktop users
        const controls = document.querySelectorAll('.btn-control');
        controls.forEach(control => {
            control.addEventListener('mouseenter', () => {
                control.style.transform = 'translateY(-2px) scale(1.05)';
            });
            control.addEventListener('mouseleave', () => {
                control.style.transform = '';
            });
        });
    }
    
    handleOrientationChange() {
        // Adjust UI for orientation changes
        const isLandscape = window.innerHeight < window.innerWidth;
        const isSmallScreen = window.innerHeight < 500;
        
        if (isLandscape && isSmallScreen) {
            document.body.classList.add('landscape-compact');
        } else {
            document.body.classList.remove('landscape-compact');
        }
        
        // Scroll to top after orientation change
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
    }
    
    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });
        
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    async startCall() {
        if (this.isInCall) return;
        
        try {
            await this.getUserMedia();
            this.isInCall = true;
            this.elements.startCallBtn.textContent = 'In Call';
            this.elements.startCallBtn.classList.add('active');
            this.updateStatus('Voice call active');
            this.showNotification('Call started', 'success');
        } catch (error) {
            console.error('Failed to start call:', error);
            this.showNotification('Microphone access denied', 'error');
        }
    }
    
    endCall() {
        if (!this.isInCall) {
            this.leaveRoom();
            return;
        }
        
        // Stop audio streams
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.connectedPeers.clear();
        
        // Update UI
        this.isInCall = false;
        this.elements.startCallBtn.textContent = 'Start Call';
        this.elements.startCallBtn.classList.remove('active');
        this.elements.muteBtn.textContent = 'Mute';
        this.elements.muteBtn.classList.remove('active');
        this.updateStatus('Connected to room');
        this.showNotification('Call ended', 'info');
    }
    
    leaveRoom() {
        // End call if active
        if (this.isInCall) {
            this.endCall();
        }
        
        // Clean up room connection
        if (this.channel && database) {
            database.ref(`channels/${this.channel}`).off();
            this.removeParticipant(this.userName);
        }
        
        // Update history and reset
        if (this.channel) {
            this.updateRoomHistory();
        }
        
        this.showCallSetup();
        this.resetState();
    }
    
    updateStatus(status) {
        this.elements.callStatus.textContent = status;
    }
    
    updateRoomTitle() {
        const displayName = this.roomName || `Room ${this.channel}`;
        this.elements.roomTitle.textContent = displayName;
    }
    
    async requestRoomAccess(channelId, userName) {
        this.showNotification('Room is full. Requesting access...', 'info');
        
        const requestData = {
            requester: userName,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        // Send access request
        const requestRef = database.ref(`channels/${channelId}/accessRequests`).push();
        await requestRef.set(requestData);
        
        // Wait for approval/denial
        const waitForResponse = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                requestRef.remove();
                resolve('timeout');
            }, 30000); // 30 second timeout
            
            requestRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.status !== 'pending') {
                    clearTimeout(timeout);
                    requestRef.remove();
                    resolve(data.status);
                }
            });
        });
        
        const result = await waitForResponse;
        
        if (result === 'approved') {
            this.channel = channelId;
            this.userName = userName;
            this.isInCall = false;
            this.setupSignaling();
            this.showCallInterface();
            this.updateStatus('Connected to room');
            this.showNotification('Access granted!', 'success');
        } else if (result === 'denied') {
            this.showNotification('Access denied by room participants', 'error');
        } else {
            this.showNotification('Request timed out. Try again later.', 'error');
        }
    }
    
    setupAccessRequestListener() {
        if (!database || !this.channel) return;
        
        database.ref(`channels/${this.channel}/accessRequests`).on('child_added', (snapshot) => {
            const requestData = snapshot.val();
            if (requestData && requestData.status === 'pending') {
                this.showAccessRequest(snapshot.key, requestData);
            }
        });
    }
    
    showAccessRequest(requestId, requestData) {
        // Remove any existing access request dialogs
        const existing = document.querySelector('.access-request-dialog');
        if (existing) existing.remove();
        
        const dialog = document.createElement('div');
        dialog.className = 'access-request-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h4>Room Access Request</h4>
                <p><strong>${this.escapeHtml(requestData.requester)}</strong> wants to join this room.</p>
                <div class="dialog-buttons">
                    <button class="btn-secondary" onclick="phoneCall.handleAccessRequest('${requestId}', 'denied')">Deny</button>
                    <button class="btn-primary" onclick="phoneCall.handleAccessRequest('${requestId}', 'approved')">Allow</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Auto-deny after 20 seconds
        setTimeout(() => {
            if (document.contains(dialog)) {
                this.handleAccessRequest(requestId, 'denied');
            }
        }, 20000);
    }
    
    handleAccessRequest(requestId, decision) {
        // Update request status
        database.ref(`channels/${this.channel}/accessRequests/${requestId}`).update({
            status: decision,
            decidedBy: this.userName,
            decidedAt: Date.now()
        });
        
        // Remove dialog
        const dialog = document.querySelector('.access-request-dialog');
        if (dialog) dialog.remove();
        
        const action = decision === 'approved' ? 'allowed' : 'denied';
        this.showNotification(`Access request ${action}`, 'info');
    }

    createPeerConnection(peerId) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };
        
        const pc = new RTCPeerConnection(configuration);
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const candidate = event.candidate;
                if (candidate.sdpMid || candidate.sdpMLineIndex !== null) {
                    this.sendSignal('ice-candidate', { candidate, targetPeer: peerId });
                }
            }
        };
        
        pc.ontrack = (event) => {
            console.log('🎵 Received track from', encodeURIComponent(peerId));
            this.remoteStreams.set(peerId, event.streams[0]);
            this.setupRemoteAudio(peerId, event.streams[0]);
            this.connectedPeers.add(peerId);
            this.updateConnectionStatus();
        };
        
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                this.connectedPeers.add(peerId);
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.connectedPeers.delete(peerId);
                this.removeRemoteAudio(peerId);
            }
            this.updateConnectionStatus();
        };
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }
        
        return pc;
    }

    setupPageUnloadHandler() {
        // Clean up on page unload/refresh
        window.addEventListener('beforeunload', () => {
            if (this.channel && this.userName) {
                // Use sendBeacon for reliable cleanup on page unload
                const cleanupData = JSON.stringify({
                    channel: this.channel,
                    userName: this.userName
                });
                
                // Immediate cleanup
                this.removeParticipant(this.userName);
                
                // Store for potential reconnection
                sessionStorage.setItem('phoneCallSession', cleanupData);
            }
        });
        
        // Handle visibility change (tab switching, minimizing)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.channel && this.userName) {
                // Store session for potential reconnection (with fallback)
                try {
                    sessionStorage.setItem('phoneCallSession', JSON.stringify({
                        channel: this.channel,
                        userName: this.userName,
                        maxCallers: this.maxCallers
                    }));
                } catch (e) {
                    window.phoneCallSession = JSON.stringify({
                        channel: this.channel,
                        userName: this.userName,
                        maxCallers: this.maxCallers
                    });
                }
            }
        });
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const channel = urlParams.get('channel');
        const maxCallers = urlParams.get('max');
        
        // Check for previous session (with fallback)
        let savedSession = null;
        try {
            savedSession = sessionStorage.getItem('phoneCallSession');
        } catch (e) {
            // Handle private browsing or storage errors
            console.warn('SessionStorage unavailable:', e.message);
            savedSession = window.phoneCallSession;
        }
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                this.elements.channelInput.value = session.channel;
                this.elements.nameInput.value = session.userName || '';
                if (session.maxCallers) {
                    this.elements.maxCallers.value = session.maxCallers;
                }
                
                // Show reconnection option
                this.showReconnectionOption(session);
                sessionStorage.removeItem('phoneCallSession');
                return;
            } catch (e) {
                sessionStorage.removeItem('phoneCallSession');
            }
        }
        
        if (channel) {
            this.elements.channelInput.value = channel;
            if (maxCallers) {
                this.elements.maxCallers.value = maxCallers;
            }
        }
    }
    
    showReconnectionOption(session) {
        const reconnectDiv = document.createElement('div');
        reconnectDiv.className = 'reconnect-banner';
        reconnectDiv.innerHTML = `
            <p>🔄 Reconnect to Room ${this.escapeHtml(session.channel)}?</p>
            <div class="reconnect-buttons">
                <button id="reconnectBtn" class="btn primary">Reconnect</button>
                <button id="dismissBtn" class="btn secondary">Dismiss</button>
            </div>
        `;
        
        this.elements.callSetup.insertBefore(reconnectDiv, this.elements.callSetup.firstChild);
        
        document.getElementById('reconnectBtn').addEventListener('click', () => {
            this.userName = session.userName;
            this.joinChannel();
            reconnectDiv.remove();
        });
        
        document.getElementById('dismissBtn').addEventListener('click', () => {
            reconnectDiv.remove();
        });
    }

    async quickCall() {
        const randomChannel = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.elements.channelInput.value = randomChannel;
        await this.joinChannel();
    }
    
    toggleSettings() {
        const panel = this.elements.settingsPanel;
        const isHidden = panel.classList.contains('hidden');
        
        if (isHidden) {
            panel.classList.remove('hidden');
            panel.classList.add('slide-up');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('slide-up');
        }
    }
    
    toggleParticipants() {
        const list = this.elements.participantsList;
        const toggle = this.elements.participantsToggle;
        const isHidden = list.classList.contains('hidden');
        
        if (isHidden) {
            list.classList.remove('hidden');
            list.classList.add('slide-up');
            toggle.classList.add('expanded');
        } else {
            list.classList.add('hidden');
            list.classList.remove('slide-up');
            toggle.classList.remove('expanded');
        }
    }
    
    toggleHelp() {
        const content = this.elements.helpContent;
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            content.classList.remove('hidden');
            content.classList.add('slide-up');
        } else {
            content.classList.add('hidden');
            content.classList.remove('slide-up');
        }
    }
    
    toggleHistory() {
        const list = this.elements.historyList;
        const toggle = this.elements.historyToggle;
        const isHidden = list.classList.contains('hidden');
        
        if (isHidden) {
            this.loadChatHistory();
            list.classList.remove('hidden');
            list.classList.add('slide-up');
            toggle.classList.add('expanded');
        } else {
            list.classList.add('hidden');
            list.classList.remove('slide-up');
            toggle.classList.remove('expanded');
        }
    }
    

    sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || !this.channel) return;
        
        const messageData = {
            text: message,
            sender: this.userName,
            timestamp: Date.now(),
            id: Math.random().toString(36).substring(2, 15)
        };
        
        // Save to local storage immediately
        this.saveMessageToHistory(messageData);
        
        // Send message through Firebase
        database.ref(`channels/${this.channel}/messages`).push(messageData).then(() => {
            this.elements.messageInput.value = '';
        }).catch(error => {
            console.error('Failed to send message:', error);
            this.showNotification('Message failed to send', 'error');
        });
    }
    
    setupMessageListener() {
        if (!database || !this.channel) return;
        
        // Clear current messages for fresh start
        this.elements.messagesList.innerHTML = '';
        
        database.ref(`channels/${this.channel}/messages`).on('child_added', (snapshot) => {
            const messageData = snapshot.val();
            if (messageData) {
                this.displayMessage(messageData);
                
                // Auto-cleanup old messages (keep last 20)
                database.ref(`channels/${this.channel}/messages`).once('value', (messagesSnapshot) => {
                    const messages = messagesSnapshot.val();
                    if (messages && Object.keys(messages).length > 20) {
                        const oldestKey = Object.keys(messages)[0];
                        database.ref(`channels/${this.channel}/messages/${oldestKey}`).remove();
                    }
                });
            }
        });
    }
    
    displayMessage(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageData.sender === this.userName ? 'own' : 'other'}`;
        
        // Enhanced message with timestamp and status
        const time = new Date(messageData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            ${messageData.sender !== this.userName ? `<div class="message-sender">${this.escapeHtml(messageData.sender)}</div>` : ''}
            <div class="message-content">
                <div class="message-text">${this.processMessageText(messageData.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        // Animate message in
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
        this.elements.messagesList.appendChild(messageDiv);
        
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        // Smart scroll
        this.smartScroll();
        
        // Save to history
        this.saveMessageToHistory(messageData);
        
        // Sound notification for received messages
        if (messageData.sender !== this.userName) {
            this.playMessageSound();
        }
    }
    
    processMessageText(text) {
        // Enhanced text processing with emoji support and links
        let processed = this.escapeHtml(text);
        
        // Auto-link URLs
        processed = processed.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
        
        return processed;
    }
    
    smartScroll() {
        const messages = this.elements.messagesList;
        const isNearBottom = messages.scrollTop + messages.clientHeight >= messages.scrollHeight - 50;
        
        if (isNearBottom) {
            messages.scrollTo({
                top: messages.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
    
    playMessageSound() {
        if (!this.audioContext) return;
        
        try {
            // Create subtle notification sound
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.warn('Message sound failed:', e);
        }
    }

    generateShareUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?channel=${this.channel}&max=${this.maxCallers}`;
        this.elements.shareUrl.value = shareUrl;
        this.elements.shareSection.style.display = 'block';
    }

    async copyShareUrl() {
        const url = this.elements.shareUrl.value;
        
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            } else {
                // Fallback for older browsers
                this.elements.shareUrl.style.display = 'block';
                this.elements.shareUrl.select();
                document.execCommand('copy');
                this.elements.shareUrl.style.display = 'none';
            }
            
            const btn = this.elements.copyBtn;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="icon">✓</span><span class="text">Copied!</span>';
            btn.classList.add('copied');
            
            this.showNotification('Room link copied to clipboard!', 'success');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Clipboard operation failed:', err);
            if (err.name === 'NotAllowedError') {
                this.showNotification('Clipboard access denied', 'error');
            } else {
                this.showNotification('Failed to copy link', 'error');
            }
        }
    }

    async checkFirebaseConnection() {
        if (!database) {
            console.error('Database not initialized');
            return false;
        }
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('Firebase connection check timeout');
                resolve(false);
            }, 3000);
            
            database.ref('.info/connected').once('value', (snapshot) => {
                clearTimeout(timeout);
                const connected = snapshot.val() === true;
                console.log('Firebase connection status:', connected);
                resolve(connected);
            }).catch((error) => {
                console.error('Firebase connection check failed:', error.message || error);
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    generateDeviceHash() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    saveMessageToHistory(messageData) {
        try {
            const historyKey = `chatHistory_${this.channel}`;
            let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            
            history.push({
                text: messageData.text,
                sender: messageData.sender,
                timestamp: messageData.timestamp
            });
            
            // Keep only last 50 messages per room
            if (history.length > 50) {
                history = history.slice(-50);
            }
            
            localStorage.setItem(historyKey, JSON.stringify(history));
            
            // Update room list
            this.updateRoomHistory();
        } catch (e) {
            console.warn('Failed to save message to history:', e);
        }
    }
    
    updateRoomHistory() {
        try {
            let rooms = JSON.parse(localStorage.getItem('roomHistory') || '[]');
            
            const existingRoom = rooms.find(r => r.channel === this.channel);
            if (existingRoom) {
                existingRoom.lastActivity = Date.now();
                existingRoom.userName = this.userName;
                if (this.roomName) existingRoom.roomName = this.roomName;
            } else {
                rooms.push({
                    channel: this.channel,
                    userName: this.userName,
                    roomName: this.roomName || null,
                    lastActivity: Date.now()
                });
            }
            
            // Keep only last 10 rooms
            rooms.sort((a, b) => b.lastActivity - a.lastActivity);
            rooms = rooms.slice(0, 10);
            
            localStorage.setItem('roomHistory', JSON.stringify(rooms));
        } catch (e) {
            console.warn('Failed to update room history:', e);
        }
    }
    
    loadChatHistory() {
        try {
            const rooms = JSON.parse(localStorage.getItem('roomHistory') || '[]');
            this.elements.historyList.innerHTML = '';
            
            if (rooms.length === 0) {
                this.elements.historyList.innerHTML = '<div class="history-item">No previous rooms</div>';
                return;
            }
            
            rooms.forEach(room => {
                const item = document.createElement('div');
                item.className = 'history-item';
                
                const time = new Date(room.lastActivity).toLocaleDateString();
                const displayName = room.roomName || `Room ${room.channel}`;
                item.innerHTML = `
                    <div class="history-room">${this.escapeHtml(displayName)}</div>
                    <div class="history-time">${time} • ${room.userName}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.viewRoomHistory(room.channel, displayName);
                });
                
                this.elements.historyList.appendChild(item);
            });
        } catch (e) {
            console.warn('Failed to load chat history:', e);
            this.elements.historyList.innerHTML = '<div class="history-item">History unavailable</div>';
        }
    }
    
    viewRoomHistory(channel, displayName) {
        try {
            const historyKey = `chatHistory_${channel}`;
            const messages = JSON.parse(localStorage.getItem(historyKey) || '[]');
            
            if (messages.length === 0) {
                this.showNotification('No messages in this room', 'info');
                return;
            }
            
            const messageText = messages.slice(-5).map(m => 
                `${m.sender}: ${m.text}`
            ).join('\n');
            
            alert(`Last messages from ${displayName}:\n\n${messageText}`);
        } catch (e) {
            this.showNotification('Failed to load room history', 'error');
        }
    }
    
    renameRoom() {
        const currentName = this.roomName || `Room ${this.channel}`;
        const newName = prompt('Enter room name:', currentName);
        
        if (newName && newName.trim() && newName.trim() !== currentName) {
            this.roomName = newName.trim();
            this.updateRoomTitle();
            this.updateRoomHistory();
            this.showNotification('Room renamed!', 'success');
        }
    }
    
    updateRoomTitle() {
        const displayName = this.roomName || `Room ${this.channel}`;
        this.elements.roomTitle.innerHTML = `${this.escapeHtml(displayName)} <small>(${this.channel})</small>`;
    }

    generateUserIdentity() {
        const icons = ['🐱', '🐶', '🐻', '🐸', '🐧', '🐢', '🦊', '🐼', '🦁', '🐯'];
        const anonymousNames = [
            'Anonymous Cat', 'Anonymous Dog', 'Anonymous Bear', 'Anonymous Frog', 
            'Anonymous Penguin', 'Anonymous Turtle', 'Anonymous Fox', 'Anonymous Panda',
            'Anonymous Lion', 'Anonymous Tiger', 'Anonymous Koala', 'Anonymous Owl',
            'Anonymous Rabbit', 'Anonymous Elephant', 'Anonymous Dolphin'
        ];
        
        if (!this.elements.nameInput || !this.elements.nameInput.value.trim()) {
            this.userName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
        } else {
            this.userName = this.elements.nameInput.value.trim();
        }
        
        this.userIcon = icons[Math.floor(Math.random() * icons.length)];
    }

    async joinChannel() {
        let channelId = this.elements.channelInput.value.trim();
        const userName = this.elements.nameInput.value.trim();
        
        if (!userName) {
            this.showNotification('Please enter your name', 'error');
            this.elements.nameInput.focus();
            return;
        }
        
        // Generate room ID if empty
        if (!channelId) {
            channelId = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.elements.channelInput.value = channelId;
        }
        
        this.maxCallers = parseInt(this.elements.maxCallers.value);
        
        // Check Firebase connection
        const isConnected = await this.checkFirebaseConnection();
        if (!isConnected) {
            this.showNotification('Connection failed. Please try again.', 'error');
            return;
        }
        
        try {
            // Check room capacity
            if (this.maxCallers > 0) {
                const participantCount = await this.getParticipantCount(channelId);
                if (participantCount >= this.maxCallers) {
                    await this.requestRoomAccess(channelId, userName);
                    return;
                }
            }
            
            this.channel = channelId;
            this.userName = userName;
            this.isInCall = false;
            
            // Join room (messaging only initially)
            this.setupSignaling();
            this.setupAccessRequestListener();
            this.showCallInterface();
            this.updateStatus('Connected to room');
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.showNotification('Failed to join room', 'error');
        }
    }

    async getParticipantCount(channelId) {
        try {
            const snapshot = await database.ref(`channels/${channelId}/participants`).once('value');
            const participants = snapshot.val() || {};
            return Object.keys(participants).length;
        } catch (error) {
            console.error('Failed to get participant count:', error.message || error);
            return 0;
        }
    }

    async getUserMedia() {
        try {
            // Enhanced audio constraints for better quality
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1,
                    latency: 0.01,
                    volume: 1.0
                },
                video: false
            };
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Setup audio processing
            this.setupAudioProcessing();
            
            // Add tracks to existing connections
            this.peerConnections.forEach((pc) => {
                this.localStream.getTracks().forEach(track => {
                    pc.addTrack(track, this.localStream);
                });
            });
            
            console.log('🎤 Enhanced audio ready');
            
        } catch (error) {
            console.error('getUserMedia failed:', error);
            throw new Error('Microphone access denied: ' + error.message);
        }
    }
    
    setupAudioProcessing() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Create audio processing chain
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        const gainNode = this.audioContext.createGain();
        const compressor = this.audioContext.createDynamicsCompressor();
        
        // Configure compressor for voice
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        // Connect processing chain
        source.connect(compressor);
        compressor.connect(gainNode);
        
        this.audioGainNode = gainNode;
    }

    setupSignaling() {
        if (!database) {
            console.error('Database not available for signaling');
            return;
        }
        
        // Clean up old signals first
        this.cleanupOldSignals();
        
        // Listen for signaling messages in signals path only
        const signalsRef = database.ref(`channels/${this.channel}/signals`);
        signalsRef.on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (data && data.sender !== this.userName) {
                console.log('Received signal:', data.type, 'from', encodeURIComponent(data.sender));
                this.handleSignal(data);
                
                // Remove processed signal immediately
                snapshot.ref.remove().catch((error) => {
                    console.warn('Failed to remove signal:', error.message);
                });
            }
        });
        
        // Add user to participants
        this.addParticipant(this.userName);
        
        // Setup message listener
        this.setupMessageListener();
        
        // Listen for participants
        database.ref(`channels/${this.channel}/participants`).on('value', (snapshot) => {
            const participants = snapshot.val() || {};
            const participantCount = Object.keys(participants).length;
            console.log('Participants updated:', participantCount, 'total');
            
            this.updateParticipantsList(participants);
            
            if (this.localStream) {
                const currentParticipants = Object.keys(participants);
                const newParticipants = currentParticipants.filter(name => 
                    name !== this.userName && !this.peerConnections.has(name)
                );
                
                newParticipants.forEach(peerId => {
                    if (participants[peerId]?.deviceHash) {
                        this.connectToPeer(peerId, participants[peerId].deviceHash);
                    }
                });
                
                this.peerConnections.forEach((pc, peerId) => {
                    if (!currentParticipants.includes(peerId)) {
                        this.disconnectFromPeer(peerId);
                    }
                });
            }
        });
    }
    
    cleanupOldSignals() {
        if (!database) return;
        
        const signalsRef = database.ref(`channels/${this.channel}/signals`);
        const cutoffTime = Date.now() - 60000; // Remove signals older than 1 minute
        
        signalsRef.orderByChild('timestamp').endAt(cutoffTime).once('value', (snapshot) => {
            const updates = {};
            snapshot.forEach((child) => {
                updates[child.key] = null;
            });
            
            if (Object.keys(updates).length > 0) {
                signalsRef.update(updates).catch((error) => {
                    console.warn('Failed to cleanup old signals:', error.message);
                });
                console.log('Cleaned up', Object.keys(updates).length, 'old signals');
            }
        });
    }

    async connectToPeer(peerId, peerHash) {
        if (this.peerConnections.has(peerId)) return;
        
        const pc = this.createPeerConnection(peerId);
        this.peerConnections.set(peerId, pc);
        
        const shouldInitiate = this.deviceHash < peerHash;
        
        if (shouldInitiate) {
            try {
                const offer = await pc.createOffer({ offerToReceiveAudio: true });
                await pc.setLocalDescription(offer);
                this.sendSignal('offer', { offer, targetPeer: peerId });
                console.log('🚀 Sent offer to peer:', encodeURIComponent(peerId));
            } catch (error) {
                console.error('Error creating offer for peer:', encodeURIComponent(peerId), error.message || error);
            }
        }
    }
    
    disconnectFromPeer(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(peerId);
        }
        this.remoteStreams.delete(peerId);
        this.connectedPeers.delete(peerId);
        this.removeRemoteAudio(peerId);
    }

    async handleSignal(data) {
        try {
            const { type, payload, sender } = data;
            
            switch (type) {
                case 'offer':
                    if (!this.localStream) return;
                    
                    let pc = this.peerConnections.get(sender);
                    if (!pc) {
                        pc = this.createPeerConnection(sender);
                        this.peerConnections.set(sender, pc);
                    }
                    
                    if (pc.signalingState !== 'stable') return;
                    
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer({ offerToReceiveAudio: true });
                    await pc.setLocalDescription(answer);
                    this.sendSignal('answer', { answer, targetPeer: sender });
                    console.log('📞 Answered call from peer:', encodeURIComponent(sender));
                    break;
                    
                case 'answer':
                    const answerPc = this.peerConnections.get(sender);
                    if (answerPc && answerPc.signalingState === 'have-local-offer') {
                        await answerPc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        console.log('✅ Call established with peer:', encodeURIComponent(sender));
                    }
                    break;
                    
                case 'ice-candidate':
                    const candidatePc = this.peerConnections.get(sender);
                    if (candidatePc && payload.candidate) {
                        const candidate = payload.candidate;
                        if (candidate.sdpMid || candidate.sdpMLineIndex !== null) {
                            if (candidatePc.remoteDescription) {
                                await candidatePc.addIceCandidate(new RTCIceCandidate(candidate));
                            }
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }

    sendSignal(type, payload) {
        if (!database) {
            console.error('Cannot send signal: database not available');
            return;
        }
        
        const signalData = {
            type: type,
            payload: payload,
            sender: this.userName,
            timestamp: Date.now()
        };
        
        console.log('Sending signal:', type, 'to channel:', encodeURIComponent(this.channel));
        
        const signalRef = database.ref(`channels/${this.channel}/signals`).push();
        signalRef.set(signalData).catch(error => {
            console.error('Failed to send signal:', error);
        });
        
        // Auto-cleanup old signals after 30 seconds
        setTimeout(() => {
            signalRef.remove().catch((error) => {
                console.warn('Failed to cleanup signal:', error.message);
            });
        }, 30000);
    }

    addParticipant(name) {
        if (!database) {
            console.error('Cannot add participant: database not available');
            return;
        }
        
        console.log('Adding participant:', encodeURIComponent(name), 'to channel:', encodeURIComponent(this.channel));
        
        // Set participant with minimal data including device hash
        const participantRef = database.ref(`channels/${this.channel}/participants/${name}`);
        participantRef.set({
            icon: this.userIcon || '👤',
            joined: Date.now(),
            deviceHash: this.deviceHash
        }).catch(error => {
            console.error('Failed to add participant:', error.message || error);
            this.showNotification('Failed to join room', 'error');
        });
        
        // Set up automatic cleanup on disconnect
        participantRef.onDisconnect().remove();
    }

    removeParticipant(name) {
        if (!database) {
            console.error('Cannot remove participant: database not available');
            return;
        }
        
        console.log('Removing participant:', encodeURIComponent(name), 'from channel:', encodeURIComponent(this.channel));
        
        database.ref(`channels/${this.channel}/participants/${name}`).remove().catch(error => {
            console.error('Failed to remove participant:', error.message || error);
        });
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    updateParticipantsList(participantsData) {
        const participants = Object.entries(participantsData);
        this.currentCallers = participants.length;
        this.elements.callerCount.textContent = this.currentCallers;
        this.elements.maxCallerCount.textContent = this.maxCallers === 0 ? '∞' : this.maxCallers;
        this.elements.participantCountMini.textContent = this.currentCallers;
        
        this.elements.participantsList.innerHTML = '';
        participants.forEach(([name, data], index) => {
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.style.animationDelay = `${index * 0.1}s`;
            
            li.innerHTML = `
                <span class="participant-icon">${data.icon || '👤'}</span>
                <span class="participant-name">${this.escapeHtml(name)}</span>
                <div class="volume-bar"></div>
            `;
            
            this.elements.participantsList.appendChild(li);
        });
        
        // Update status based on participant count
        if (this.currentCallers > 1) {
            this.updateStatus('Connected - Voice & Messages');
            this.elements.statusDot.classList.add('connected');
        }
        
        // Show warning if approaching limit (only if limit is set)
        if (this.maxCallers > 0 && this.currentCallers >= this.maxCallers - 1) {
            this.showCallerLimitWarning();
        }
    }

    showCallerLimitWarning() {
        const existing = document.querySelector('.caller-limit-warning');
        if (existing) return;
        
        const warning = document.createElement('div');
        warning.className = 'caller-limit-warning';
        warning.textContent = `Channel approaching limit (${this.currentCallers}/${this.maxCallers})`;
        this.elements.callInterface.insertBefore(warning, this.elements.callInterface.firstChild);
    }

    async playTestTone() {
        if (!this.localStream || this.connectedPeers.size === 0) {
            this.showNotification('Not connected to call', 'error');
            return;
        }
        
        try {
            // Reuse AudioContext for better performance
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            const audioContext = this.audioContext;
            const response = await fetch('assets/improvisation.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            const analyser = audioContext.createAnalyser();
            const destination = audioContext.createMediaStreamDestination();
            
            // Setup voice activity detection
            const micSource = audioContext.createMediaStreamSource(this.localStream);
            const micAnalyser = audioContext.createAnalyser();
            micAnalyser.fftSize = 256;
            micSource.connect(micAnalyser);
            
            source.buffer = audioBuffer;
            source.connect(gainNode);
            gainNode.connect(destination);
            
            const originalTrack = this.localStream.getAudioTracks()[0];
            const testTrack = destination.stream.getAudioTracks()[0];
            
            if (originalTrack) {
                const replacePromises = Array.from(this.peerConnections.values()).map(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    return sender ? sender.replaceTrack(testTrack) : Promise.resolve();
                });
                
                Promise.all(replacePromises).then(() => {
                    console.log('🎵 Playing test audio');
                    this.showNotification('🎵 Test audio playing', 'info');
                    
                    source.start();
                    
                    // Voice activity detection
                    const checkVoiceActivity = () => {
                        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
                        micAnalyser.getByteFrequencyData(dataArray);
                        
                        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                        
                        if (average > 30) { // Voice detected
                            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                            console.log('🎤 Voice detected, ducking audio');
                        } else {
                            gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
                        }
                    };
                    
                    const voiceDetectionInterval = setInterval(checkVoiceActivity, 100);
                    
                    source.onended = () => {
                        clearInterval(voiceDetectionInterval);
                        this.peerConnections.forEach(pc => {
                            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                            if (sender) sender.replaceTrack(originalTrack).catch(() => {});
                        });
                        // Don't close reusable AudioContext
                        console.log('🎵 Test audio ended');
                    };
                    
                }).catch((error) => {
                    console.error('Test audio track replacement failed:', error);
                    this.showNotification('Test audio failed', 'error');
                });
            } else {
                this.showNotification('Audio not ready', 'error');
            }
        } catch (e) {
            console.error('Test audio error:', e.message || e);
            this.showNotification('Test audio failed', 'error');
        }
    }
    
    setupRemoteAudio(peerId, stream) {
        const audioId = `remoteAudio_${peerId}`;
        const existing = document.getElementById(audioId);
        if (existing) existing.remove();
        
        const audio = document.createElement('audio');
        audio.id = audioId;
        audio.autoplay = true;
        audio.playsInline = true;
        audio.volume = 1.0;
        audio.srcObject = stream;
        
        // Enhanced audio settings
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        
        document.body.appendChild(audio);
        
        // Setup spatial audio if supported
        this.setupSpatialAudio(audio, peerId);
        
        // Smart audio activation
        this.activateAudio(audio, peerId);
    }
    
    setupSpatialAudio(audio, peerId) {
        if (!this.audioContext) return;
        
        try {
            const source = this.audioContext.createMediaElementSource(audio);
            const panner = this.audioContext.createPanner();
            
            // Configure 3D audio
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10;
            panner.rolloffFactor = 1;
            
            // Position based on peer index
            const peerIndex = Array.from(this.connectedPeers).indexOf(peerId);
            const angle = (peerIndex * 60) * (Math.PI / 180); // 60 degrees apart
            panner.positionX.value = Math.sin(angle) * 2;
            panner.positionZ.value = Math.cos(angle) * 2;
            
            source.connect(panner);
            panner.connect(this.audioContext.destination);
            
        } catch (e) {
            console.warn('Spatial audio not supported:', e);
        }
    }
    
    async activateAudio(audio, peerId) {
        try {
            await audio.play();
            console.log('🔊 Audio activated for:', peerId);
        } catch (e) {
            // Require user interaction
            const activateOnInteraction = async () => {
                try {
                    await audio.play();
                    this.showNotification('Audio activated', 'success');
                    document.removeEventListener('click', activateOnInteraction);
                    document.removeEventListener('touchstart', activateOnInteraction);
                } catch (err) {
                    console.error('Audio activation failed:', err);
                }
            };
            
            this.showNotification('Tap to enable audio', 'info');
            document.addEventListener('click', activateOnInteraction, { once: true });
            document.addEventListener('touchstart', activateOnInteraction, { once: true });
        }
    }
    
    removeRemoteAudio(peerId) {
        const audio = document.getElementById(`remoteAudio_${peerId}`);
        if (audio) audio.remove();
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                
                const btn = this.elements.muteBtn;
                if (this.isMuted) {
                    btn.innerHTML = '<span class="icon">🔇</span><span class="text">Unmute</span>';
                    btn.classList.add('muted');
                    this.showNotification('Microphone muted', 'info');
                } else {
                    btn.innerHTML = '<span class="icon">🎤</span><span class="text">Mute</span>';
                    btn.classList.remove('muted');
                    this.showNotification('Microphone unmuted', 'info');
                }
            }
        }
    }

    toggleMute() {
        if (!this.isInCall || !this.localStream) {
            this.showNotification('No active call', 'error');
            return;
        }
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.isMuted = !audioTrack.enabled;
            
            if (this.isMuted) {
                this.elements.muteBtn.textContent = 'Unmute';
                this.elements.muteBtn.classList.add('active');
            } else {
                this.elements.muteBtn.textContent = 'Mute';
                this.elements.muteBtn.classList.remove('active');
            }
        }
    }
    
    cleanupEmptyChannel() {
        if (!database || !this.channel) return;
        
        // Check if channel is empty after a delay
        setTimeout(() => {
            database.ref(`channels/${this.channel}/participants`).once('value', (snapshot) => {
                const participants = snapshot.val();
                if (!participants || Object.keys(participants).length === 0) {
                    // Remove entire channel if empty
                    database.ref(`channels/${this.channel}`).remove().catch((error) => {
                        console.warn('Failed to cleanup empty channel:', error.message);
                    });
                    console.log('Cleaned up empty channel:', encodeURIComponent(this.channel));
                }
            });
        }, 5000);
    }

    updateConnectionStatus() {
        const connectedCount = this.connectedPeers.size;
        let status = 'Waiting for others...';
        
        if (connectedCount > 0) {
            status = 'Connected - Voice & Messages';
            this.elements.statusDot.classList.add('connected');
        } else {
            this.elements.statusDot.classList.remove('connected');
        }
        
        this.updateStatus(status);
    }

    updateStatus(status) {
        this.elements.callStatus.textContent = status;
    }

    showCallInterface() {
        this.elements.callSetup.classList.add('hidden');
        this.elements.callInterface.classList.remove('hidden');
        this.elements.callInterface.classList.add('fade-in');
        this.updateRoomTitle();
        this.elements.maxCallerCount.textContent = this.maxCallers === 0 ? '∞' : this.maxCallers;
        
        // Hide share section initially
        this.elements.shareSection.style.display = 'none';
        
        // Device-specific interface adjustments
        if (window.innerWidth <= 300) {
            // Smartwatch: hide non-essential elements
            this.elements.participantsToggle?.classList.add('hidden');
            this.elements.shareSection?.classList.add('hidden');
        }
        
        // Scroll to top on mobile
        if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Keep screen awake during call (if supported)
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(() => {});
        }
    }

    showCallSetup() {
        this.elements.callInterface.classList.add('hidden');
        this.elements.callSetup.classList.remove('hidden');
        this.elements.callSetup.classList.add('fade-in');
        
        // Clear any notifications
        this.clearNotifications();
    }

    resetState() {
        // Clean up Firebase listeners first
        if (this.channel && database) {
            database.ref(`channels/${this.channel}`).off();
        }
        
        this.localStream = null;
        this.peerConnections = new Map();
        this.remoteStreams = new Map();
        this.channel = null;
        this.userName = null;
        this.roomName = null;
        this.isInCall = false;
        this.deviceHash = this.generateDeviceHash();
        this.isMuted = false;
        this.connectedPeers = new Set();
        this.maxCallers = 0;
        this.currentCallers = 0;
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Reset UI elements
        this.elements.muteBtn.innerHTML = '<span class="icon">🎤</span><span class="text">Mute</span>';
        this.elements.muteBtn.classList.remove('muted');
        this.elements.statusDot.classList.remove('connected');
        
        // Reset collapsible sections
        this.elements.settingsPanel.classList.add('hidden');
        this.elements.participantsList.classList.add('hidden');
        this.elements.participantsToggle.classList.remove('expanded');
        this.elements.helpContent.classList.add('hidden');
        
        // Remove any warnings and reconnect banners
        const warning = document.querySelector('.caller-limit-warning');
        if (warning) warning.remove();
        const reconnect = document.querySelector('.reconnect-banner');
        if (reconnect) reconnect.remove();
        
        // WebRTC connections created on demand
    }
    
    showNotification(message, type = 'info') {
        // Remove existing notifications
        this.clearNotifications();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Performance optimizations
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Final system validation
    validateSystem() {
        const issues = [];
        
        if (!this.peerConnections) issues.push('Peer connections not initialized');
        if (!this.deviceHash) issues.push('Device hash missing');
        if (!database) issues.push('Firebase not connected');
        
        if (issues.length > 0) {
            console.error('🚨 System validation failed:', issues);
            this.showNotification('System check failed', 'error');
            return false;
        }
        
        console.log('✅ System validation passed');
        return true;
    }
}

// Theme management
class ThemeManager {
    constructor() {
        this.initTheme();
    }

    initTheme() {
        // Check for saved theme preference (with fallback)
        let savedTheme = null;
        try {
            savedTheme = localStorage.getItem('theme');
        } catch (e) {
            savedTheme = window.savedTheme;
        }
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            this.setAutoTheme();
        }
    }

    setAutoTheme() {
        // Check device preference first
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.setTheme('dark');
            return;
        }

        // Check time-based theme (6 PM to 6 AM = dark)
        const hour = new Date().getHours();
        const isDarkTime = hour >= 18 || hour < 6;
        
        this.setTheme(isDarkTime ? 'dark' : 'light');
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            window.savedTheme = theme;
        }
        
        // Update meta theme-color for mobile browsers
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = theme === 'dark' ? '#1a1a1a' : '#fefefe';
        }
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
    }
}

// Initialize theme and phone call system when page loads
let phoneCall;
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    phoneCall = new PhoneCall();
    
    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                new ThemeManager().setAutoTheme();
            }
        });
    }
    
    // Performance optimization for low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        document.body.classList.add('low-performance');
    }
    
    // Validate system after initialization
    setTimeout(() => phoneCall.validateSystem(), 1000);
    
    // Make phoneCall globally accessible for dialog buttons
    window.phoneCall = phoneCall;
    
    // Add device info to console for debugging
    console.log('📱 Device Info:', {
        width: window.innerWidth,
        height: window.innerHeight,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        cores: navigator.hardwareConcurrency || 'unknown',
        connection: navigator.connection?.effectiveType || 'unknown'
    });
});

// Add global error handler for better debugging
window.addEventListener('error', (e) => {
    console.error('🚨 Global error:', e.error?.message || e.message);
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Unhandled promise rejection:', e.reason);
});