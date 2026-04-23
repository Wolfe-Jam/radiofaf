#!/usr/bin/env node
// Validate /Users/wolfejam/FAF/radiofaf/characters.js against the locked schema.
// Run standalone: `node scripts/validate-characters.js`
// Used by scripts/test-systems.sh as SCHEMA-1.
//
// Exit code: 0 = all valid, 1 = at least one violation (details printed).

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CHARACTERS_PATH = path.resolve(__dirname, '..', 'characters.js');

const REQUIRED = [
  'id', 'name', 'color', 'archetype', 'bio', 'catchphrase',
  'provider', 'voice_id', 'type', 'status',
  'personality', 'quirks', 'likes', 'dislikes',
];

const PROVIDERS = new Set(['xai', 'elevenlabs', 'custom', 'clone', 'live', 'silent']);
const TYPES     = new Set(['house', 'persona', 'guest', 'custom', 'famous', 'caller']);
const STATUSES  = new Set(['active', 'paused', 'retired', 'one-shot']);
const MODES     = new Set(['voice', 'whisper', 'text', 'sfx', 'silent']);
const DISCLOSURES = new Set(['real', 'clone', 'composite']);

function loadCharacters() {
  const src = fs.readFileSync(CHARACTERS_PATH, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'characters.js' });
  if (!sandbox.window.RADIOFAF_CHARACTERS) {
    throw new Error('characters.js did not assign window.RADIOFAF_CHARACTERS');
  }
  return sandbox.window;
}

function main() {
  const errors = [];
  let win;
  try {
    win = loadCharacters();
  } catch (e) {
    console.error(`FAIL: could not load characters.js — ${e.message}`);
    process.exit(1);
  }

  const chars = win.RADIOFAF_CHARACTERS;
  const ids = Object.keys(chars);

  // SCHEMA-A: required fields present + non-empty
  for (const id of ids) {
    const c = chars[id];
    for (const field of REQUIRED) {
      if (c[field] === undefined || c[field] === null || c[field] === '') {
        // voice_id is allowed null when provider is live or silent
        if (field === 'voice_id' && (c.provider === 'live' || c.provider === 'silent')) continue;
        errors.push(`${id}: missing required field "${field}"`);
      }
    }
    // arrays must actually be arrays + non-empty
    for (const arr of ['quirks', 'likes', 'dislikes']) {
      if (c[arr] !== undefined && (!Array.isArray(c[arr]) || c[arr].length === 0)) {
        errors.push(`${id}: "${arr}" must be a non-empty array`);
      }
    }
  }

  // SCHEMA-B: provider/type/status are valid enums
  for (const id of ids) {
    const c = chars[id];
    if (c.provider && !PROVIDERS.has(c.provider)) {
      errors.push(`${id}: invalid provider "${c.provider}" (allowed: ${[...PROVIDERS].join('|')})`);
    }
    if (c.type && !TYPES.has(c.type)) {
      errors.push(`${id}: invalid type "${c.type}" (allowed: ${[...TYPES].join('|')})`);
    }
    if (c.status && !STATUSES.has(c.status)) {
      errors.push(`${id}: invalid status "${c.status}" (allowed: ${[...STATUSES].join('|')})`);
    }
  }

  // SCHEMA-C: optional output_modes contains only known modes
  for (const id of ids) {
    const c = chars[id];
    if (c.output_modes !== undefined) {
      if (!Array.isArray(c.output_modes) || c.output_modes.length === 0) {
        errors.push(`${id}: "output_modes" must be a non-empty array if present`);
      } else {
        for (const m of c.output_modes) {
          if (!MODES.has(m)) errors.push(`${id}: invalid output_mode "${m}"`);
        }
      }
    }
    if (c.disclosure !== undefined && !DISCLOSURES.has(c.disclosure)) {
      errors.push(`${id}: invalid disclosure "${c.disclosure}" (allowed: ${[...DISCLOSURES].join('|')})`);
    }
  }

  // SCHEMA-D: id field equals key (no drift between map key and entry.id)
  for (const id of ids) {
    if (chars[id].id !== id) {
      errors.push(`${id}: entry.id="${chars[id].id}" does not match map key "${id}"`);
    }
  }

  // SCHEMA-E: persona refs (performed_by) point to a real character
  for (const id of ids) {
    const c = chars[id];
    if (c.performed_by && !chars[c.performed_by]) {
      errors.push(`${id}: performed_by="${c.performed_by}" does not exist in registry`);
    }
  }

  // SCHEMA-F: house cast invariants (the 5 IDs must all be present + active)
  const houseExpected = ['leo', 'sal', 'ara', 'rex', 'eve'];
  for (const hid of houseExpected) {
    if (!chars[hid]) errors.push(`HOUSE: required character "${hid}" missing`);
    else if (chars[hid].type !== 'house') errors.push(`HOUSE: "${hid}" must have type="house"`);
    else if (chars[hid].status !== 'active') errors.push(`HOUSE: "${hid}" must be active`);
  }

  // SCHEMA-G: helpers exposed
  const helpers = win.RADIOFAF_CHARACTER_HELPERS;
  if (!helpers) errors.push('HELPERS: window.RADIOFAF_CHARACTER_HELPERS is missing');
  else {
    for (const fn of ['houseCast', 'byType', 'get', 'resolveVoice']) {
      if (typeof helpers[fn] !== 'function') errors.push(`HELPERS: ${fn}() missing`);
    }
  }

  if (errors.length === 0) {
    console.log(`OK: ${ids.length} characters, schema valid`);
    process.exit(0);
  }

  console.error(`FAIL: ${errors.length} schema violation(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

main();
