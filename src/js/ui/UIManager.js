import { escapeHtml } from '../utils.js';

/**
 * Handles all DOM manipulations, notifications, and UI states.
 */
export class UIManager {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.elements.joinBtn.addEventListener('click', () => this.callbacks.onJoin());
        this.elements.quickCallBtn.addEventListener('click', () => this.callbacks.onQuickCall());
        this.elements.copyBtn.addEventListener('click', () => this.callbacks.onCopy());
        this.elements.startCallBtn.addEventListener('click', () => this.callbacks.onStartCall());
        this.elements.endCallBtn.addEventListener('click', () => this.callbacks.onEndCall());
        this.elements.sendMessageBtn.addEventListener('click', () => this.callbacks.onSendMessage());
        
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.callbacks.onSendMessage();
        });
    }

    showCallInterface() {
        this.elements.callSetup.classList.add('hidden');
        this.elements.callInterface.classList.remove('hidden');
    }

    showCallSetup() {
        this.elements.callInterface.classList.add('hidden');
        this.elements.callSetup.classList.remove('hidden');
    }

    updateStatus(message) {
        this.elements.callStatus.textContent = message;
    }

    updateParticipantCount(current, max) {
        this.elements.callerCount.textContent = current;
        this.elements.maxCallerCount.textContent = max === 0 ? '∞' : max;
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
        requestAnimationFrame(() => toast.classList.add('toast-show'));

        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    renderParticipants(participants) {
        this.elements.participantsList.innerHTML = '';
        Object.entries(participants).forEach(([name, data]) => {
            const div = document.createElement('div');
            div.className = 'participant-item';
            div.innerHTML = `
                <span class="participant-name">${escapeHtml(name)}</span>
                <span class="participant-status">${data.inCall ? 'In Call' : 'Online'}</span>
            `;
            this.elements.participantsList.appendChild(div);
        });
    }

    updateButtonStates(isCallActive, othersInCall) {
        const startBtn = this.elements.startCallBtn;
        const endBtn = this.elements.endCallBtn;

        if (isCallActive) {
            startBtn.textContent = '📞 In Call';
            startBtn.classList.add('active');
            endBtn.textContent = '📵 End Call';
            endBtn.classList.add('active');
        } else if (othersInCall) {
            startBtn.textContent = '📞 Join Call';
            startBtn.classList.remove('active');
            endBtn.textContent = '🚪 Leave Room';
            endBtn.classList.remove('active');
        } else {
            startBtn.textContent = '📞 Start Call';
            startBtn.classList.remove('active');
            endBtn.textContent = '🚪 Leave Room';
            endBtn.classList.remove('active');
        }
    }
}
