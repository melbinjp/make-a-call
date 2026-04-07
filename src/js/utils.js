/**
 * Sanitizes a string for HTML rendering.
 */
export const escapeHtml = (unsafe) => {
    return (unsafe || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * Generates a unique device hash for WebRTC signaling priority.
 */
export const generateDeviceHash = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Generates a memorable room ID.
 */
export const generateMemorableRoomId = () => {
    const adjectives = ['blue', 'red', 'green', 'happy', 'sunny', 'cool', 'fast', 'smart', 'bright', 'calm'];
    const nouns = ['cat', 'dog', 'bird', 'fish', 'tree', 'star', 'moon', 'rock', 'wave', 'fire'];
    const numbers = Math.floor(Math.random() * 99) + 1;

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj}-${noun}-${numbers}`;
};

/**
 * Debounce function for performance optimization.
 */
export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
