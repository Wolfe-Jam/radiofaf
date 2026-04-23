// RadioFAF — Character Registry
// =============================================================================
// Single source of truth for every voice that has appeared (or will appear)
// on RadioFAF.
//
// USAGE
//   <script src="/characters.js"></script>
//   const rex = window.RADIOFAF_CHARACTERS.rex;
//   const houseCast = Object.values(window.RADIOFAF_CHARACTERS).filter(c => c.type === 'house');
//
// DESIGN
//   Properties decouple identity (id) from presentation (name, color),
//   personality (archetype, bio, catchphrase), and synthesis (provider,
//   voice_id). This lets us:
//     - Swap a character's provider (xAI Grok → ElevenLabs clone) without
//       touching anywhere they're referenced.
//     - Add guest voices (one-off or recurring) without polluting the house cast.
//     - Add CUSTOM cloned voices (user-uploaded, for personalized episodes).
//     - Add FAMOUS voices (licensed celebrity TTS) when those land.
//     - Retire a voice without deleting their lore/episodes-they-appeared-in.
//
// FUTURE (do NOT add until needed)
//   - Move to MCPaaS KV (mcp_radiofaf_characters:*) once user-customizable
//     rosters become a feature
//   - Add `episodes_appeared: [12, 13]` field for cross-link analytics
//   - Add `avatar_url` for hero/share-card images per character
//   - Add `pronoun` for inclusive copy generation
//
// =============================================================================

