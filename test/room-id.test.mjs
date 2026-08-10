/**
 * Checks the new room-ID generator against every constraint the rest of the app puts on
 * it. The generator is a pure function returning an opaque string — nothing in the app
 * parses it back into parts (grepped: no `split('-')` anywhere) — so these constraints
 * are the whole contract, and satisfying them means nothing downstream can break.
 *
 *   npm test
 */

import { generateMemorableRoomId } from '../src/js/utils.js';

const N = 200000;
const failures = [];
const check = (name, ok, detail) => {
    if (!ok) failures.push(`${name}: ${detail}`);
};

// Firebase rejects these in a path key; `#`/`?` would also break the ?channel= share URL.
const FIREBASE_ILLEGAL = /[.$#[\]/]/;
const MAX_LENGTH = 20; // index.html: <input id="channelInput" maxlength="20">

const seen = new Map();
let longest = '';

for (let i = 0; i < N; i++) {
    const id = generateMemorableRoomId();
    if (id.length > longest.length) longest = id;

    check('length', id.length <= MAX_LENGTH, `"${id}" is ${id.length} > ${MAX_LENGTH}`);
    check('firebase-safe', !FIREBASE_ILLEGAL.test(id), `"${id}" contains a key-illegal character`);
    check('url-safe', encodeURIComponent(id) === id, `"${id}" changes under encodeURIComponent`);
    check('shape', /^[a-z]+-[a-z]+-[a-z2-9]{7}$/.test(id), `"${id}" does not match adj-noun-xxxxxxx`);
    check('no-ambiguous', !/[01lIoO]/.test(id.split('-')[2]), `"${id}" suffix has a look-alike character`);

    seen.set(id, (seen.get(id) || 0) + 1);
}

// Collisions. With 2.75e12 possible ids, 200k draws should essentially never repeat;
// a duplicate here would mean the entropy is not what the comment claims it is.
const duplicates = [...seen.entries()].filter(([, n]) => n > 1);
check('collisions', duplicates.length === 0, `${duplicates.length} duplicate(s) in ${N} draws`);

// Distribution of the suffix alphabet. Plain `% 31` on a random byte would make the
// first 8 letters ~3% more common; rejection sampling should leave them flat. A chi-square
// would be better, but a max-vs-min ratio catches the bias this is guarding against.
const counts = new Map();
for (const id of seen.keys()) {
    for (const ch of id.split('-')[2]) counts.set(ch, (counts.get(ch) || 0) + 1);
}
const frequencies = [...counts.values()];
const spread = Math.max(...frequencies) / Math.min(...frequencies);
check('uniform-suffix', spread < 1.1, `most/least common suffix character ratio is ${spread.toFixed(3)}`);

const space = 10 * 10 * Math.pow(31, 7);
console.log(`draws                 ${N.toLocaleString()}`);
console.log(`distinct ids          ${seen.size.toLocaleString()}`);
console.log(`longest id            "${longest}" (${longest.length} chars, limit ${MAX_LENGTH})`);
console.log(`alphabet used         ${counts.size} of 31 characters`);
console.log(`suffix max/min ratio  ${spread.toFixed(3)}`);
console.log(`id space              ${space.toExponential(2)}  (was 9,900)`);
console.log(`guessing at 1000/s    ${(space / 1000 / 60 / 60 / 24 / 365).toExponential(2)} years to exhaust`);
console.log();

if (failures.length) {
    console.error(`FAILED (${failures.length}):`);
    for (const f of failures.slice(0, 10)) console.error('  ' + f);
    process.exit(1);
}
console.log('all constraints hold');
