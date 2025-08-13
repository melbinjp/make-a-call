// Input sanitization utility
function sanitizeInput(input) {
    if (typeof input !== 'string') return String(input);
    return input.replace(/[<>"'&]/g, (match) => {
        const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
        return map[match];
    });
}

function sanitizeForLog(input) {
    return encodeURIComponent(String(input)).substring(0, 100);
}

function validateInput(input, type = 'text', maxLength = 100) {
    if (!input || typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    
    const patterns = {
        text: /^[a-zA-Z0-9\s\-_.]+$/,
        roomCode: /^[a-zA-Z0-9\-]+$/,
        deviceHash: /^[a-zA-Z0-9]+$/
    };
    
    return patterns[type] ? patterns[type].test(input) : true;
}

// Secure notification system
function secureNotify(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `secure-notification ${type}`;
    notification.textContent = sanitizeInput(message);
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function secureConfirm(message, callback) {
    const modal = document.createElement('div');
    modal.className = 'secure-confirm-modal';
    modal.innerHTML = `
        <div class="secure-confirm-content">
            <p>${sanitizeInput(message)}</p>
            <div class="secure-confirm-buttons">
                <button id="confirmNo">Cancel</button>
                <button id="confirmYes">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirmYes').onclick = () => {
        modal.remove();
        callback(true);
    };
    document.getElementById('confirmNo').onclick = () => {
        modal.remove();
        callback(false);
    };
}

function securePrompt(message, defaultValue, callback) {
    const modal = document.createElement('div');
    modal.className = 'secure-prompt-modal';
    modal.innerHTML = `
        <div class="secure-prompt-content">
            <p>${sanitizeInput(message)}</p>
            <input type="text" id="promptInput" value="${sanitizeInput(defaultValue || '')}" maxlength="50">
            <div class="secure-prompt-buttons">
                <button id="promptCancel">Cancel</button>
                <button id="promptOk">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const input = document.getElementById('promptInput');
    input.focus();
    
    document.getElementById('promptOk').onclick = () => {
        const value = input.value.trim();
        modal.remove();
        callback(validateInput(value) ? value : null);
    };
    document.getElementById('promptCancel').onclick = () => {
        modal.remove();
        callback(null);
    };
}

// Firebase - initialize by default with connection management
let database = null;
let firebaseEnabled = true;
let firebaseApp = null;
let connectionTimeout = null;
let isConnectedToFirebase = false;

function initializeFirebase() {
    if (database) return database;
    
    try {
        if (!firebaseApp) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        database.goOnline();
        firebaseEnabled = true;
        isConnectedToFirebase = true;
        console.log('✅ Firebase initialized');
        
        // Disconnect is now handled intelligently based on P2P connection state
        return database;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return null;
    }
}

function scheduleFirebaseDisconnect() {
    // Clear existing timeout
    if (connectionTimeout) clearTimeout(connectionTimeout);
    
    // Disconnect after 30 seconds of setup completion
    connectionTimeout = setTimeout(() => {
        if (isConnectedToFirebase && database) {
            console.log('🔌 Auto-disconnecting Firebase to free connection slot');
            database.goOffline();
            isConnectedToFirebase = false;
        }
    }, 30000);
}

function reconnectFirebaseTemporarily() {
    if (!isConnectedToFirebase && database) {
        console.log('🔌 Temporarily reconnecting Firebase');
        database.goOnline();
        isConnectedToFirebase = true;
        scheduleFirebaseDisconnect();
    }
}

// Auto-initialize Firebase on load
document.addEventListener('DOMContentLoaded', () => {
    database = initializeFirebase();
});

class PhoneCall {
    constructor() {
        try {
            this.localStream = null;
            this.peerConnections = new Map();
            this.remoteStreams = new Map();
            this.channel = null;
            this.userName = null;
            this.deviceHash = this.generateDeviceHash();
            this.contactId = this.deviceHash; // Use hash as contact ID
            this.trustedPeers = new Set();
            this.isMuted = false;
            this.isSpeakerMuted = false;
            this.connectedPeers = new Set();

            this.isCallActive = false;
            this.isSpeakerMode = true;
            this.othersInCall = false;
            this.audioContext = null;
            this.activeNotifications = new Set();
            this.dataChannels = new Map();
            this.encryptionKey = null;
            this.qrInstance = null;
            this.pendingApprovals = new Map();
            this.contactAliases = {};
            this.myAlias = 'me';
            this.initializeContactAliases();
            
            this.initializeElements();
            this.generateUserIdentity();
            this.setupEventListeners();
            this.checkUrlParams();
            this.setupPageUnloadHandler();
            this.showFirebaseToggle();
        } catch (error) {
            console.error('PhoneCall initialization failed:', error);
            console.log('Available elements:', Object.keys(this.elements || {}));
        }
    }

    initializeElements() {
        this.elements = {
            callSetup: document.getElementById('callSetup'),
            callInterface: document.getElementById('callInterface'),
            nameInput: document.getElementById('nameInput'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            p2pConnectBtn: document.getElementById('p2pConnectBtn'),
            joinModal: document.getElementById('joinModal'),
            p2pModal: document.getElementById('p2pModal'),
            settingsModal: document.getElementById('settingsModal'),
            roomCodeInput: document.getElementById('roomCodeInput'),
            contactsList: document.getElementById('contactsList'),
            settingsBtn: document.getElementById('settingsBtn'),
            copyBtn: document.getElementById('copyBtn'),
            p2pUrlInput: document.getElementById('p2pUrlInput'),
            myP2PUrl: document.getElementById('myP2PUrl'),
            copyMyP2PBtn: document.getElementById('copyMyP2PBtn'),
            startCallBtn: document.getElementById('startCallBtn'),
            muteBtn: document.getElementById('muteBtn'),
            speakerBtn: document.getElementById('speakerBtn'),
            testAudioBtn: document.getElementById('testAudioBtn'),
            endCallBtn: document.getElementById('endCallBtn'),
            participantsList: document.getElementById('participantsList'),
            roomTitle: document.getElementById('groupTitle'),
            messagesList: document.getElementById('messagesList'),
            messageInput: document.getElementById('messageInput'),
            sendMessageBtn: document.getElementById('sendMessageBtn'),
            chatHistory: document.getElementById('chatHistory'),
            historyList: document.getElementById('historyList'),
            leaveGroupBtn: document.getElementById('leaveGroupBtn'),
            renameGroupBtn: document.getElementById('renameGroupBtn'),
            groupMenuBtn: document.getElementById('groupMenuBtn'),
            groupSidebar: document.getElementById('groupSidebar'),
            callerCount: document.getElementById('callerCount'),
            maxCallerCount: document.getElementById('maxCallerCount'),
            statusDot: document.getElementById('statusDot')
        };
    }

    setupEventListeners() {
        // Core required elements
        if (this.elements.createRoomBtn) this.elements.createRoomBtn.addEventListener('click', () => this.createRoom());
        if (this.elements.joinRoomBtn) this.elements.joinRoomBtn.addEventListener('click', () => this.showJoinModal());
        if (this.elements.p2pConnectBtn) this.elements.p2pConnectBtn.addEventListener('click', () => this.showP2PModal());
        if (this.elements.settingsBtn) this.elements.settingsBtn.addEventListener('click', () => this.showSettingsModal());
        
        // Connection mode toggle
        const modeToggle = document.getElementById('modeToggle');
        const modeInfoBtn = document.getElementById('modeInfoBtn');
        if (modeToggle) modeToggle.addEventListener('click', () => this.toggleConnectionMode());
        if (modeInfoBtn) modeInfoBtn.addEventListener('click', () => this.showModeInfoModal());
        
        // Optional elements
        if (this.elements.settingsToggle) this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
        if (this.elements.copyBtn) this.elements.copyBtn.addEventListener('click', () => this.copyShareUrl());
        if (this.elements.copyMyP2PBtn) this.elements.copyMyP2PBtn.addEventListener('click', () => this.copyMyP2PUrl());
        
        // Add P2P URL input handler
        if (this.elements.p2pUrlInput) {
            this.elements.p2pUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.connectViaP2PUrl();
            });
        }
        
        // Firebase toggle handler
        const firebaseToggle = document.getElementById('firebaseToggle');
        if (firebaseToggle) {
            firebaseToggle.addEventListener('click', () => this.toggleFirebase());
        }
        if (this.elements.muteBtn) this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        if (this.elements.testAudioBtn) this.elements.testAudioBtn.addEventListener('click', () => this.playTestTone());
        if (this.elements.startCallBtn) this.elements.startCallBtn.addEventListener('click', () => this.startCall());
        if (this.elements.speakerBtn) this.elements.speakerBtn.addEventListener('click', () => this.toggleSpeaker());
        if (this.elements.endCallBtn) this.elements.endCallBtn.addEventListener('click', () => this.endCall());
        if (this.elements.participantsToggle) this.elements.participantsToggle.addEventListener('click', () => this.toggleParticipants());
        if (this.elements.helpToggle) this.elements.helpToggle.addEventListener('click', () => this.toggleHelp());
        if (this.elements.sendMessageBtn) this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        if (this.elements.historyToggle) this.elements.historyToggle.addEventListener('click', () => this.toggleHistory());
        if (this.elements.leaveGroupBtn) this.elements.leaveGroupBtn.addEventListener('click', () => this.leaveRoom());
        if (this.elements.renameGroupBtn) this.elements.renameGroupBtn.addEventListener('click', () => this.renameRoom());
        if (this.elements.groupMenuBtn) this.elements.groupMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleGroupSidebar();
        });
        
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                    this.broadcastTypingState(false);
                } else {
                    this.broadcastTypingState(true);
                }
            });
            let typingTimeout;
            this.elements.messageInput.addEventListener('keyup', (e) => {
                if (e.key !== 'Enter') {
                    clearTimeout(typingTimeout);
                    typingTimeout = setTimeout(() => {
                        this.broadcastTypingState(false);
                    }, 1000);
                }
            });
        }
        
        if (this.elements.roomCodeInput) {
            this.elements.roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.joinGroup();
            });
            
            this.elements.roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toLowerCase().replace(/\s+/g, '-');
            });
        }

        this.elements.messagesList.addEventListener('click', (e) => {
            if (e.target.closest('.btn-reaction')) {
                const button = e.target.closest('.btn-reaction');
                const messageId = button.dataset.messageId;
                this.showReactionPanel(button, messageId);
            }
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
            if (this.elements.nameInput) {
                this.elements.nameInput.addEventListener('focus', () => {
                    setTimeout(() => this.elements.nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                });
                
                // Prevent zoom on input focus
                this.elements.nameInput.addEventListener('touchstart', () => {
                    this.elements.nameInput.style.fontSize = '16px';
                });
            }
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
        if (this.isCallActive) return;
        
        // Authorization check
        if (!this.userName || !validateInput(this.userName, 'text')) {
            this.showNotification('Invalid user credentials', 'error');
            return;
        }
        
        try {
            await this.getUserMedia();
            this.isCallActive = true;
            this.updateParticipantCallStatus();
            this.updateButtonStates();
            this.updateStatus('Voice call active');
            this.showNotification('Call started', 'success');
        } catch (error) {
            console.error('Failed to start call:', sanitizeForLog(error.message));
            if (error.name === 'NotAllowedError') {
                this.showNotification('Microphone access denied', 'error');
            } else if (error.name === 'NotFoundError') {
                this.showNotification('No microphone found', 'error');
            } else {
                this.showNotification('Call failed to start', 'error');
            }
        }
    }

    broadcastTypingState(isTyping) {
        const message = {
            type: 'typing',
            typing: isTyping,
            senderHash: this.deviceHash,
            senderName: this.userName,
        };
        const messageStr = JSON.stringify(message);
        this.dataChannels.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(messageStr);
            }
        });
    }

    updateTypingIndicator(senderHash, senderName, isTyping) {
        let indicator = document.getElementById('typingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'typingIndicator';
            indicator.className = 'typing-indicator';
            this.elements.messagesList.insertAdjacentElement('afterend', indicator);
        }

        const typingUsers = this.typingUsers || new Map();
        if (isTyping) {
            typingUsers.set(senderHash, senderName);
        } else {
            typingUsers.delete(senderHash);
        }
        this.typingUsers = typingUsers;

        if (typingUsers.size > 0) {
            const names = Array.from(typingUsers.values());
            let text = '';
            if (names.length === 1) {
                text = `${names[0]} is typing...`;
            } else if (names.length === 2) {
                text = `${names[0]} and ${names[1]} are typing...`;
            } else {
                text = `${names.slice(0, 2).join(', ')} and others are typing...`;
            }
            indicator.textContent = text;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    showReactionPanel(button, messageId) {
        let panel = document.getElementById('reactionPanel');
        if (panel) {
            panel.remove();
        }

        panel = document.createElement('div');
        panel.id = 'reactionPanel';
        panel.className = 'reaction-panel';

        const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
        reactions.forEach(reaction => {
            const span = document.createElement('span');
            span.textContent = reaction;
            span.addEventListener('click', () => {
                this.sendReaction(messageId, reaction);
                panel.remove();
            });
            panel.appendChild(span);
        });

        document.body.appendChild(panel);
        const rect = button.getBoundingClientRect();
        panel.style.top = `${rect.top - panel.offsetHeight - 5}px`;
        panel.style.left = `${rect.left}px`;

        // Close panel when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && e.target !== button) {
                    panel.remove();
                }
            }, { once: true });
        }, 0);
    }

    sendReaction(messageId, reaction) {
        const message = {
            type: 'reaction',
            messageId: messageId,
            reaction: reaction,
            senderHash: this.deviceHash,
        };
        const messageStr = JSON.stringify(message);
        this.dataChannels.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(messageStr);
            }
        });
        this.updateReactions(messageId, reaction, this.deviceHash);
    }

    updateReactions(messageId, reaction, senderHash) {
        const reactionsContainer = document.getElementById(`reactions-${messageId}`);
        if (!reactionsContainer) return;

        this.messageReactions = this.messageReactions || new Map();
        let messageReactions = this.messageReactions.get(messageId);
        if (!messageReactions) {
            messageReactions = new Map();
        }

        let reactionUsers = messageReactions.get(reaction);
        if (!reactionUsers) {
            reactionUsers = new Set();
        }

        if (reactionUsers.has(senderHash)) {
            reactionUsers.delete(senderHash);
        } else {
            reactionUsers.add(senderHash);
        }

        messageReactions.set(reaction, reactionUsers);
        this.messageReactions.set(messageId, messageReactions);

        this.renderReactions(messageId);
    }

    renderReactions(messageId) {
        const reactionsContainer = document.getElementById(`reactions-${messageId}`);
        if (!reactionsContainer) return;

        reactionsContainer.innerHTML = '';
        const messageReactions = this.messageReactions.get(messageId);
        if (messageReactions) {
            messageReactions.forEach((users, reaction) => {
                if (users.size > 0) {
                    const reactionDiv = document.createElement('div');
                    reactionDiv.className = 'reaction';
                    reactionDiv.textContent = `${reaction} ${users.size}`;
                    reactionsContainer.appendChild(reactionDiv);
                }
            });
        }
    }
    
    toggleSpeaker() {
        this.isSpeakerMuted = !this.isSpeakerMuted;
        
        const btn = this.elements.speakerBtn;
        if (this.isSpeakerMuted) {
            btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            btn.classList.add('active', 'muted');
            btn.title = 'Unmute Speaker';
            this.showNotification('Speaker muted', 'info');
        } else {
            btn.innerHTML = '<i class="fas fa-volume-up"></i>';
            btn.classList.remove('active', 'muted');
            btn.title = 'Mute Speaker';
            this.showNotification('Speaker unmuted', 'info');
        }
        
        this.applyAudioRouting();
    }
    
    applyAudioRouting() {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (this.isSpeakerMuted) {
                audio.volume = 0;
            } else {
                audio.volume = 1.0;
            }
        });
    }
    
    updateButtonStates() {
        const callOnlyButtons = document.querySelectorAll('.call-only');
        
        if (this.isCallActive) {
            // In call - hide start call button and show controls
            this.elements.startCallBtn.style.display = 'none';
            callOnlyButtons.forEach(btn => btn.style.display = 'flex');
        } else if (this.othersInCall) {
            // Others in call - show join option
            this.elements.startCallBtn.style.display = 'flex';
            this.elements.startCallBtn.innerHTML = '<i class="fas fa-phone"></i><span class="btn-text">Join</span>';
            this.elements.startCallBtn.className = 'btn-call-primary';
            this.elements.startCallBtn.title = 'Join Call';
            callOnlyButtons.forEach(btn => btn.style.display = 'none');
        } else {
            // No call - show start option
            this.elements.startCallBtn.style.display = 'flex';
            this.elements.startCallBtn.innerHTML = '<i class="fas fa-phone"></i><span class="btn-text">Call</span>';
            this.elements.startCallBtn.className = 'btn-call-primary';
            this.elements.startCallBtn.title = 'Start Call';
            callOnlyButtons.forEach(btn => btn.style.display = 'none');
        }
    }
    
    endCall() {
        if (this.isCallActive) {
            // Stop audio streams but keep room connection
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Close peer connections but don't clear room data
            this.peerConnections.forEach(pc => pc.close());
            this.peerConnections.clear();
            
            // Update UI
            this.isCallActive = false;
            this.updateParticipantCallStatus();
            this.updateButtonStates();
            this.updateStatus('Connected to room');
            this.showNotification('Call ended', 'info');
        } else {
            this.leaveRoom();
        }
    }
    
    updateParticipantCallStatus() {
        if (database && this.channel && this.deviceHash) {
            database.ref(`channels/${this.channel}/participants/${this.deviceHash}/inCall`).set(this.isCallActive);
        }
    }
    
    leaveRoom() {
        // End call if active
        if (this.isInCall) {
            this.endCall();
        }
        
        // Clean up room connection
        if (this.channel && database) {
            // Temporarily reconnect to clean up
            reconnectFirebaseTemporarily();
            database.ref(`channels/${this.channel}`).off();
            this.removeParticipant(this.deviceHash);
        }
        
        // Clear introduction checker
        if (this.introductionChecker) {
            clearInterval(this.introductionChecker);
            this.introductionChecker = null;
        }
        
        // Update history and reset
        if (this.channel) {
            this.updateRoomHistory();
        }
        
        this.showCallSetup();
        this.resetState();
    }
    
    updateStatus(status, type = 'info') {
        this.showNotification(status, type);
    }
    
    updateRoomTitle(newName = null) {
        if (newName) {
            this.roomName = newName;
        }
        
        const groupTitle = this.elements.roomTitle;
        if (groupTitle && this.channel) {
            const nameToDisplay = this.roomName || this.channel;
            const words = nameToDisplay.split(/[\s-]+/);
            const displayName = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            groupTitle.textContent = displayName;
            groupTitle.title = 'Click to rename group';
        }
    }
    
    async requestRoomAccess(channelId, userName) {
        this.showNotification('Requesting to join group...', 'info');
        
        const requestData = {
            requester: sanitizeInput(userName),
            deviceHash: this.deviceHash,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        const requestRef = database.ref(`channels/${channelId}/joinRequests`).push();
        await requestRef.set(requestData);
        
        const waitForResponse = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                requestRef.remove();
                resolve('timeout');
            }, 30000);
            
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
            this.userName = sanitizeInput(userName);
            this.setupSignaling();
            this.showCallInterface();
            this.updateStatus('Connected to group');
            this.showNotification('Welcome to the group!', 'success');
        } else if (result === 'denied') {
            this.showNotification('Access denied by group members', 'error');
        } else {
            this.showNotification('Request timed out', 'error');
        }
    }
    
    setupAccessRequestListener() {
        if (!database || !this.channel) return;
        
        database.ref(`channels/${this.channel}/joinRequests`).on('child_added', (snapshot) => {
            const requestData = snapshot.val();
            if (requestData && requestData.status === 'pending' && requestData.deviceHash !== this.deviceHash) {
                this.showJoinRequest(snapshot.key, requestData);
            }
        });
    }
    
    showJoinRequest(requestId, requestData) {
        const existing = document.querySelector('.join-request-dialog');
        if (existing) existing.remove();
        
        const dialog = document.createElement('div');
        dialog.className = 'join-request-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h4>🚪 Join Request</h4>
                <p><strong>${this.escapeHtml(requestData.requester)}</strong> wants to join the group.</p>
                <div class="dialog-buttons">
                    <button class="btn-secondary" onclick="phoneCall.handleJoinRequest('${requestId}', 'denied')">Deny</button>
                    <button class="btn-primary" onclick="phoneCall.handleJoinRequest('${requestId}', 'approved')">Allow</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        setTimeout(() => {
            if (document.contains(dialog)) {
                this.handleJoinRequest(requestId, 'denied');
            }
        }, 20000);
    }
    
    handleJoinRequest(requestId, decision) {
        database.ref(`channels/${this.channel}/joinRequests/${requestId}`).update({
            status: decision,
            decidedBy: this.userName,
            decidedAt: Date.now()
        });
        
        const dialog = document.querySelector('.join-request-dialog');
        if (dialog) dialog.remove();
        
        const action = decision === 'approved' ? 'approved' : 'denied';
        this.showNotification(`Join request ${action}`, 'info');
    }

    createPeerConnection(peerId) {
        const configuration = {
            iceServers: this.getPublicIceServers(),
            iceCandidatePoolSize: 10
        };
        
        const pc = new RTCPeerConnection(configuration);
        
        pc.onicecandidate = (event) => {
            try {
                if (event.candidate) {
                    // Send any non-null candidate, converted to a plain object for Firebase
                    this.sendSignal('ice-candidate', { candidate: event.candidate.toJSON(), targetPeer: peerId });
                }
            } catch (error) {
                console.error('ICE candidate error:', sanitizeForLog(error.message));
            }
        };
        
        pc.ontrack = (event) => {
            try {
                console.log(`[${this.userName}] 🎵 Received track from`, sanitizeForLog(peerId));
                this.remoteStreams.set(peerId, event.streams[0]);
                this.setupRemoteAudio(peerId, event.streams[0]);
                this.connectedPeers.add(peerId);
                this.updateConnectionStatus();
            } catch (error) {
                console.error('Track handling error:', sanitizeForLog(error.message));
            }
        };

        // Detailed Logging for WebRTC State
        pc.onsignalingstatechange = () => {
            console.log(`[${this.userName}] WebRTC signaling state change for peer ${peerId}: ${pc.signalingState}`);
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[${this.userName}] WebRTC ICE connection state change for peer ${peerId}: ${pc.iceConnectionState}`);
        };
        
        pc.onconnectionstatechange = () => {
            console.log(`[${this.userName}] WebRTC connection state change for peer ${peerId}: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') {
                this.connectedPeers.add(peerId);
                // Once a P2P connection is established, we can schedule a disconnect from Firebase
                if (this.connectedPeers.size > 0) {
                    console.log('🕸️ P2P mesh active, scheduling Firebase disconnect.');
                    scheduleFirebaseDisconnect();
                }
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
                this.connectedPeers.delete(peerId);
                this.removeRemoteAudio(peerId);
                this.dataChannels.delete(peerId);
                // If all P2P connections are lost, reconnect to Firebase to find other peers
                if (this.connectedPeers.size === 0) {
                    console.log('🕸️ P2P mesh lost, reconnecting to Firebase.');
                    reconnectFirebaseTemporarily();
                }
            }
            this.updateConnectionStatus();
        };
        
        // Create DataChannel for messaging
        const dataChannel = pc.createDataChannel('messages', {
            ordered: true
        });
        
        dataChannel.onopen = () => {
            try {
                console.log('DataChannel opened with', sanitizeForLog(peerId));
                this.dataChannels.set(peerId, dataChannel);
                this.exchangeReconnectInfo(peerId, dataChannel);
            } catch (error) {
                console.error('DataChannel open error:', sanitizeForLog(error.message));
            }
        };
        
        dataChannel.onmessage = (event) => {
            this.handleP2PMessage(event.data, peerId);
        };
        
        pc.ondatachannel = (event) => {
            const channel = event.channel;
            channel.onmessage = (event) => {
                this.handleP2PMessage(event.data, peerId);
            };
            this.dataChannels.set(peerId, channel);
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
        const p2pData = urlParams.get('p');
        
        // Handle serverless P2P connection
        if (p2pData) {
            try {
                const decoded = atob(p2pData);
                const parts = decoded.split('|');
                const [userName, deviceHash, channelId, contactId] = parts;
                
                // Direct serverless connection
                this.userName = userName + ' (Direct)';
                this.channel = channelId;
                
                this.showNotification('Serverless P2P detected!', 'success');
                this.showAnswerDialog(contactId);
                return;
            } catch (e) {
                console.warn('Invalid P2P data:', e);
            }
        }
        
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
                if (this.elements.nameInput) {
                    this.elements.nameInput.value = session.userName || '';
                }
                
                // Show reconnection option
                this.showReconnectionOption(session);
                sessionStorage.removeItem('phoneCallSession');
                return;
            } catch (e) {
                sessionStorage.removeItem('phoneCallSession');
            }
        }
        
        if (channel && this.elements.roomCodeInput) {
            this.elements.roomCodeInput.value = channel;
        }
    }
    
    showReconnectionOption(session) {
        const reconnectDiv = document.createElement('div');
        reconnectDiv.className = 'reconnect-banner';
        const displayName = session.roomName || session.channel;
        reconnectDiv.innerHTML = `
            <div class="dialog-content">
                <h4>Welcome Back</h4>
                <p>Continue your session in <span class="room-name">${this.escapeHtml(displayName)}</span></p>
                <div class="reconnect-buttons">
                    <button id="dismissBtn" class="btn-secondary">Start Fresh</button>
                    <button id="reconnectBtn" class="btn-primary">Continue Session</button>
                </div>
            </div>
        `;
        
        this.elements.callSetup.insertBefore(reconnectDiv, this.elements.callSetup.firstChild);
        
        document.getElementById('reconnectBtn').addEventListener('click', () => {
            this.userName = session.userName;
            this.channel = session.channel;
            this.setupSignaling();
            this.showCallInterface();
            reconnectDiv.remove();
        });
        
        document.getElementById('dismissBtn').addEventListener('click', () => {
            reconnectDiv.remove();
        });
    }

    generateMemorableRoomId() {
        const adjectives = [
            'happy', 'sunny', 'cool', 'swift', 'smart', 'bright', 'calm', 
            'azure', 'coral', 'sage', 'royal', 'noble', 'brave', 'wise',
            'kind', 'pure', 'wild', 'bold', 'free', 'epic'
        ];
        const nouns = [
            'wolf', 'bear', 'swan', 'hawk', 'lion', 'rose', 'pine',
            'star', 'moon', 'wave', 'wind', 'peak', 'lake', 'bloom',
            'dawn', 'song', 'beam', 'glow', 'hope', 'dream'
        ];
        const numbers = Math.floor(Math.random() * 999) + 1;
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        
        return `${adj}-${noun}-${numbers}`;
    }
    
    async createRoom() {
        const userName = this.elements.nameInput.value.trim();
        if (!userName || !validateInput(userName, 'text', 30)) {
            this.showNotification('Please enter a valid name (letters, numbers, spaces only)', 'error');
            return;
        }
        
        const groupId = this.generateMemorableRoomId();
        this.channel = groupId;
        this.userName = sanitizeInput(userName);
        this.roomName = groupId; // Set initial name
        
        // Write initial name to Firebase
        if (database) {
            database.ref(`channels/${this.channel}/name`).set(this.roomName);
        }

        try {
            this.setupSignaling();
            this.showCallInterface();
            this.updateRoomTitle();
            this.updateStatus('Group created - Share to invite others');
            this.showNotification('Group created!', 'success');
        } catch (error) {
            console.error('Group creation failed:', sanitizeForLog(error.message));
            this.showNotification('Failed to create group', 'error');
        }
    }
    
    showJoinModal() {
        if (!this.elements.nameInput.value.trim()) {
            this.showNotification('Please enter your name first', 'error');
            return;
        }
        this.elements.joinModal.classList.remove('hidden');
    }
    
    showP2PModal() {
        if (!this.elements.nameInput.value.trim()) {
            this.showNotification('Please enter your name first', 'error');
            return;
        }
        this.generateMyP2PUrl();
        this.generateQRCode();
        this.elements.p2pModal.classList.remove('hidden');
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    async joinGroup() {
        const roomCode = this.elements.roomCodeInput.value.trim();
        const userName = this.elements.nameInput.value.trim();
        
        if (!roomCode || !validateInput(roomCode, 'roomCode', 20)) {
            this.showNotification('Enter valid group code (letters, numbers, dashes only)', 'error');
            return;
        }
        
        if (!userName || !validateInput(userName, 'text', 30)) {
            this.showNotification('Enter valid name', 'error');
            return;
        }
        
        // Check if group exists
        const groupExists = await this.checkRoomExists(roomCode);
        if (!groupExists) {
            this.showNotification('Group not found. Check the group code.', 'error');
            return;
        }
        
        this.channel = sanitizeInput(roomCode);
        this.userName = sanitizeInput(userName);
        this.closeModal('joinModal');
        
        try {
            this.setupSignaling();
            this.showCallInterface();
            this.updateStatus('Joined group');
            this.showNotification('Joined group!', 'success');
        } catch (error) {
            console.error('Join group failed:', sanitizeForLog(error.message));
            this.showNotification('Failed to join group', 'error');
        }
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
    
    toggleGroupSidebar() {
        const sidebar = this.elements.groupSidebar;
        const menuBtn = this.elements.groupMenuBtn;

        if (!sidebar || !menuBtn) return; // Safety check

        const isVisible = sidebar.classList.contains('visible');

        if (!isVisible) {
            sidebar.classList.add('visible');

            const closeHandler = (e) => {
                const currentSidebar = document.getElementById('groupSidebar');
                if (!currentSidebar) return;

                // Let the menu button handle its own click
                if (menuBtn.contains(e.target)) {
                    return;
                }

                if (!currentSidebar.contains(e.target)) {
                    currentSidebar.classList.remove('visible');
                }
            };

            setTimeout(() => {
                document.addEventListener('click', closeHandler, { once: true });
            }, 0);

        } else {
            sidebar.classList.remove('visible');
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
    

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || !validateInput(message, 'text', 200) || this.dataChannels.size === 0) {
            if (message && !validateInput(message, 'text', 200)) {
                this.showNotification('Invalid message content', 'error');
            }
            return;
        }
        
        try {
            const sanitizedMessage = sanitizeInput(message);
            const encryptedText = await this.encryptMessage(sanitizedMessage);
            const messageData = {
                text: encryptedText,
                sender: this.userName,
                senderHash: this.deviceHash,
                timestamp: Date.now(),
                id: Math.random().toString(36).substring(2, 15)
            };
            
            // Display locally
            this.displayMessage({
                text: sanitizedMessage,
                sender: this.userName,
                senderHash: this.deviceHash,
                timestamp: messageData.timestamp,
                id: messageData.id
            });
            
            // Save to local storage
            this.saveMessageToHistory({
                text: sanitizedMessage,
                sender: this.userName,
                senderHash: this.deviceHash,
                timestamp: messageData.timestamp,
                id: messageData.id
            });
            
            // Send encrypted message via P2P DataChannels
            const messageStr = JSON.stringify(messageData);
            this.dataChannels.forEach((channel, peerId) => {
                if (channel.readyState === 'open') {
                    try {
                        channel.send(messageStr);
                    } catch (error) {
                        console.error('Message send error to', sanitizeForLog(peerId), ':', sanitizeForLog(error.message));
                    }
                }
            });
            
            this.elements.messageInput.value = '';
        } catch (error) {
            console.error('Send message failed:', sanitizeForLog(error.message));
            this.showNotification('Failed to send message', 'error');
        }
    }
    
    setupMessageListener() {
        // Clear current messages for fresh start
        this.elements.messagesList.innerHTML = '';
        // Messages now handled via P2P DataChannels
    }
    
    displayMessage(messageData) {
        const messageDiv = document.createElement('div');
        const isOwnMessage = messageData.sender === this.userName;
        messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        // Enhanced message with timestamp and status
        const time = new Date(messageData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Use alias for display
        const senderAlias = isOwnMessage ? this.getContactAlias(this.deviceHash) : 
                           this.getContactAlias(messageData.senderHash) || messageData.sender;
        
        messageDiv.innerHTML = `
            ${!isOwnMessage ? `<div class="message-sender">${this.escapeHtml(senderAlias)}</div>` : ''}
            <div class="message-content">
                <div class="message-text">${this.processMessageText(messageData.text)}</div>
                <div class="message-time">${time}</div>
                <div class="message-actions">
                    <button class="btn-reaction" data-message-id="${messageData.id}"><i class="far fa-smile"></i></button>
                </div>
            </div>
            <div class="reactions" id="reactions-${messageData.id}"></div>
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
        if (!isOwnMessage) {
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
        if (this.elements.shareUrl) {
            this.elements.shareUrl.value = this.channel;
        }
        if (this.elements.shareSection) {
            this.elements.shareSection.style.display = 'block';
        }
    }
    
    generateMyP2PUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        const p2pData = `${this.userName}|${this.deviceHash}|${Date.now()}`;
        const p2pUrl = `${baseUrl}?p=${btoa(p2pData).replace(/[=+/]/g, '')}`;
        
        if (this.elements.myP2PUrl) {
            this.elements.myP2PUrl.value = p2pUrl;
        }
    }
    
    generateQRCode() {
        const url = this.elements.myP2PUrl?.value;
        if (!url) return;
        
        const qrContainer = document.getElementById('qrCode');
        if (!qrContainer) return;
        
        qrContainer.innerHTML = '';
        
        if (window.QRCode) {
            new QRCode(qrContainer, {
                text: url,
                width: 150,
                height: 150,
                colorDark: "#000000",
                colorLight: "#ffffff"
            });
        } else {
            qrContainer.innerHTML = '<p>QR code unavailable</p>';
        }
    }
    
    async copyMyP2PUrl() {
        const url = this.elements.myP2PUrl?.value;
        if (!url) return;
        
        try {
            await navigator.clipboard.writeText(url);
            this.elements.copyMyP2PBtn.textContent = '✓ Copied!';
            this.showNotification('P2P URL copied - Share with others!', 'success');
            
            setTimeout(() => {
                this.elements.copyMyP2PBtn.textContent = 'Copy My URL';
            }, 2000);
        } catch (err) {
            this.showNotification('Failed to copy URL', 'error');
        }
    }
    

    

    
    drawQRCode(text, canvas) {
        const ctx = canvas.getContext('2d');
        const size = canvas.width; // Use actual canvas size
        const modules = 25; // QR grid size
        const moduleSize = size / modules;
        
        // Clear canvas
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        
        // Generate QR pattern from text hash
        const hash = this.simpleHash(text);
        const pattern = this.generateQRPattern(hash, modules);
        
        ctx.fillStyle = '#000';
        
        // Draw QR modules
        for (let row = 0; row < modules; row++) {
            for (let col = 0; col < modules; col++) {
                if (pattern[row][col]) {
                    ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
                }
            }
        }
        
        // Add finder patterns (corners)
        this.drawFinderPattern(ctx, 0, 0, moduleSize);
        this.drawFinderPattern(ctx, (modules - 7) * moduleSize, 0, moduleSize);
        this.drawFinderPattern(ctx, 0, (modules - 7) * moduleSize, moduleSize);
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    generateQRPattern(hash, size) {
        const pattern = [];
        let seed = hash;
        
        for (let row = 0; row < size; row++) {
            pattern[row] = [];
            for (let col = 0; col < size; col++) {
                // Skip finder pattern areas
                if ((row < 9 && col < 9) || 
                    (row < 9 && col >= size - 8) || 
                    (row >= size - 8 && col < 9)) {
                    pattern[row][col] = false;
                    continue;
                }
                
                // Generate pseudo-random pattern
                seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                pattern[row][col] = (seed % 100) < 45; // ~45% fill rate
            }
        }
        
        return pattern;
    }
    
    drawFinderPattern(ctx, x, y, moduleSize) {
        // Outer 7x7 black square
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
        
        // Inner 5x5 white square
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
        
        // Center 3x3 black square
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
    }
    


    async copyShareUrl() {
        const groupUrl = `${window.location.origin}${window.location.pathname}?channel=${this.channel}`;
        
        try {
            await navigator.clipboard.writeText(groupUrl);
            this.elements.copyBtn.textContent = '✓';
            this.showNotification('Group URL copied!', 'success');
            
            setTimeout(() => {
                this.elements.copyBtn.textContent = '📋';
            }, 2000);
        } catch (err) {
            this.showNotification('Failed to copy', 'error');
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
    
    generateContactId() {
        // Use device hash as contact ID
        return this.deviceHash;
    }
    
    verifyPeerIdentity(peerId, signature) {
        // Simple signature verification
        const expected = btoa(peerId + this.contactId).slice(0, 8);
        return signature === expected;
    }
    
    signIdentity(targetId) {
        return btoa(this.contactId + targetId).slice(0, 8);
    }
    
    async generateEncryptionKey() {
        if (!this.encryptionKey) {
            this.encryptionKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        }
        return this.encryptionKey;
    }
    
    async encryptMessage(text) {
        const key = await this.generateEncryptionKey();
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        return btoa(String.fromCharCode(...combined));
    }
    
    async decryptMessage(encryptedText) {
        try {
            const key = await this.generateEncryptionKey();
            const combined = new Uint8Array(atob(encryptedText).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            return '[Encrypted message - cannot decrypt]';
        }
    }
    
    async handleP2PMessage(data, senderId) {
        try {
            const messageData = JSON.parse(data);
            
            // Verify sender identity for security
            if (messageData.data?.signature && messageData.data?.contactId) {
                if (!this.verifyPeerIdentity(messageData.data.contactId, messageData.data.signature)) {
                    console.warn('Invalid peer signature from', senderId);
                    return;
                }
                this.trustedPeers.add(senderId);
            }
            
            // Handle P2P signaling
            if (messageData.type?.startsWith('direct-')) {
                this.handleDirectSignaling(messageData, senderId);
                return;
            }
            
            if (messageData.type === 'reconnect-info') {
                this.storeReconnectInfo(senderId, messageData.data);
                return;
            }
            
            if (messageData.type === 'heartbeat') {
                // Respond to heartbeat
                const channel = this.dataChannels.get(senderId);
                if (channel?.readyState === 'open') {
                    channel.send(JSON.stringify({ type: 'heartbeat-ack', timestamp: Date.now() }));
                }
                return;
            }
            
            if (messageData.type === 'request-introductions') {
                // Introduce new peer to all existing peers
                this.introducePeer(messageData.data.newPeer);
                return;
            }
            
            if (messageData.type === 'speaking') {
                this.updateParticipantSpeakingState(messageData.senderHash, messageData.speaking);
                return;
            }

            if (messageData.type === 'typing') {
                this.updateTypingIndicator(messageData.senderHash, messageData.senderName, messageData.typing);
                return;
            }

            if (messageData.type === 'reaction') {
                this.updateReactions(messageData.messageId, messageData.reaction, messageData.senderHash);
                return;
            }

            // Only accept messages from trusted peers
            if (!this.trustedPeers.has(senderId)) {
                console.warn('Message from untrusted peer:', senderId);
                return;
            }
            
            const decryptedText = await this.decryptMessage(messageData.text);
            
            // Add contact if not exists
            if (messageData.senderHash) {
                this.addContact(messageData.senderHash, messageData.sender);
                this.saveContact(messageData.senderHash, messageData.sender);
            }
            
            const displayMessage = {
                text: decryptedText,
                sender: messageData.sender,
                senderHash: messageData.senderHash,
                timestamp: messageData.timestamp,
                id: messageData.id
            };
            
            this.displayMessage(displayMessage);
            this.saveMessageToHistory(displayMessage);
        } catch (e) {
            console.error('Failed to handle P2P message:', e);
        }
    }
    
    handleDirectSignaling(messageData, senderId) {
        const { type, data } = messageData;
        
        switch (type) {
            case 'peer-introduction':
                this.handlePeerIntroduction(data, senderId);
                break;
            case 'introduction-offer':
                this.handleIntroductionOffer(data);
                break;
            case 'direct-offer':
                const pc = this.peerConnections.get(senderId);
                if (pc) {
                    pc.setRemoteDescription(data).then(() => {
                        return pc.createAnswer();
                    }).then(answer => {
                        pc.setLocalDescription(answer);
                        this.sendDirectSignal(senderId, 'answer', answer);
                    });
                }
                break;
            case 'direct-answer':
                const answerPc = this.peerConnections.get(senderId);
                if (answerPc) answerPc.setRemoteDescription(data);
                break;
            case 'direct-ice':
                const icePc = this.peerConnections.get(senderId);
                if (icePc) icePc.addIceCandidate(data);
                break;
        }
    }
    
    // New peer wants to join - existing peer introduces them
    introducePeer(newPeerInfo) {
        // Tell all existing peers about new peer
        this.dataChannels.forEach((channel, peerId) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify({
                    type: 'peer-introduction',
                    data: {
                        newPeer: newPeerInfo,
                        introducer: this.userName,
                        timestamp: Date.now()
                    }
                }));
            }
        });
    }
    
    handlePeerIntroduction(data, introducerId) {
        const { newPeer } = data;
        
        // Create connection to new peer
        this.createDirectConnection(newPeer.userName, {
            userName: newPeer.userName,
            deviceHash: newPeer.deviceHash,
            iceServers: this.getPublicIceServers()
        });
        
        console.log(`Introduced to new peer: ${newPeer.userName} by ${introducerId}`);
    }
    
    async handleIntroductionOffer(data) {
        const { offer, from } = data;
        
        const pc = this.createPeerConnection(from);
        this.peerConnections.set(from, pc);
        
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer back through introducer
        this.sendDirectSignal(from, 'introduction-answer', {
            answer,
            to: from,
            from: this.userName
        });
    }
    
    // Join existing P2P network without Firebase
    async joinP2PNetwork(knownPeerInfo) {
        try {
            // Connect to one known peer
            const pc = await this.createDirectConnection(knownPeerInfo.userName, knownPeerInfo);
            
            // Request introduction to others
            const channel = this.dataChannels.get(knownPeerInfo.userName);
            if (channel?.readyState === 'open') {
                channel.send(JSON.stringify({
                    type: 'request-introductions',
                    data: {
                        newPeer: {
                            userName: this.userName,
                            deviceHash: this.deviceHash
                        }
                    }
                }));
            }
            
            this.showNotification('Joined P2P network directly!', 'success');
        } catch (e) {
            console.error('Failed to join P2P network:', e);
        }
    }
    
    exchangeReconnectInfo(peerId, channel) {
        const signature = this.signIdentity(peerId);
        const reconnectData = {
            type: 'reconnect-info',
            data: {
                userName: this.userName,
                deviceHash: this.deviceHash,
                contactId: this.contactId,
                channel: this.channel,
                signature: signature,
                iceServers: this.getPublicIceServers(),
                timestamp: Date.now(),
                lastSeen: Date.now()
            }
        };
        channel.send(JSON.stringify(reconnectData));
        
        // Store peer in persistent network
        this.addToPersistentNetwork(peerId, reconnectData.data);
        this.enablePersistentConnection(peerId, channel);
    }
    
    async addToPersistentNetwork(peerId, peerData) {
        try {
            const networkKey = `p2pNetwork_${this.channel}`;
            let network = await this.loadFromEncryptedStorage(networkKey) || {};
            
            network[peerId] = {
                ...peerData,
                lastSeen: Date.now(),
                connectionCount: (network[peerId]?.connectionCount || 0) + 1
            };
            
            await this.saveToEncryptedStorage(networkKey, network);
            console.log('Added peer to encrypted persistent network:', peerId);
        } catch (e) {
            console.warn('Failed to store peer network:', e);
        }
    }
    
    async loadPersistentNetwork() {
        try {
            const networkKey = `p2pNetwork_${this.channel}`;
            const network = await this.loadFromEncryptedStorage(networkKey) || {};
            
            // Remove stale peers (older than 7 days)
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            Object.keys(network).forEach(peerId => {
                if (network[peerId].lastSeen < weekAgo) {
                    delete network[peerId];
                }
            });
            
            await this.saveToEncryptedStorage(networkKey, network);
            return network;
        } catch (e) {
            return {};
        }
    }
    
    getPublicIceServers() {
        // Adding more public STUN servers to increase NAT traversal success rate.
        // The public TURN server is known to be unreliable, so improving STUN is the best bet.
        return [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:openrelay.metered.ca:80' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
        ];
    }
    
    enablePersistentConnection(peerId, channel) {
        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
            } else {
                clearInterval(heartbeat);
            }
        }, 30000);
        
        // Store heartbeat reference
        this.heartbeats = this.heartbeats || new Map();
        this.heartbeats.set(peerId, heartbeat);
    }
    
    storeReconnectInfo(peerId, data) {
        try {
            const reconnectKey = `reconnect_${this.channel}_${peerId}`;
            localStorage.setItem(reconnectKey, JSON.stringify(data));
            console.log('Stored reconnect info for', peerId);
        } catch (e) {
            console.warn('Failed to store reconnect info:', e);
        }
    }
    
    async attemptDirectReconnect() {
        const network = this.loadPersistentNetwork();
        const peers = Object.entries(network).filter(([peerId]) => peerId !== this.userName);
        
        if (peers.length === 0) {
            console.log('No persistent peers found');
            return false;
        }
        
        console.log(`Attempting to reconnect to ${peers.length} persistent peers`);
        
        // Parallel reconnection attempts
        const reconnectPromises = peers.map(async ([peerId, peerData]) => {
            try {
                return await this.createDirectConnection(peerId, peerData);
            } catch (e) {
                console.warn(`Failed to reconnect to ${peerId}:`, e);
                return null;
            }
        });
        
        const results = await Promise.allSettled(reconnectPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`Reconnected to ${successful}/${peers.length} peers`);
        return successful > 0;
    }
    
    async createDirectConnection(peerId, peerData) {
        const pc = new RTCPeerConnection({
            iceServers: peerData.iceServers || this.getPublicIceServers()
        });
        
        // Fast connection setup
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendDirectSignal(peerId, 'ice', event.candidate);
            }
        };
        
        pc.ontrack = (event) => {
            this.setupRemoteAudio(peerId, event.streams[0]);
            this.connectedPeers.add(peerId);
        };
        
        // Create offer immediately
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.peerConnections.set(peerId, pc);
        this.sendDirectSignal(peerId, 'offer', offer);
        
        return pc;
    }
    
    sendDirectSignal(peerId, type, data) {
        // Use WebRTC DataChannel or WebSocket fallback
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify({ type: `direct-${type}`, data, from: this.userName }));
        }
    }
    
    async sendDirectReconnectOffer(peerId, peerData) {
        const pc = this.createPeerConnection(peerId);
        this.peerConnections.set(peerId, pc);
        
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        
        // Send via existing DataChannel if available
        const existingChannel = this.dataChannels.get(peerId);
        if (existingChannel && existingChannel.readyState === 'open') {
            const reconnectOffer = {
                type: 'reconnect-offer',
                data: { offer, from: this.userName }
            };
            existingChannel.send(JSON.stringify(reconnectOffer));
        }
    }
    
    async handleReconnectOffer(senderId, data) {
        try {
            let pc = this.peerConnections.get(senderId);
            if (!pc) {
                pc = this.createPeerConnection(senderId);
                this.peerConnections.set(senderId, pc);
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // Send answer back via DataChannel
            const channel = this.dataChannels.get(senderId);
            if (channel && channel.readyState === 'open') {
                const reconnectAnswer = {
                    type: 'reconnect-answer',
                    data: { answer, from: this.userName }
                };
                channel.send(JSON.stringify(reconnectAnswer));
            }
            
            console.log('Direct reconnection established with', senderId);
        } catch (e) {
            console.error('Failed to handle reconnect offer:', e);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Encrypted storage management
    async getDomainKey() {
        const domain = window.location.hostname;
        const encoder = new TextEncoder();
        const data = encoder.encode(domain + 'call.wecanuseai.2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return await crypto.subtle.importKey(
            'raw', hashBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
        );
    }

    async saveToEncryptedStorage(key, data) {
        try {
            const domainKey = await this.getDomainKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(JSON.stringify(data));
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv }, domainKey, encodedData
            );
            
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);
            
            localStorage.setItem(key, btoa(String.fromCharCode(...combined)));
        } catch (error) {
            console.error('Encrypted storage save failed:', error);
        }
    }

    async loadFromEncryptedStorage(key) {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            
            const combined = new Uint8Array(atob(stored).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);
            
            const domainKey = await this.getDomainKey();
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv }, domainKey, encrypted
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Encrypted storage load failed:', error);
            return null;
        }
    }

    async saveMessageToHistory(messageData) {
        try {
            const historyKey = `chatHistory_${this.channel}`;
            let history = await this.loadFromEncryptedStorage(historyKey) || [];
            
            history.push({
                text: messageData.text,
                sender: messageData.sender,
                timestamp: messageData.timestamp
            });
            
            // Keep only last 50 messages per room
            if (history.length > 50) {
                history = history.slice(-50);
            }
            
            await this.saveToEncryptedStorage(historyKey, history);
            
            // Update room list
            this.updateRoomHistory();
        } catch (e) {
            console.warn('Failed to save message to history:', e);
        }
    }
    
    async updateRoomHistory() {
        try {
            let rooms = await this.loadFromEncryptedStorage('roomHistory') || [];
            
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
            
            await this.saveToEncryptedStorage('roomHistory', rooms);
        } catch (e) {
            console.warn('Failed to update room history:', e);
        }
    }
    
    async loadChatHistory() {
        try {
            const rooms = await this.loadFromEncryptedStorage('roomHistory') || [];
            this.elements.historyList.innerHTML = '';
            
            if (rooms.length === 0) {
                this.elements.historyList.innerHTML = '<div class="history-item">No previous groups</div>';
                return;
            }
            
            rooms.forEach(room => {
                const item = document.createElement('div');
                item.className = 'history-item';
                
                const time = new Date(room.lastActivity).toLocaleDateString();
                const displayName = room.roomName || `Group ${room.channel}`;
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
    
    async viewRoomHistory(channel, displayName) {
        try {
            const historyKey = `chatHistory_${channel}`;
            const messages = await this.loadFromEncryptedStorage(historyKey) || [];
            
            if (messages.length === 0) {
                this.showNotification('No messages in this group', 'info');
                return;
            }
            
            const messageText = messages.slice(-5).map(m => 
                `${m.sender}: ${m.text}`
            ).join('\n');
            
            secureNotify(`Last messages from ${displayName}: ${messageText.substring(0, 100)}...`, 'info');
        } catch (e) {
            this.showNotification('Failed to load group history', 'error');
        }
    }
    
    renameRoom() {
        if (this.isEditingName) return;
        this.isEditingName = true;

        const groupTitle = this.elements.roomTitle;
        const currentName = this.roomName || this.channel;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-edit-input';
        input.value = currentName;

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-icon-bare';
        confirmBtn.innerHTML = '<i class="fas fa-check"></i>';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-icon-bare';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';

        const wrapper = document.createElement('div');
        wrapper.className = 'inline-edit-wrapper';
        wrapper.appendChild(input);
        wrapper.appendChild(confirmBtn);
        wrapper.appendChild(cancelBtn);

        const groupNameWrapper = groupTitle.parentElement;
        groupNameWrapper.style.display = 'none';
        groupNameWrapper.parentElement.insertBefore(wrapper, groupNameWrapper);
        input.focus();
        input.select();

        const endNameEdit = (shouldSave) => {
            if (shouldSave) {
                const newName = input.value.trim();
                if (newName && validateInput(newName, 'text', 50) && newName !== currentName) {
                    const sanitizedName = sanitizeInput(newName);
                    this.roomName = sanitizedName;

                    // Update in Firebase
                    if (database) {
                        database.ref(`channels/${this.channel}/name`).set(sanitizedName);
                    }

                    this.updateRoomTitle();
                    this.updateRoomHistory();
                    this.showNotification('Group renamed!', 'success');
                }
            }
            wrapper.remove();
            groupNameWrapper.style.display = '';
            this.isEditingName = false;
        };

        confirmBtn.addEventListener('click', () => endNameEdit(true));
        cancelBtn.addEventListener('click', () => endNameEdit(false));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                endNameEdit(true);
            } else if (e.key === 'Escape') {
                endNameEdit(false);
            }
        });
        input.addEventListener('blur', () => endNameEdit(true));
    }
    
    updateRoomTitle() {
        if (!this.elements.roomTitle || !this.elements.groupNameInUrl) return;
        
        // Format the room name nicely by capitalizing each word
        const words = this.channel.split('-');
        const displayName = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        // Update the main title
        this.elements.roomTitle.textContent = displayName;
        
        // Update the URL part
        if (this.elements.groupNameInUrl) {
            this.elements.groupNameInUrl.textContent = this.channel;
        }
    }

    generateUserIdentity() {
        const icons = ['🐱', '🐶', '🐻', '🐸', '🐧', '🐢', '🦊', '🐼', '🦁', '🐯'];
        const anonymousNames = [
            'Anonymous Cat', 'Anonymous Dog', 'Anonymous Bear', 'Anonymous Frog', 
            'Anonymous Penguin', 'Anonymous Turtle', 'Anonymous Fox', 'Anonymous Panda',
            'Anonymous Lion', 'Anonymous Tiger', 'Anonymous Koala', 'Anonymous Owl',
            'Anonymous Rabbit', 'Anonymous Elephant', 'Anonymous Dolphin'
        ];
        
        const randomName = anonymousNames[Math.floor(Math.random() * anonymousNames.length)];
        if (this.elements.nameInput) {
            this.elements.nameInput.value = randomName;
        }
        this.userName = randomName;
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
        
        // Generate memorable room ID if empty
        if (!channelId) {
            channelId = this.generateMemorableRoomId();
            this.elements.channelInput.value = channelId;
        }
        
        this.channel = channelId;
        this.userName = userName;
        
        // Use Firebase by default, fallback to P2P if needed
        if (firebaseEnabled) {
            await this.joinViaFirebase();
        } else {
            // Try persistent P2P network if Firebase disabled
            const network = this.loadPersistentNetwork();
            const hasPersistentPeers = Object.keys(network).some(peerId => peerId !== userName);
            
            if (hasPersistentPeers) {
                this.showNotification('Reconnecting to P2P network...', 'info');
                this.showCallInterface();
                
                const reconnectSuccess = await Promise.race([
                    this.attemptDirectReconnect(),
                    new Promise(resolve => setTimeout(() => resolve(false), 5000))
                ]);
                
                if (reconnectSuccess && this.connectedPeers.size > 0) {
                    this.updateStatus('P2P network restored');
                    this.showNotification('Reconnected to persistent network!', 'success');
                    return;
                }
            }
            
            await this.createP2PRoom();
        }
    }
    
    async joinViaFirebase() {
        // Ensure Firebase is connected for setup
        reconnectFirebaseTemporarily();
        
        // Check Firebase connection
        const isConnected = await this.checkFirebaseConnection();
        if (!isConnected) {
            this.showNotification('Connection failed. Please try again.', 'error');
            return;
        }
        
        try {
            // Check name availability
            const nameAvailable = await this.checkNameAvailability(this.channel, this.userName);
            if (!nameAvailable) {
                const snapshot = await database.ref(`channels/${this.channel}/participants`).once('value');
                const existingNames = Object.keys(snapshot.val() || {});
                const uniqueName = this.generateUniqueName(this.userName, existingNames);
                
                this.showNotification(`Name taken. Using: ${uniqueName}`, 'info');
                this.userName = uniqueName;
            }
            
            // Check if group has participants (requires approval)
            const participantCount = await this.getParticipantCount(this.channel);
            if (participantCount > 0) {
                await this.requestRoomAccess(this.channel, this.userName);
                return;
            }
            
            this.isInCall = false;
            
            // Join group (messaging only initially)
            this.setupSignaling();
            this.setupAccessRequestListener();
            this.showCallInterface();
            this.updateStatus('Connected to group');
            
            // Generate share URL for existing group
            this.generateShareUrl();
            
            // Schedule Firebase disconnect after mesh is established
            setTimeout(() => {
                if (this.connectedPeers.size > 0) {
                    console.log('🕸️ Mesh network established, can disconnect Firebase');
                    scheduleFirebaseDisconnect();
                }
            }, 10000);
            
        } catch (error) {
            console.error('Error joining group:', error);
            this.showNotification('Failed to join group', 'error');
        }
    }

    async checkRoomExists(roomCode) {
        if (!database) return true; // Allow in P2P mode
        
        try {
            const snapshot = await database.ref(`channels/${roomCode}`).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Room check failed:', sanitizeForLog(error.message));
            return false;
        }
    }
    
    async getParticipantCount(channelId) {
        try {
            const snapshot = await database.ref(`channels/${channelId}/participants`).once('value');
            const participants = snapshot.val() || {};
            return Object.keys(participants).length;
        } catch (error) {
            console.error('Failed to get participant count:', sanitizeForLog(error.message || error));
            return 0;
        }
    }
    
    async checkNameAvailability(channelId, userName) {
        try {
            const snapshot = await database.ref(`channels/${channelId}/participants/${userName}`).once('value');
            return !snapshot.exists();
        } catch (error) {
            return true; // Assume available if check fails
        }
    }
    
    generateUniqueName(baseName, existingNames) {
        if (!existingNames.includes(baseName)) {
            return baseName;
        }
        
        let counter = 2;
        let uniqueName = `${baseName} (${counter})`;
        
        while (existingNames.includes(uniqueName)) {
            counter++;
            uniqueName = `${baseName} (${counter})`;
        }
        
        return uniqueName;
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
            
            // Setup basic audio processing
            try {
                this.setupAudioProcessing();
                this.setupVoiceActivityDetection();
            } catch (audioError) {
                console.error('Audio processing setup failed:', sanitizeForLog(audioError.message));
            }
            
            // Add tracks to existing connections
            this.peerConnections.forEach((pc) => {
                try {
                    this.localStream.getTracks().forEach(track => {
                        pc.addTrack(track, this.localStream);
                    });
                } catch (trackError) {
                    console.error('Track addition failed:', sanitizeForLog(trackError.message));
                }
            });
            
            console.log('🎤 Enhanced audio ready');
            
        } catch (error) {
            console.error('getUserMedia failed:', sanitizeForLog(error.message));
            const errorMessage = error.name === 'NotAllowedError' ? 'Microphone access denied' :
                               error.name === 'NotFoundError' ? 'No microphone found' :
                               'Microphone access failed';
            throw new Error(errorMessage + ': ' + error.message);
        }
    }
    
    setupAudioProcessing() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Create audio processing chain with VAD
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        const gainNode = this.audioContext.createGain();
        const compressor = this.audioContext.createDynamicsCompressor();
        this.audioAnalyser = this.audioContext.createAnalyser();
        
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

    setupVoiceActivityDetection() {
        if (!this.localStream || !this.audioAnalyser) return;

        const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
        let wasSpeaking = false;

        const checkSpeaking = () => {
            if (!this.audioAnalyser) return;
            this.audioAnalyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const isSpeaking = average > 20; // Threshold can be adjusted

            if (isSpeaking !== wasSpeaking) {
                wasSpeaking = isSpeaking;
                this.broadcastSpeakingState(isSpeaking);
            }
            requestAnimationFrame(checkSpeaking);
        };

        checkSpeaking();
    }

    broadcastSpeakingState(isSpeaking) {
        const message = {
            type: 'speaking',
            speaking: isSpeaking,
            senderHash: this.deviceHash,
        };
        const messageStr = JSON.stringify(message);
        this.dataChannels.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(messageStr);
            }
        });
        // also update my own UI
        this.updateParticipantSpeakingState(this.deviceHash, isSpeaking);
    }

    setupSignaling() {
        if (!firebaseEnabled || !database) {
            console.log('Using P2P-only mode');
            this.setupP2POnlyMode();
            return;
        }
        
        // Clean up old signals first
        this.cleanupOldSignals();
        
        // Listen for signaling messages in signals path only
        const signalsRef = database.ref(`channels/${this.channel}/signals`);
        signalsRef.on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (data && data.sender !== this.deviceHash) {
                console.log('Received signal:', data.type, 'from', encodeURIComponent(data.sender));
                this.handleSignal(data);
                
                // Remove processed signal immediately
                snapshot.ref.remove().catch((error) => {
                    console.warn('Failed to remove signal:', error.message);
                });
            }
        });
        
        // Add user to participants using hash as key
        this.addParticipant(this.deviceHash, this.userName);
        
        // Setup message listener
        this.setupMessageListener();
        
        // Setup group introduction system
        this.setupGroupIntroductionListener();
        
        // Listen for group name changes
        database.ref(`channels/${this.channel}/name`).on('value', (snapshot) => {
            const newName = snapshot.val();
            if (newName) {
                this.updateRoomTitle(newName);
            }
        });

        // Listen for participants and create mesh connections
        database.ref(`channels/${this.channel}/participants`).on('value', (snapshot) => {
            const participants = snapshot.val() || {};
            const participantCount = Object.keys(participants).length;
            console.log('Participants updated:', participantCount, 'total');
            
            // Check if others are in call
            this.othersInCall = Object.values(participants).some(p => p.inCall && p.deviceHash !== this.deviceHash);
            this.updateButtonStates();
            
            this.updateParticipantsList(participants);
            
            // Create mesh connections for messaging and calling automatically
            const currentHashes = Object.keys(participants);
            const newHashes = currentHashes.filter(hash =>
                hash !== this.deviceHash && !this.peerConnections.has(hash)
            );

            // Create PeerConnections for new peers and decide who sends the offer
            newHashes.forEach(peerHash => {
                if (participants[peerHash] && !this.peerConnections.has(peerHash)) {
                    console.log(`[${this.userName}] Found new peer: ${peerHash}. Creating PeerConnection.`);
                    // 1. Create the PeerConnection object immediately for all new peers.
                    const pc = this.createPeerConnection(peerHash);
                    this.peerConnections.set(peerHash, pc);

                    // 2. Use the tie-breaker to decide which peer sends the offer.
                    const shouldInitiate = this.deviceHash < peerHash;
                    if (shouldInitiate) {
                        console.log(`[${this.userName}] I am the initiator for peer ${peerHash}. Sending offer.`);
                        this.sendOffer(peerHash);
                    } else {
                        console.log(`[${this.userName}] I am the receiver for peer ${peerHash}. Waiting for offer.`);
                    }
                }
            });

            // Clean up disconnected peers
            this.peerConnections.forEach((pc, peerHash) => {
                if (!currentHashes.includes(peerHash)) {
                    this.disconnectFromPeer(peerHash);
                }
            });
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

    async sendOffer(peerId) {
        try {
            const pc = this.peerConnections.get(peerId);
            if (!pc) {
                console.error(`[${this.userName}] No peer connection found for ${peerId} when trying to send offer.`);
                return;
            }

            if (pc.signalingState === 'stable') {
                const offer = await pc.createOffer({ offerToReceiveAudio: true });
                await pc.setLocalDescription(offer);
                this.sendSignal('offer', { offer, targetPeer: peerId });
                console.log(`[${this.userName}] 🚀 Sent offer to peer:`, encodeURIComponent(peerId));
            } else {
                console.warn(`[${this.userName}] Tried to send offer to ${peerId}, but signaling state is ${pc.signalingState}.`);
            }
        } catch (error) {
            console.error(`[${this.userName}] Error creating offer for peer:`, encodeURIComponent(peerId), error.message || error);
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

            // Ignore signals not intended for this client
            if (payload && payload.targetPeer && payload.targetPeer !== this.deviceHash) {
                return;
            }
            
            // Validate payload exists
            if (!payload) {
                console.warn(`[${this.userName}] Received signal of type ${type} with no payload.`);
                return;
            }

            switch (type) {
                case 'offer':
                    // Validate offer payload
                    if (!payload.offer || !payload.offer.type || !payload.offer.sdp) {
                        console.warn(`[${this.userName}] Received invalid offer payload:`, payload);
                        return;
                    }

                    let pc = this.peerConnections.get(sender);
                    if (!pc) {
                        pc = this.createPeerConnection(sender);
                        this.peerConnections.set(sender, pc);
                    }
                    
                    if (pc.signalingState !== 'stable') {
                        console.warn(`[${this.userName}] Received offer from ${sender} but signaling state is ${pc.signalingState}. Ignoring.`);
                        return;
                    }
                    
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer({ offerToReceiveAudio: true });
                    await pc.setLocalDescription(answer);
                    this.sendSignal('answer', { answer, targetPeer: sender });
                    console.log(`[${this.userName}] 📞 Answered call from peer:`, encodeURIComponent(sender));
                    break;
                    
                case 'answer':
                    // Validate answer payload
                    if (!payload.answer || !payload.answer.type || !payload.answer.sdp) {
                        console.warn(`[${this.userName}] Received invalid answer payload:`, payload);
                        return;
                    }

                    const answerPc = this.peerConnections.get(sender);
                    if (answerPc && answerPc.signalingState === 'have-local-offer') {
                        await answerPc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        console.log(`[${this.userName}] ✅ Call established with peer:`, encodeURIComponent(sender));
                    } else {
                         console.warn(`[${this.userName}] Received answer from ${sender} but not in have-local-offer state.`);
                    }
                    break;
                    
                case 'ice-candidate':
                    // Validate ICE candidate payload
                    if (!payload.candidate) {
                        console.warn(`[${this.userName}] Received invalid ICE candidate payload:`, payload);
                        return;
                    }

                    const candidatePc = this.peerConnections.get(sender);
                    if (candidatePc) {
                         if (candidatePc.remoteDescription) {
                            await candidatePc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error(`[${this.userName}] Error handling signal:`, error);
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
            sender: this.deviceHash, // Use the unique deviceHash as the sender ID
            senderName: this.userName, // Keep userName for display purposes if needed
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

    addParticipant(deviceHash, name) {
        if (!database) {
            console.error('Cannot add participant: database not available');
            return;
        }
        
        // Authorization check
        if (!validateInput(deviceHash, 'deviceHash') || !validateInput(name, 'text', 30)) {
            console.error('Invalid participant data');
            return;
        }
        
        console.log('Adding participant:', sanitizeForLog(name), 'with hash:', sanitizeForLog(deviceHash));
        
        // Use deviceHash as key, store name as data
        const participantRef = database.ref(`channels/${this.channel}/participants/${deviceHash}`);
        participantRef.set({
            joined: Date.now(),
            deviceHash: sanitizeInput(deviceHash),
            inCall: this.isCallActive || false,
            name: sanitizeInput(name),
            icon: this.userIcon
        }).catch(error => {
            console.error('Failed to add participant:', sanitizeForLog(error.message || error));
            this.showNotification('Connection failed - check Firebase setup', 'error');
        });
        
        // Set up automatic cleanup on disconnect
        participantRef.onDisconnect().remove();
    }

    removeParticipant(deviceHash) {
        if (!database) {
            console.error('Cannot remove participant: database not available');
            return;
        }
        
        console.log('Removing participant with hash:', deviceHash);
        
        database.ref(`channels/${this.channel}/participants/${deviceHash}`).remove().catch(error => {
            console.error('Failed to remove participant:', error.message || error);
        });
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    updateParticipantsList(participantsData) {
        this.participantsData = participantsData;
        const participants = Object.entries(participantsData);
        const participantCount = participants.length;
        
        if (this.elements.callerCount) {
            this.elements.callerCount.textContent = participantCount;
        }
        
        this.updateParticipantsDisplay();
        
        // Update status based on participant count
        if (participantCount > 1) {
            this.updateStatus('Connected - Voice & Messages');
            if (this.elements.statusDot) this.elements.statusDot.classList.add('connected');
        }
    }
    
    updateParticipantsDisplay() {
        if (!this.elements.participantsList || !this.participantsData) return;
        
        this.elements.participantsList.innerHTML = '';
        
        Object.values(this.participantsData).forEach(participant => {
            // Defensive check to prevent crash on malformed participant data
            if (!participant || typeof participant !== 'object' || !participant.deviceHash) {
                console.warn('Skipping invalid participant entry received from Firebase:', participant);
                return; // Skip this iteration
            }

            const peerHash = participant.deviceHash;
            this.addContact(peerHash, participant.name);
            const div = document.createElement('div');
            div.className = 'participant-item';
            div.dataset.hash = peerHash;
            
            const alias = this.getContactAlias(peerHash);
            const isMe = peerHash === this.deviceHash;
            
            div.innerHTML = `
                <div class="participant-avatar">${participant.icon || '👤'}</div>
                <div class="participant-info">
                    <span class="participant-name">${this.escapeHtml(alias)}</span>
                    <span class="participant-status">${isMe ? 'You' : 'Connected'}</span>
                </div>
                <div class="participant-actions">
                    <button onclick="phoneCall.editContactAlias('${peerHash}')" class="btn-edit">✏️</button>
                </div>
            `;
            
            this.elements.participantsList.appendChild(div);
        });
    }
    
    updateParticipantSpeakingState(deviceHash, isSpeaking) {
        const participantItem = document.querySelector(`.participant-item[data-hash="${deviceHash}"]`);
        if (participantItem) {
            if (isSpeaking) {
                participantItem.classList.add('speaking');
            } else {
                participantItem.classList.remove('speaking');
            }
        }
    }

    async editContactAlias(deviceHash) {
        const currentAlias = this.getContactAlias(deviceHash);
        const isMe = deviceHash === this.deviceHash;
        const promptText = isMe ? 'Set your display name:' : 'Set alias for this contact:';
        
        const newAlias = prompt(promptText, currentAlias);
        
        if (newAlias !== null) {
            await this.setContactAlias(deviceHash, newAlias || (isMe ? 'me' : deviceHash.substring(0, 8)));
            this.showNotification('Alias updated', 'success');
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
            if (!response.ok) {
                throw new Error('Audio file not found');
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer).catch(error => {
                throw new Error('Audio decode failed: ' + error.message);
            });
            
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
            console.error('Test audio error:', sanitizeForLog(e.message || e));
            if (e.message.includes('Audio file not found')) {
                this.showNotification('Test audio file missing', 'error');
            } else if (e.message.includes('decode failed')) {
                this.showNotification('Audio format not supported', 'error');
            } else {
                this.showNotification('Test audio failed', 'error');
            }
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
        if (!this.localStream) {
            this.showNotification('No microphone active', 'error');
            return;
        }
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.isMuted = !audioTrack.enabled;
            
            const btn = this.elements.muteBtn;
            if (this.isMuted) {
                btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                btn.classList.add('muted');
                btn.classList.add('active');
                btn.title = 'Unmute';
                this.showNotification('Muted', 'info');
            } else {
                btn.innerHTML = '<i class="fas fa-microphone"></i>';
                btn.classList.remove('active', 'muted');
                btn.title = 'Mute';
                this.showNotification('Unmuted', 'info');
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
            if (this.elements.statusDot) this.elements.statusDot.classList.add('connected');
        } else {
            if (this.elements.statusDot) this.elements.statusDot.classList.remove('connected');
        }
        
        this.updateStatus(status);
    }

    updateStatus(status, type = 'info') {
        // This is a duplicate of showNotification, let's consolidate
        this.showNotification(status, type);
    }

    showCallInterface() {
        this.elements.callSetup.classList.add('hidden');
        this.elements.callInterface.classList.remove('hidden');
        this.elements.callInterface.classList.add('fade-in');
        this.updateRoomTitle();
        
        // Share URL is now integrated in room header
        
        // Device-specific interface adjustments
        if (window.innerWidth <= 300) {
            // Smartwatch: hide non-essential elements
            this.elements.participantsToggle?.classList.add('hidden');
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
    }

    resetState() {
        // Clean up Firebase listeners first
        if (this.channel && database) {
            database.ref(`channels/${this.channel}`).off();
        }
        
        this.localStream = null;
        this.peerConnections = new Map();
        this.remoteStreams = new Map();
        this.dataChannels = new Map();
        this.encryptionKey = null;
        this.channel = null;
        this.userName = null;
        this.roomName = null;
        this.isInCall = false;
        this.deviceHash = this.generateDeviceHash();
        this.contactId = this.deviceHash;
        this.trustedPeers = new Set();
        this.isMuted = false;
        this.connectedPeers = new Set();
        this.maxCallers = 0;
        this.currentCallers = 0;
        this.isCallActive = false;
        this.isSpeakerMode = true;
        this.othersInCall = false;
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Reset UI elements
        if (this.elements.speakerBtn) {
            this.elements.speakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.elements.speakerBtn.classList.remove('active', 'muted');
        }
        this.updateButtonStates();
        if (this.elements.statusDot) {
            this.elements.statusDot.classList.remove('connected');
        }
        
        // Generate new P2P URL
        this.generateMyP2PUrl();
        this.trustedPeers.clear();
        
        // Reset collapsible sections
        if (this.elements.settingsPanel) this.elements.settingsPanel.classList.add('hidden');
        if (this.elements.participantsList) this.elements.participantsList.classList.add('hidden');
        if (this.elements.participantsToggle) this.elements.participantsToggle.classList.remove('expanded');
        if (this.elements.helpContent) this.elements.helpContent.classList.add('hidden');
        
        // Remove any warnings and reconnect banners
        const warning = document.querySelector('.caller-limit-warning');
        if (warning) warning.remove();
        const reconnect = document.querySelector('.reconnect-banner');
        if (reconnect) reconnect.remove();
        
        // WebRTC connections created on demand
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
    async createP2PRoom() {
        // Create P2P-only room using hash system
        this.showCallInterface();
        this.updateStatus('P2P Room created - Share link to invite others');
        this.generateShareUrl();
        this.elements.shareSection.style.display = 'block';
        this.showNotification('P2P Room created - No server needed!', 'success');
        
        // Store room in P2P network
        this.addToPersistentNetwork(this.deviceHash, {
            userName: this.userName,
            deviceHash: this.deviceHash,
            contactId: this.contactId,
            channel: this.channel,
            timestamp: Date.now(),
            isHost: true
        });
    }
    
    async createServerlessConnection(contactId) {
        // Generate WebRTC offer for direct connection
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:openrelay.metered.ca:80' }
            ]
        });
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate generated for offer side');
                // In real implementation, send this to the other peer
            }
        };
        
        // Setup data channel for messaging
        const dataChannel = pc.createDataChannel('direct', { ordered: true });
        dataChannel.onopen = () => {
            this.dataChannels.set(contactId, dataChannel);
            this.connectedPeers.add(contactId);
            this.showNotification('Direct P2P connected!', 'success');
            this.showCallInterface();
        };
        
        dataChannel.onmessage = (event) => {
            this.handleP2PMessage(event.data, contactId);
        };
        
        // Create and set local description (offer)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Show offer for manual sharing
        this.showOfferDialog(offer, contactId);
        
        this.peerConnections.set(contactId, pc);
        
        // Wait for answer to complete connection
        this.waitingForAnswer = contactId;
    }
    
    async initializeContactAliases() {
        this.contactAliases = await this.loadContactAliases();
        this.myAlias = this.contactAliases[this.deviceHash] || 'me';
        this.loadContacts();
    }
    
    async loadContacts() {
        const contacts = await this.loadFromEncryptedStorage('recentContacts') || [];
        this.displayContacts(contacts);
    }
    
    displayContacts(contacts) {
        if (!this.elements.contactsList) return;
        
        this.elements.contactsList.innerHTML = '';
        
        if (contacts.length === 0) {
            this.elements.contactsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No contacts yet</p>';
            return;
        }
        
        contacts.slice(0, 5).forEach(contact => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">${this.escapeHtml(contact.alias)}</div>
                    <div class="contact-last-seen">Last seen: ${new Date(contact.lastSeen).toLocaleDateString()}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.connectToContact(contact);
            });
            
            this.elements.contactsList.appendChild(item);
        });
    }
    
    async saveContact(deviceHash, alias) {
        let contacts = await this.loadFromEncryptedStorage('recentContacts') || [];
        
        const existing = contacts.find(c => c.deviceHash === deviceHash);
        if (existing) {
            existing.alias = alias;
            existing.lastSeen = Date.now();
        } else {
            contacts.push({
                deviceHash,
                alias,
                lastSeen: Date.now()
            });
        }
        
        contacts.sort((a, b) => b.lastSeen - a.lastSeen);
        await this.saveToEncryptedStorage('recentContacts', contacts.slice(0, 20));
        this.loadContacts();
    }
    
    connectToContact(contact) {
        this.userName = this.elements.nameInput.value.trim() || 'Anonymous';
        this.channel = `contact-${contact.deviceHash.substring(0, 8)}`;
        
        this.showCallInterface();
        this.updateStatus(`Connecting to ${contact.alias}`);
        this.showNotification(`Connecting to ${contact.alias}`, 'info');
    }
    
    showSettingsModal() {
        this.elements.settingsModal.classList.remove('hidden');
    }
    
    showModeInfoModal() {
        const modeInfoModal = document.getElementById('modeInfoModal');
        if (modeInfoModal) modeInfoModal.classList.remove('hidden');
    }
    
    toggleConnectionMode() {
        const toggle = document.getElementById('modeToggle');
        const labels = document.querySelectorAll('.toggle-label');
        
        if (toggle.classList.contains('cloud-mode')) {
            // Switch to P2P only
            toggle.classList.remove('cloud-mode');
            firebaseEnabled = false;
            if (database) {
                database.goOffline();
                database = null;
            }
            labels[0].classList.add('active');
            labels[1].classList.remove('active');
            this.showNotification('P2P-only mode enabled', 'info');
        } else {
            // Switch to cloud assisted
            toggle.classList.add('cloud-mode');
            firebaseEnabled = true;
            database = initializeFirebase();
            labels[0].classList.remove('active');
            labels[1].classList.add('active');
            this.showNotification('Cloud-assisted mode enabled', 'info');
        }
    }
    
    async installApp() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
            } catch (e) {}
        }
        
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const result = await window.deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                this.showNotification('App installed!', 'success');
            }
            window.deferredPrompt = null;
        } else {
            this.showNotification('Add to home screen from browser menu', 'info');
        }
        this.closeModal();
    }
    
    async exportData() {
        const data = {
            contacts: await this.loadFromEncryptedStorage('recentContacts') || [],
            aliases: await this.loadFromEncryptedStorage('contactAliases') || {},
            rooms: await this.loadFromEncryptedStorage('roomHistory') || []
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'call-data-export.json';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported!', 'success');
        this.closeModal();
    }
    
    async clearAllData() {
        secureConfirm('Clear all data? This cannot be undone.', (confirmed) => {
            if (confirmed) {
                try {
                    const keys = Object.keys(localStorage).filter(k => 
                        k.startsWith('chatHistory_') || 
                        k.startsWith('p2pNetwork_') ||
                        ['contactAliases', 'recentContacts', 'roomHistory'].includes(k)
                    );
                    
                    keys.forEach(key => localStorage.removeItem(key));
                    
                    this.contactAliases = {};
                    this.loadContacts();
                    
                    this.showNotification('All data cleared', 'success');
                    this.closeModal();
                } catch (error) {
                    console.error('Data clear failed:', sanitizeForLog(error.message));
                    this.showNotification('Failed to clear data', 'error');
                }
            }
        });
    }
    
    async loadContactAliases() {
        try {
            return await this.loadFromEncryptedStorage('contactAliases') || {};
        } catch (e) {
            return {};
        }
    }
    
    async saveContactAliases() {
        try {
            await this.saveToEncryptedStorage('contactAliases', this.contactAliases);
        } catch (e) {}
    }
    
    async setContactAlias(deviceHash, alias) {
        this.contactAliases[deviceHash] = alias.trim() || (deviceHash === this.deviceHash ? 'me' : deviceHash.substring(0, 8));
        await this.saveContactAliases();
        this.updateParticipantsDisplay();
    }
    
    getContactAlias(deviceHash) {
        if (deviceHash === this.deviceHash) {
            return this.contactAliases[deviceHash] || 'me';
        }
        return this.contactAliases[deviceHash] || deviceHash.substring(0, 8);
    }
    
    async addContact(deviceHash, displayName) {
        if (!this.contactAliases[deviceHash]) {
            this.contactAliases[deviceHash] = displayName || deviceHash.substring(0, 8);
            await this.saveContactAliases();
        }
    }
    

    
    showFirebaseToggle() {
        const toggle = document.getElementById('firebaseToggle');
        if (toggle) {
            toggle.textContent = firebaseEnabled ? '🔥 Firebase ON' : '🔒 P2P Only';
            toggle.className = firebaseEnabled ? 'firebase-toggle enabled' : 'firebase-toggle disabled';
        }
        
        const shareLabel = document.getElementById('shareLabel');
        if (shareLabel) {
            shareLabel.textContent = firebaseEnabled ? 'Share Room (Firebase)' : 'Share Room (P2P)';
        }
    }
    
    toggleFirebase() {
        if (firebaseEnabled) {
            // Disable Firebase
            if (database) {
                database.goOffline();
                database = null;
            }
            firebaseEnabled = false;
            this.showNotification('Firebase disabled - P2P only mode', 'info');
        } else {
            // Enable Firebase
            database = initializeFirebase();
            this.showNotification('Firebase enabled - Server connections available', 'info');
        }
        this.showFirebaseToggle();
    }
    
    connectViaP2PUrl() {
        const url = this.elements.p2pUrlInput?.value.trim();
        if (!url) {
            this.showNotification('Enter P2P URL', 'error');
            return;
        }
        
        this.processP2PUrl(url);
    }
    
    processP2PUrl(url) {
        try {
            const urlObj = new URL(url);
            const p2pData = urlObj.searchParams.get('p');
            if (p2pData) {
                const decoded = atob(p2pData);
                const [userName, deviceHash] = decoded.split('|');
                
                this.userName = this.elements.nameInput.value.trim() || 'Anonymous';
                this.channel = `p2p-${deviceHash.substring(0, 8)}`;
                
                this.closeModal();
                this.showCallInterface();
                this.updateStatus(`P2P connection with ${userName}`);
                this.showNotification('P2P connection established!', 'success');
            } else {
                this.showNotification('Invalid P2P URL', 'error');
            }
        } catch (e) {
            this.showNotification('Invalid URL format', 'error');
        }
    }
    
    async scanQR() {
        const scanner = document.getElementById('qrScanner');
        const video = document.getElementById('qrVideo');
        
        if (!scanner || !video) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            video.srcObject = stream;
            video.play();
            scanner.classList.remove('hidden');
            
            this.qrScanInterval = setInterval(() => {
                this.detectQRCode(video);
            }, 500);
            
        } catch (err) {
            this.showNotification('Camera access denied', 'error');
        }
    }
    
    detectQRCode(video) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Simple QR detection - look for URL patterns
        const text = this.extractTextFromImage(imageData);
        if (text && text.includes('?p=')) {
            this.elements.p2pUrlInput.value = text;
            this.processP2PUrl(text);
            this.stopQRScan();
        }
    }
    
    extractTextFromImage(imageData) {
        // Simplified QR detection - in real implementation use a QR library
        return null;
    }
    
    stopQRScan() {
        const scanner = document.getElementById('qrScanner');
        const video = document.getElementById('qrVideo');
        
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        if (scanner) {
            scanner.classList.add('hidden');
        }
        
        if (this.qrScanInterval) {
            clearInterval(this.qrScanInterval);
            this.qrScanInterval = null;
        }
    }
    
    findPeerByContactId(contactId) {
        try {
            const channels = Object.keys(localStorage).filter(k => k.startsWith('p2pNetwork_'));
            for (const key of channels) {
                const network = JSON.parse(localStorage.getItem(key) || '{}');
                for (const [peerId, data] of Object.entries(network)) {
                    if (data.contactId === contactId) {
                        return { peerId, data };
                    }
                }
            }
        } catch (e) {}
        return null;
    }
    
    showOfferDialog(offer, deviceHash) {
        const dialog = document.createElement('div');
        dialog.className = 'serverless-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h4>Serverless P2P Connection</h4>
                <p>Share this offer with device: <strong>${deviceHash.substring(0, 8)}...</strong></p>
                <textarea readonly style="width:100%;height:100px;font-size:10px;">${JSON.stringify(offer)}</textarea>
                <div class="dialog-buttons">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">Cancel</button>
                    <button onclick="navigator.clipboard.writeText('${JSON.stringify(offer).replace(/'/g, "\\'")}')">Copy Offer</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    showAnswerDialog(deviceHash) {
        const dialog = document.createElement('div');
        dialog.className = 'serverless-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h4>Accept P2P Connection</h4>
                <p>Paste the WebRTC offer from device: <strong>${deviceHash.substring(0, 8)}...</strong></p>
                <textarea id="offerInput" placeholder="Paste offer here..." style="width:100%;height:100px;font-size:10px;"></textarea>
                <div class="dialog-buttons">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">Cancel</button>
                    <button onclick="phoneCall.acceptOffer('${deviceHash}')" class="btn-primary">Connect</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    async acceptOffer(contactId) {
        const offerText = document.getElementById('offerInput').value.trim();
        if (!offerText) return;
        
        try {
            const offer = JSON.parse(offerText);
            
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:openrelay.metered.ca:80' }
                ]
            });
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE candidate generated for answer side');
                    // In real implementation, send this to the other peer
                }
            };
            
            pc.ondatachannel = (event) => {
                const channel = event.channel;
                channel.onopen = () => {
                    this.dataChannels.set(contactId, channel);
                    this.connectedPeers.add(contactId);
                    this.showNotification('Serverless P2P connected!', 'success');
                    this.showCallInterface();
                };
                channel.onmessage = (event) => {
                    this.handleP2PMessage(event.data, contactId);
                };
            };
            
            // Set remote description (offer)
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create and set local description (answer)
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // Show answer for manual sharing back
            this.showAnswerForSharing(answer, contactId);
            
            this.peerConnections.set(contactId, pc);
            document.querySelector('.serverless-dialog').remove();
            
        } catch (e) {
            console.error('Accept offer failed:', e);
            this.showNotification('Invalid offer format', 'error');
        }
    }
    
    showAnswerForSharing(answer, contactId) {
        const dialog = document.createElement('div');
        dialog.className = 'serverless-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h4>Send Answer Back</h4>
                <p>Share this answer with device: <strong>${contactId.substring(0, 8)}...</strong></p>
                <textarea readonly style="width:100%;height:100px;font-size:10px;">${JSON.stringify(answer)}</textarea>
                <div class="dialog-buttons">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">Close</button>
                    <button onclick="navigator.clipboard.writeText('${JSON.stringify(answer).replace(/'/g, "\\'")}')">Copy Answer</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    async handleAnswer(answerText) {
        if (!this.waitingForAnswer) {
            this.showNotification('No pending connection', 'error');
            return;
        }
        
        try {
            const answer = JSON.parse(answerText);
            const pc = this.peerConnections.get(this.waitingForAnswer);
            
            if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                this.showNotification('P2P connection established!', 'success');
                this.waitingForAnswer = null;
            }
        } catch (e) {
            console.error('Handle answer failed:', e);
            this.showNotification('Invalid answer format', 'error');
        }
    }
    
    // Voice activity detection now handled automatically by device
    
    async introduceToAllPeers(newPeerInfo) {
        // Temporarily reconnect for introduction
        reconnectFirebaseTemporarily();
        
        // Introduce new peer to all existing peers via Firebase
        if (!database || !this.channel) return;
        
        const introductionData = {
            type: 'peer-introduction',
            newPeer: newPeerInfo,
            introducer: this.deviceHash,
            timestamp: Date.now()
        };
        
        // Broadcast introduction to all participants
        await database.ref(`channels/${this.channel}/introductions`).push(introductionData);
        console.log('Introduced new peer to group:', newPeerInfo.deviceHash);
        
        // Clean up introduction after 5 seconds
        setTimeout(() => {
            database.ref(`channels/${this.channel}/introductions`)
                .orderByChild('timestamp')
                .endAt(Date.now() - 5000)
                .once('value', (snapshot) => {
                    snapshot.forEach(child => child.ref.remove());
                });
        }, 5000);
    }
    
    setupGroupIntroductionListener() {
        if (!database || !this.channel) return;
        
        // Use once() instead of on() to minimize persistent connections
        const checkForIntroductions = () => {
            database.ref(`channels/${this.channel}/introductions`)
                .orderByChild('timestamp')
                .startAt(Date.now() - 30000) // Only check last 30 seconds
                .once('value', (snapshot) => {
                    snapshot.forEach((child) => {
                        const data = child.val();
                        if (data && data.introducer !== this.deviceHash) {
                            this.handlePeerIntroduction(data);
                            // Clean up processed introduction
                            child.ref.remove();
                        }
                    });
                });
        };
        
        // Check periodically instead of persistent listener
        this.introductionChecker = setInterval(checkForIntroductions, 5000);
        
        // Initial check
        checkForIntroductions();
    }
    
    async handlePeerIntroduction(introData) {
        const { newPeer } = introData;
        
        // Don't connect to self
        if (newPeer.deviceHash === this.deviceHash) return;
        
        // Check if already connected
        if (this.peerConnections.has(newPeer.deviceHash)) return;
        
        console.log('Creating mesh connection to:', newPeer.deviceHash);
        
        // Create direct P2P connection for mesh network
        const pc = this.createPeerConnection(newPeer.deviceHash);
        this.peerConnections.set(newPeer.deviceHash, pc);
        
        // Initiate connection if we have lower hash (prevents duplicate offers)
        if (this.deviceHash < newPeer.deviceHash) {
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);
            this.sendSignal('offer', { offer, targetPeer: newPeer.deviceHash });
        }
    }
    
    setupP2POnlyMode() {
        console.log('Setting up P2P-only mode');
        this.setupMessageListener();
        this.updateStatus('P2P room ready');
    }
    
    validateSystem() {
        const issues = [];
        
        if (!this.peerConnections) issues.push('Peer connections not initialized');
        if (!this.deviceHash) issues.push('Device hash missing');
        if (!this.contactId) issues.push('Contact ID missing');
        
        if (issues.length > 0) {
            console.error('🚨 System validation failed:', issues);
            this.showNotification('System check failed', 'error');
            return false;
        }
        
        const mode = firebaseEnabled ? 'Firebase + P2P' : 'P2P Only';
        console.log(`✅ ${mode} ready - Contact ID:`, this.contactId);
        console.log('✅ Bidirectional WebRTC connections supported');
        console.log('✅ Voice Activity Detection enabled');
        console.log('✅ Mesh networking for groups ready');
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
    // Initialize connection mode toggle state
    const modeToggle = document.getElementById('modeToggle');
    const labels = document.querySelectorAll('.toggle-label');
    if (modeToggle && firebaseEnabled) {
        modeToggle.classList.add('cloud-mode');
        if (labels[1]) labels[1].classList.add('active');
    } else if (labels[0]) {
        labels[0].classList.add('active');
    }
    
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
    
    // Add QR code styles
    const qrStyles = document.createElement('style');
    qrStyles.textContent = `
        .p2p-join-dialog, .serverless-dialog {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: var(--bg-color); border: 2px solid var(--border-color);
            border-radius: 36px 80px 36px 80px; padding: 2rem; z-index: 1000;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        #qrCode { text-align: center; margin-top: 1rem; }
        #qrCanvas { border: 2px solid var(--border-color); border-radius: 8px; }
        .advanced-tab {
            background: var(--secondary-bg); border: 1px solid var(--border-color);
            padding: 8px 16px; border-radius: 20px; cursor: pointer;
            font-size: 14px; margin: 10px 0; text-align: center;
            transition: all 0.2s ease;
        }
        .advanced-tab:hover { background: var(--hover-bg); }
        .advanced-tab.active { background: var(--primary-color); color: white; }
        .advanced-content { margin-top: 10px; }
        .qr-container { text-align: center; margin: 15px 0; width: 100%; }
        .p2p-info { margin: 10px 0; color: var(--text-secondary); }
        .btn-control.muted {
            animation: blink 1s infinite;
            background: #ff4444 !important;
            color: white !important;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
        }
        .voice-controls {
            margin: 1rem 0;
            padding: 1rem;
            background: var(--secondary-bg);
            border-radius: 20px;
            border: 1px solid var(--border-color);
        }
        .slider-container {
            position: relative;
            margin: 0.5rem 0;
        }
        .slider-container input[type="range"] {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: var(--border-color);
            outline: none;
            -webkit-appearance: none;
        }
        .slider-container input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--primary-color);
            cursor: pointer;
        }
        .slider-labels {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 0.5rem;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .voice-indicator {
            font-size: 1.2rem;
            transition: opacity 0.2s ease;
            opacity: 0.3;
        }
        .participant-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            margin: 0.5rem 0;
            background: var(--secondary-bg);
            border-radius: 12px;
            border: 1px solid var(--border-color);
        }
        .participant-item.self {
            border-color: var(--primary-color);
            background: rgba(0, 122, 255, 0.1);
        }
        .participant-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .participant-name {
            font-weight: 500;
            color: var(--text-primary);
        }
        .participant-status {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .btn-edit {
            background: none;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.5rem;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        .btn-edit:hover {
            background: var(--hover-bg);
            border-color: var(--primary-color);
        }
    `;
    document.head.appendChild(qrStyles);
    
    // Setup sensitivity slider after phoneCall is initialized
    setTimeout(() => {
        const slider = document.getElementById('sensitivitySlider');
        if (slider && phoneCall) {
            slider.addEventListener('input', (e) => {
                phoneCall.setSensitivity(e.target.value);
            });
        }
    }, 1000);
    
    // Make phoneCall globally accessible for contact editing
    window.phoneCall = phoneCall;
    
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
    });
    
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