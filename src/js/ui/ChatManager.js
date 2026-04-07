import { escapeHtml } from '../utils.js';

/**
 * Handles chat messaging, P2P data exchange, and Pretext-optimized layout.
 */
export class ChatManager {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks; // onSendMessage
        this.pretextContainer = elements.messagesList;
        
        // Initialize Pretext if available
        if (window.Pretext) {
            this.layout = window.Pretext.prepare(this.pretextContainer, {
                rowHeight: 40, // Estimated
                padding: 10
            });
        }
    }

    displayMessage(sender, text, isMe = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isMe ? 'me' : 'others'}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-sender">${escapeHtml(sender)}</div>
            <div class="message-content">
                <div class="message-bubble">${escapeHtml(text)}</div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        this.elements.messagesList.appendChild(messageDiv);
        this.elements.messagesList.scrollTop = this.elements.messagesList.scrollHeight;
        
        // Trigger Pretext layout update if available
        if (this.layout) {
            this.layout.update();
        }
    }

    handleP2PMessage(peerId, data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'chat') {
                this.displayMessage(parsed.sender, parsed.text, false);
            }
        } catch (e) {
            console.error('Failed to parse P2P message:', e);
        }
    }
}
