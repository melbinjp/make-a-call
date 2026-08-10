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
 * Alphabet for the random part of a room ID.
 *
 * No `0/O`, no `1/l/I` — these IDs get read aloud and typed by hand, and a character
 * pair nobody can distinguish turns into a support problem. Also excludes every
 * character Firebase forbids in a path key (`.`, `$`, `#`, `[`, `]`, `/`).
 */
const ROOM_ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'; // 31 characters

/**
 * Generates a memorable room ID.
 *
 * The room ID is the only thing protecting a room: `database.rules.json` grants read
 * and write on `channels/$channelId` to anyone, and the app signs nobody in, so anyone
 * who can name a room is inside it. The in-app "Room Access Request" dialog gates this
 * client's join flow, not the data.
 *
 * The previous version drew from 10 adjectives, 10 nouns and a number from 1 to 99 —
 * **9,900 possible rooms in total**, enumerable in seconds by anyone who read this file.
 * The memorable shape is worth keeping (you can say "blue-cat" down a phone line), so it
 * stays, and seven random characters are appended to it.
 *
 *   10 x 10 x 31^7  =  2.75e12 combinations, versus 9,900.
 *
 * `crypto.getRandomValues` rather than `Math.random`: `Math.random` is not a
 * cryptographic generator, its output is predictable from previous outputs in most
 * engines, and it is the wrong tool for a value that is acting as a secret. There is
 * deliberately no `Math.random` fallback — a silent downgrade to weak randomness is
 * worse than a loud failure, and `crypto` has been present in every browser this app
 * supports for a decade.
 *
 * Rejection sampling rather than `% 31`: 256 is not a multiple of 31, so the plain
 * modulo makes the first eight letters of the alphabet about 3% more likely than the
 * rest. It would not matter much here. It costs three lines to not have to argue about.
 */
export const generateMemorableRoomId = () => {
    const adjectives = ['blue', 'red', 'green', 'happy', 'sunny', 'cool', 'fast', 'smart', 'bright', 'calm'];
    const nouns = ['cat', 'dog', 'bird', 'fish', 'tree', 'star', 'moon', 'rock', 'wave', 'fire'];

    const pick = (list) => list[randomBelow(list.length)];

    let suffix = '';
    while (suffix.length < 7) {
        suffix += ROOM_ID_ALPHABET[randomBelow(ROOM_ID_ALPHABET.length)];
    }

    // Longest possible: 'bright' + '-' + 'fish' + '-' + 7 = 19 characters, which fits the
    // maxlength="20" on the room input in index.html. Anything longer would be silently
    // truncated on paste and produce a room nobody else can reach.
    return `${pick(adjectives)}-${pick(nouns)}-${suffix}`;
};

/**
 * A uniformly distributed integer in [0, limit), from the platform CSPRNG.
 */
const randomBelow = (limit) => {
    const source = (globalThis.crypto || globalThis.msCrypto);
    const ceiling = Math.floor(256 / limit) * limit; // largest unbiased multiple
    const byte = new Uint8Array(1);
    let value;
    do {
        source.getRandomValues(byte);
        value = byte[0];
    } while (value >= ceiling);
    return value % limit;
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