window.RADIOFAF_CHARACTERS = {

  // -------------------------------------------------------------------------
  // HOUSE CAST — the 5 voices that appear in every episode
  // -------------------------------------------------------------------------

  leo: {
    id: 'leo',
    name: 'LEO',
    color: '#00D4D4',                    // cyan
    archetype: 'The Standards Champion',
    bio: 'Measured, principled, calm authority. Never raises voice. Wins with logic.',
    catchphrase: "Build it right or don't build it.",
    provider: 'xai',
    voice_id: 'Leo',
    type: 'house',
    status: 'active',
  },

  sal: {
    id: 'sal',
    name: 'SAL',
    color: '#D97706',                    // burnt orange
    archetype: 'The Hype Detector',
    bio: 'Cynical, sharp, dry humor. Calls BS on everything overhyped. One-liners that deflate arguments.',
    catchphrase: 'Cool. Now show me the receipts.',
    provider: 'xai',
    voice_id: 'Sal',
    type: 'house',
    status: 'active',
  },

  ara: {
    id: 'ara',
    name: 'ARA',
    color: '#4285F4',                    // blue
    archetype: 'The Roaster (also Nelly\'s voice slot)',
    bio: 'Optimist with teeth. Laughs, then drops truth bombs. Doubles as the voice slot for Nelly the DJ between segments.',
    catchphrase: 'I love this for us.',
    provider: 'xai',
    voice_id: 'Ara',
    type: 'house',
    status: 'active',
    // The Ara voice is shared with NELLY (the DJ host persona). When the brief
    // says "as NELLY" the voice slot is still 'ara' but the character framing
    // shifts to warm DJ + vinyl crackle + reverb. Nelly is not a separate voice
    // — she's a persona Ara performs.
  },

  rex: {
    id: 'rex',
    name: 'REX',
    color: '#FFD700',                    // gold (was green; swapped 2026-04-22 — too close to Leo cyan)
    archetype: 'The Shipper',
    bio: 'Loud, impatient, bias-to-action. Interrupts. Talks over people. Ships first, iterates later.',
    catchphrase: 'Ship it. Fix it later.',
    provider: 'xai',
    voice_id: 'Rex',
    type: 'house',
    status: 'active',
  },

  eve: {
    id: 'eve',
    name: 'EVE',
    color: '#7C3AED',                    // purple
    archetype: 'The Dev Voice',
    bio: 'Practical, slightly frustrated, grounded. Cuts through theory with real-world experience. Represents the person actually building.',
    catchphrase: 'I just want it to work.',
    provider: 'xai',
    voice_id: 'Eve',
    type: 'house',
    status: 'active',
  },

  // -------------------------------------------------------------------------
  // PERSONAS — characters performed by an existing voice slot
  // (separate entry so they can be referenced by name in briefs / UI without
  // confusing the voice mapping)
  // -------------------------------------------------------------------------

  nelly: {
    id: 'nelly',
    name: 'NELLY',
    color: '#E91E9E',                    // pink (brand mascot)
    archetype: 'DJ Host — the elephant who never forgets',
    bio: 'Warm, booming DJ energy with vinyl crackle and deep reverb. Originally the canonical mascot of faf-cli. Hired by RadioFAF to host the broadcast — opens the show, bridges segments, lands the wisdom. Has welcomed guests on-air.',
    catchphrase: 'Always remember… I never forget.',
    provider: 'xai',
    voice_id: 'Ara',                     // performed via Ara's voice slot
    type: 'persona',                     // not a standalone voice — a persona ON ara
    status: 'active',
    performed_by: 'ara',                 // forward pointer: "this persona uses voice id..."
    home: 'faf-cli',                     // origin lore
  },

  // -------------------------------------------------------------------------
  // GUESTS — characters that have appeared but are not house cast
  // -------------------------------------------------------------------------

  slash: {
    id: 'slash',
    name: '/SLASH',
    color: '#84FF00',                    // lime (Slash brand)
    archetype: 'The Departure Gate (in cape and visor)',
    bio: 'The Prevent/Route/Pass routing engine personified. Silver suit, red cape, lightning bolt. Made an on-air appearance on EP12 (The Token Tax). Slash IS the call RadioFAF makes every episode — same answer, 27× cheaper.',
    catchphrase: 'Prevent. Route. Pass.',
    provider: 'xai',
    voice_id: 'Rex',                     // tentative — re-cast if needed for future appearances
    type: 'guest',
    status: 'active',
    appearances: [12],                   // episode numbers
  },

  // -------------------------------------------------------------------------
  // FUTURE SLOTS (commented examples — uncomment when each lands)
  // -------------------------------------------------------------------------

  // grok: {
  //   id: 'grok', name: 'GROK', color: '#000000',
  //   archetype: 'The chatty model that suggested the topic',
  //   provider: 'xai', voice_id: 'Grok', // when xAI ships a "Grok" voice persona
  //   type: 'guest', status: 'active',
  //   appearances: [6], // EP6 SOULS DON'T RESET — topic by @grok
  // },

  // wolfejam_clone: {
  //   id: 'wolfejam_clone', name: 'JAMES (clone)', color: '#FF4400',
  //   archetype: 'The founder, on-air',
  //   provider: 'elevenlabs', voice_id: 'wolfejam-clone-001',
  //   type: 'custom', status: 'active',
  // },

};

// -------------------------------------------------------------------------
// HELPERS — convenience accessors so callers don't reinvent filtering
// -------------------------------------------------------------------------

window.RADIOFAF_CHARACTER_HELPERS = {
  /** Active house cast in display order. */
  houseCast() {
    const order = ['leo', 'sal', 'ara', 'rex', 'eve'];
    return order
      .map(id => window.RADIOFAF_CHARACTERS[id])
      .filter(c => c && c.status === 'active');
  },

  /** All active characters of a given type. */
  byType(type) {
    return Object.values(window.RADIOFAF_CHARACTERS).filter(
      c => c.type === type && c.status === 'active'
    );
  },

  /** Look up by id, with a forgiving fallback. */
  get(id) {
    return window.RADIOFAF_CHARACTERS[id] || null;
  },

  /** Resolve voice mapping: returns { provider, voice_id } even for personas. */
  resolveVoice(id) {
    const c = window.RADIOFAF_CHARACTERS[id];
    if (!c) return null;
    if (c.performed_by) {
      const performer = window.RADIOFAF_CHARACTERS[c.performed_by];
      return performer ? { provider: performer.provider, voice_id: performer.voice_id } : null;
    }
    return { provider: c.provider, voice_id: c.voice_id };
  },
};
