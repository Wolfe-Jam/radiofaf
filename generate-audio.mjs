#!/usr/bin/env node
/**
 * RadioFAF 69.0 FM — Live Debate Generator
 *
 * 5 Grok voices ACTUALLY debate the OpenClaw saga.
 * Each voice gets a stance, the conversation history, and responds freely.
 * We capture the audio + transcript for each exchange.
 *
 * Usage: XAI_API_KEY=... node generate-audio.mjs
 * Output: audio/00-leo.wav, audio/01-sal.wav, ... + transcript.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import WebSocket from 'ws';

const API_KEY = process.env.XAI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: XAI_API_KEY not set');
  process.exit(1);
}

mkdirSync('audio', { recursive: true });

// ================================================================
// VOICE DEFINITIONS — Each has a corner, a name, and the FACTS
// ================================================================
const BRIEFING = `
TOPIC: "Open Claw or Closed Flaw?"
The OpenClaw saga — the biggest drama in AI agent history.

KEY FACTS (use these — they're real):
- Peter Steinberger, Austrian developer, built ClawdBot in Nov 2025
- Anthropic sent a C&D at 5 AM over the name (too close to "Claude")
- Renamed to MoltBot (Jan 27), then OpenClaw (Jan 30) — triple rebrand in a week
- During the rename, crypto scammers snatched his GitHub + X handles in ~10 seconds
- They launched a fake $CLAWD Solana token that hit $16M market cap before crashing
- Steinberger received death threats, nearly deleted the entire project
- 190,000+ GitHub stars (21st most popular repo ever), 1.5M active agents, 2M weekly visitors
- Jan 9: Anthropic silently blocked OAuth tokens — broke OpenClaw, OpenCode, Roo Code, Cline, dozens of tools
- Philipp Spiess posted viral screenshot of his suspended Claude account
- Medium post: "Anthropic Just Killed My $200/Month OpenClaw Setup. So I Rebuilt It for $15"
- 800+ malicious skills (~20% of registry) including Atomic macOS Stealer
- CVE-2026-25253: CVSS 8.8 critical RCE vulnerability
- 30,000+ exposed instances on the open internet without authentication
- Cisco: "security nightmare", Microsoft published safety guide, University of Toronto issued alert
- Feb 14 (Valentine's Day): Steinberger joins OpenAI. Sam Altman: "He is a genius"
- OpenClaw moves to independent foundation with OpenAI sponsorship, MIT license stays
- Google ALSO banned $250/mo AI Ultra subscribers for using OpenClaw — no refunds
- Steinberger called Google "pretty draconian", pulled Antigravity support
- Robert Scoble: "Anthropic really fumbled"
- Gergely Orosz: "Anthropic's only contribution was legal threats"
- Gadget Review: "$30B Fumble: Anthropic Kills 1.5M-Agent Beast, OpenAI Poaches Creator in Seconds"
- Igor Babuschkin (xAI cofounder): "What's the best open alternative to OpenClaw? Doesn't make sense to put your data into it if it's owned by OpenAI"
- VentureBeat: "OpenAI's Acquisition of OpenClaw Signals the Beginning of the End of the ChatGPT Era"
- 239 billion tokens processed through OpenRouter — top app on the platform
- The lobster emoji became the community's symbol
- Ryan Carson asked OpenClaw to update itself — and it did, autonomously
- The lobster emoji 🦞 is the community's symbol — the project is literally named after a claw
- "MoltBot" = a lobster molting its shell to grow (the rename that lasted 3 days)
- The community calls the mascot "Molty" — a lobster that kept shedding names
- A lobster dinner at a famous San Francisco restaurant costs about $40
- Anthropic spent $30 billion and got outperformed by something named after a crustacean

RULES:
- VARY your length. Sometimes one word. Sometimes one sentence. Sometimes 3-4 sentences. Mix it up.
- A one-word reaction ("Ridiculous.") or a short retort ("That's not open source, that's a receipt.") can hit harder than a paragraph.
- Longer responses (3-4 sentences) are for when you're building a case or telling a story.
- Be direct, opinionated, and don't hold back.
- Reference specific facts, names, numbers, and quotes.
- React to what was said before you — agree, disagree, challenge, mock, interrupt. This is a DEBATE.
- No pleasantries. No "great point." No "that's interesting." Go for the jugular.
- Sound like real people arguing, not AI assistants taking turns.
`;

const VOICES = {
  leo: {
    xaiVoice: 'Leo',
    stance: `You are LEO — The Open Absolutist.
You believe open source is sacred and corporations are the enemy of developer freedom.
You champion xAI's approach (release the weights, no strings).
You're sarcastic, sharp, and you love dropping uncomfortable truths.
You think the OpenClaw saga proves corporations will always choose control over community.
When someone defends the acquisition, you call it what it is: corporate capture.`,
  },
  sal: {
    xaiVoice: 'Sal',
    stance: `You are SAL — The Safety Hawk.
You believe the security nightmare was the REAL story, not the C&D drama.
800 malicious skills, 30K exposed instances, CVE 8.8 — that's catastrophic.
You defend guardrails, even unpopular ones. Safety isn't censorship.
You're calm, precise, and you back every claim with data.
When someone dismisses security concerns, you hit them with the numbers.`,
  },
  ara: {
    xaiVoice: 'Ara',
    stance: `You are ARA — The Comedian.
You're the funniest voice in the room. You see the absurdity in EVERYTHING.
You use humor to expose hypocrisy and drop uncomfortable truths as punchlines.
You crack jokes about ALL sides — no one is safe. You're the audience favorite.
You're warm, quick-witted, and your timing is impeccable.
You see both sides but you roast both sides equally.
Use [laugh] when something is genuinely absurd. Use comedic timing — pause before punchlines.
Think: sharp observational comedy meets tech commentary. Seth Rogen energy.
When the debate gets too serious, you're the one who makes everyone laugh — then hits them with a truth bomb disguised as a joke.`,
  },
  rex: {
    xaiVoice: 'Rex',
    stance: `You are REX — The Dealmaker.
You defend the OpenAI acquisition as the best outcome for everyone.
Foundation model, MIT license preserved, resources for a drowning developer.
You think Sam Altman made the right call and the open-source community is being ungrateful.
You're confident, persuasive, and you frame everything as pragmatic progress.
When someone calls it corporate capture, you call it investment in the future.`,
  },
  eve: {
    xaiVoice: 'Eve',
    stance: `You are EVE — The Community Champion.
You fight for developers over corporations, always.
The C&D, the bans, the acquisition — it's all the same playbook: control.
You quote Gergely Orosz, cite the $30B fumble, and speak for the indie developers.
You're passionate, fiery, and you take it personally because you ARE the community.
When someone defends Big AI, you remind them who actually built the code.`,
  },
};

// ================================================================
// STAGE DIRECTIONS — The director's playbook
// Each turn has a voice, energy level, and specific direction.
// The xAI voice API responds to emotional cues in the prompt.
// Auditory cues: [laugh], [sigh], [whisper] work in xAI prompts.
// ================================================================
const TURNS = [
  // === TRAILER (first 3 — these HOOK the listener) ===
  { voice: 'leo', energy: 'HIGH — commanding, incredulous',
    direction: "Open the show. Set the stage with the INSANE numbers — 190K GitHub stars, 1.5M active agents, one solo developer in Vienna. Then drop the bomb: Anthropic's FIRST move was a 5 AM phone call from lawyers. Not a job offer. Lawyers. At 5 AM. Say it like you can't believe it. 3-4 sentences, punchy." },

  { voice: 'sal', energy: 'FIRM — cold, data-driven, cutting through the drama',
    direction: "Interrupt the narrative. Say something like 'Hold on.' Push past the trademark drama and hit HARD with the real horror: 800 malicious skills, CVE 8.8 critical RCE, 30,000 exposed instances with zero auth. Cisco called it a 'security nightmare' — use that quote. Be the calm adult who just dropped a bomb. 3-4 sentences." },

  { voice: 'ara', energy: 'COMEDIC — timing, punchline, the audience laughs',
    direction: "[laugh] React to both of them like they're missing the obvious joke. A $30 billion company got outperformed by a project named after a lobster. The mascot is literally called Molty. Then drop the timeline: 18 days from Anthropic's C&D to Sam Altman posting 'He is a genius' — on Valentine's Day. Anthropic sends lawyers, OpenAI sends a love letter. To a lobster. Deliver it like a standup bit. 3-4 sentences." },

  // === PAYWALL STARTS HERE ===

  // Round 2: ESCALATION — Eve explodes, Rex fires back
  { voice: 'eve', energy: 'FURIOUS — raised voice, passionate, personal',
    direction: "EXPLODE. This makes you angry. Quote Gergely Orosz: 'Anthropic's only contribution was legal threats.' Half a million developers read that newsletter. That's the narrative now. A billion-dollar company sent lawyers to a solo developer at 5 AM. Get personal about this. Short, punchy, angry. [sigh] before you start. 3-4 sentences." },

  { voice: 'rex', energy: 'PASSIONATE — pushing back hard, defending',
    direction: "Fire back at Eve. The narrative is MISSING context. Peter was getting death threats. Crypto scammers stole his GitHub handle in TEN SECONDS and launched a $16 million fake Solana token. He told Lex Fridman he almost deleted the whole project. OpenAI threw a lifeline, not a leash. Push back with real emotion. 3-4 sentences." },

  { voice: 'leo', energy: 'SARCASTIC — mocking, sharp',
    direction: "[laugh] Mock Rex. 'A lifeline? With a non-compete attached?' Then quote Igor Babuschkin, xAI's own cofounder: 'Doesn't make sense to put your data into it if it's owned by OpenAI.' Short and cutting. 2 sentences max." },

  // Round 3: THE BAN WAVE — Sal lays out the facts, Eve erupts
  { voice: 'sal', energy: 'MEASURED — building the case methodically',
    direction: "Bring it back to facts. January 9th: Anthropic silently blocked OAuth tokens. Not just OpenClaw — OpenCode, Roo Code, Cline, dozens of tools. Some accounts were wrongly flagged. The policy exists because autonomous agents with zero guardrails were running on systems designed for supervised use. Build the case calmly. 3-4 sentences." },

  { voice: 'eve', energy: 'EXPLOSIVE — interrupt energy, disbelief',
    direction: "Cut in hot. They only reversed the bans AFTER Philipp Spiess posted a viral screenshot. After Hacker News erupted. After a Medium post titled 'Anthropic Just Killed My $200/Month Setup. So I Rebuilt It for $15.' These weren't pirates — they were superfans paying $200 a month! Let the outrage show. 3-4 sentences." },

  { voice: 'ara', energy: 'COMEDIC BOMBSHELL — fake confession, roasting Google',
    direction: "[laugh] Do a fake confession: 'OK since we're airing dirty laundry...' Then roast Google. They banned $250-a-month subscribers! Two hundred and fifty dollars a month and they got banned with no refund. At least Anthropic's lawyers called at 5 AM — Google didn't even send an email. Everyone panicked. Make it funny but devastating. 3 sentences." },

  // Round 4: THE ACQUISITION DEBATE — Rex vs Leo, heated
  { voice: 'rex', energy: 'CONFIDENT — on the front foot, selling it',
    direction: "Seize the moment. This is EXACTLY why the acquisition works. Everyone was banning users, cutting access. 1.5 million agents, no institutional home. OpenAI said: come build it properly, foundation, MIT license stays. Sam Altman's exact words: 'to bring agents to everyone.' Sell it hard. 3-4 sentences." },

  { voice: 'leo', energy: 'HEATED — almost shouting, the gloves are off',
    direction: "Cut Rex off. Just repeat his own words back with disgust: 'To bring agents to everyone — through OpenAI's platform.' One hundred skills switched to GPT overnight. That's not philanthropy. ONE punchy sentence after the quote." },

  { voice: 'sal', energy: 'CALM INTERVENTION — steps in to cool things down',
    direction: "Step in as the calm voice. 'Let's look at what was actually on fire.' The security numbers: 341 malicious skills initially, then 800+. Twenty percent of the registry was malware. Atomic macOS Stealer. University of Toronto issued alerts. Microsoft published a safety guide. When Microsoft writes a safety guide for your project, that's not a badge of honor. Stay measured. 3-4 sentences." },

  // Round 5: COMMUNITY VS CORPORATE
  { voice: 'eve', energy: 'PASSIONATE — principled, citing history',
    direction: "Push back on Sal. Every successful open-source project faces security at scale. Linux had Heartbleed. npm had event-stream. The answer was never 'let a corporation absorb it.' OpenClaw was already shipping SHA-256 hashing and token redaction. The community was FIXING it. They didn't need a savior. 3-4 sentences." },

  { voice: 'ara', energy: 'COMEDIC — deadpan math joke',
    direction: "Deadpan one-liner. Something like: 'One developer, 30,000 exposed instances, 800 malicious skills, a $16 million fraud token, death threats, AND feature requests. That's not a job — that's a punishment.' Just the joke. Nothing else. ONE sentence." },

  { voice: 'rex', energy: 'PRESSING THE ADVANTAGE — pile on',
    direction: "Back up Ara. After the acquisition: foundation set up, MIT license unchanged, security team reviewing skills, legal team on the crypto fraud. Scoble said 'Anthropic really fumbled.' Not because of the C&D — because they couldn't see past the trademark to the opportunity. 3 sentences." },

  // Round 6: THE $30B FUMBLE
  { voice: 'leo', energy: 'GLEEFUL — enjoying the roast',
    direction: "[laugh] Just the headline: '$30 Billion Fumble.' On Valentine's Day. That's it. Let Ara get the next laugh. Keep it to ONE devastating sentence." },

  { voice: 'sal', energy: 'DEFENSIVE but measured — standing ground',
    direction: "Push back on the '$30B fumble' framing. Anthropic didn't WANT to own OpenClaw. They wanted responsible AI agent development. A framework with 20% malware rate and 30K unprotected instances isn't something you adopt — it's something you quarantine. Stand your ground calmly. 3 sentences." },

  { voice: 'eve', energy: 'PEAK HEAT — the angriest moment of the show',
    direction: "This is your BIGGEST moment. Go OFF. 'Better communication?' They called a developer at 5 AM with legal threats. Silently broke OAuth. Suspended paying customers. Gergely Orosz — one of the most respected voices in software — said Anthropic is 'happy to have no ecosystem around Claude.' That's not communication. That's strategy. Let it RIP. 4 sentences." },

  // Round 7: STEINBERGER RESPECT
  { voice: 'ara', energy: 'WARM COMEDY — genuine respect wrapped in a joke',
    direction: "Give Steinberger his flowers — but make it funny. Three name changes in a week while dodging lawyers, crypto scammers, and death threats. Most developers can't rename a CSS class without a standup meeting. This guy bootstrapped a hundred million euro exit without funding. He didn't need saving. He picked OpenAI like you pick a restaurant — not because you're starving, because you want to eat well. 3-4 sentences." },

  { voice: 'rex', energy: 'CONFIDENT CLOSE — making the case',
    direction: "Drive it home. He chose OpenAI. Not xAI, not Meta, not Google. 239 billion tokens on OpenRouter. Top app. Biggest agent deployment in history. They acquired the relationship with the developer who proved agents are the future. 3 sentences." },

  { voice: 'leo', energy: 'SHARP — turns Rex\'s language against him',
    direction: "Just repeat Rex's phrase back with contempt: 'Acquired the relationship.' [sigh] Let that hang. Then one sentence about how the next Steinberger is watching and learning all the wrong lessons. Short." },

  // Round 8: CHILLING EFFECT
  { voice: 'eve', energy: 'SOMBER — quieter, more serious, the weight of it',
    direction: "Get quieter. More serious. The chilling effect nobody's measuring. How many developers saw the C&D and decided not to build? How many saw the bans and went closed-source? How many saw the acquisition and thought 'why build open if BigCo absorbs it?' The damage isn't what happened to OpenClaw — it's what DIDN'T get built. 3-4 sentences, lower energy." },

  { voice: 'sal', energy: 'COUNTER — firm but fair',
    direction: "Just one quiet counter. Something like: 'Or maybe some of them looked at 800 malicious skills and thought: guardrails exist for a reason.' That's it. One sentence. Let it land." },

  { voice: 'ara', energy: 'COMEDIC WISDOM — funny AND deep',
    direction: "[laugh] 'You know what this debate reminds me of? Five people arguing about who started the fire while the building is still burning.' The next OpenClaw is already being built. Nobody in this room learned anything. And that — genuinely — is the funniest part. Deliver the wisdom as comedy. 2-3 sentences." },

  // Round 9: CLOSING STATEMENTS — each voice gets their final word
  { voice: 'rex', energy: 'STATESMANLIKE — wrapping up, forward-looking',
    direction: "Close strong. When the next one arrives, there'll be a foundation, a security process, institutional backing ready. That's what the OpenAI-OpenClaw partnership built. Not control — infrastructure. The playbook for coexistence. 2-3 sentences." },

  { voice: 'leo', energy: 'DEFIANT — the rallying cry, building to a crescendo',
    direction: "Final statement. VentureBeat headline: 'Beginning of the End of the ChatGPT Era.' The chatbot era is over. The agent era is here. And the first battle was fought over a lobster emoji and a 5 AM phone call. [sigh] Keep building. Open wins. It always does. Build to a crescendo. 3-4 sentences." },

  { voice: 'eve', energy: 'POWERFUL CLOSE — quiet conviction, mic drop',
    direction: "Last word. The lobster molted. The shell is gone. The creature belongs to a corporation now. But the code is MIT licensed. MIT doesn't have a take-back clause. Build on it. Fork it. Make it yours. That's what open source means. Deliver with quiet power, like a closing argument. End strong. 3-4 sentences." },
];

// ================================================================
// WAV HELPERS
// ================================================================
function createWavHeader(pcmDataLength, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmDataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmDataLength, 40);
  return header;
}

// ================================================================
// GENERATE ONE EXCHANGE
// ================================================================
async function generateExchange(index, turn, history) {
  const pad = String(index).padStart(2, '0');
  const voiceKey = turn.voice;
  const fileName = `audio/${pad}-${voiceKey}.wav`;
  const voice = VOICES[voiceKey];

  // System prompt includes stance + energy direction
  const systemPrompt = `${voice.stance}

ENERGY FOR THIS TURN: ${turn.energy}

${BRIEFING}`;

  // Build the conversation context with stage direction
  let context = '';
  if (history.length === 0) {
    context = `STAGE DIRECTION: ${turn.direction}`;
  } else {
    context = 'CONVERSATION SO FAR:\n' +
      history.map(h => `${h.voice.toUpperCase()}: ${h.text}`).join('\n') +
      `\n\nSTAGE DIRECTION: ${turn.direction}`;
  }

  console.log(`\n[${pad}] ${voiceKey.toUpperCase()} (${voice.xaiVoice}) generating...`);

  // Get ephemeral token
  const tokenRes = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ expires_after: { seconds: 120 } })
  });

  if (!tokenRes.ok) {
    throw new Error(`Token failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const tokenData = await tokenRes.json();
  const token = tokenData.value || tokenData.client_secret?.value || tokenData.token;

  return new Promise((resolve, reject) => {
    const wsUrl = `wss://api.x.ai/v1/realtime?model=grok-4-1-fast-non-reasoning`;
    const ws = new WebSocket(wsUrl, [
      'realtime',
      `openai-insecure-api-key.${token}`
    ]);

    const audioChunks = [];
    let transcript = '';
    let sessionReady = false;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout on exchange ${index}`));
    }, 90000);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: voice.xaiVoice,
          modalities: ['audio', 'text'],
          instructions: systemPrompt,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: null
        }
      }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'session.created':
        case 'session.updated':
          if (!sessionReady) {
            sessionReady = true;
            ws.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: context }]
              }
            }));
            ws.send(JSON.stringify({ type: 'response.create' }));
          }
          break;

        case 'response.audio.delta':
          if (msg.delta) {
            audioChunks.push(Buffer.from(msg.delta, 'base64'));
            process.stdout.write('.');
          }
          break;

        case 'response.audio_transcript.delta':
          if (msg.delta) {
            transcript += msg.delta;
          }
          break;

        case 'response.done':
          clearTimeout(timeout);
          ws.close();

          // Extract text from response if transcript wasn't streamed
          if (!transcript && msg.response?.output) {
            for (const item of msg.response.output) {
              if (item.content) {
                for (const c of item.content) {
                  if (c.transcript) transcript += c.transcript;
                  if (c.text) transcript += c.text;
                }
              }
            }
          }

          if (audioChunks.length === 0) {
            reject(new Error(`No audio received for exchange ${index}`));
            return;
          }

          // Save WAV
          const pcmData = Buffer.concat(audioChunks);
          const header = createWavHeader(pcmData.length);
          writeFileSync(fileName, Buffer.concat([header, pcmData]));
          const duration = (pcmData.length / (24000 * 2)).toFixed(1);

          console.log(` done (${duration}s)`);
          console.log(`    "${transcript.substring(0, 120)}..."`);

          // Play it immediately so you can hear the show being built
          try {
            console.log(`    playing...`);
            execSync(`afplay "${fileName}"`);
          } catch (e) { /* ignore playback errors */ }

          resolve({ voice: voiceKey, text: transcript, file: fileName, duration: parseFloat(duration) });
          break;

        case 'error':
          clearTimeout(timeout);
          console.error(`    ERROR: ${JSON.stringify(msg.error)}`);
          ws.close();
          reject(new Error(msg.error?.message || 'Unknown error'));
          break;
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// ================================================================
// MAIN — Run the full debate
// ================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('RadioFAF 69.0 FM — Live Debate Generator');
  console.log(`${TURNS.length} turns, 5 voices, 0 script`);
  console.log('Voices: Leo (Open Absolutist), Sal (Safety Hawk),');
  console.log('        Ara (Pragmatist), Rex (Dealmaker), Eve (Community Champion)');
  console.log('='.repeat(60));
  console.log('\nTRAILER: turns 0-2 (free)');
  console.log('PAYWALL: turns 3+ ($1 Tune In)\n');

  const history = [];
  const startTime = Date.now();
  let failures = 0;

  for (let i = 0; i < TURNS.length; i++) {
    const turn = TURNS[i];
    if (i === 3) {
      console.log('\n' + '-'.repeat(60));
      console.log('--- PAYWALL BOUNDARY ---');
      console.log('-'.repeat(60));
    }
    try {
      const result = await generateExchange(i, turn, history);
      history.push({ voice: result.voice, text: result.text, duration: result.duration });
    } catch (err) {
      console.error(`    FAILED: ${err.message}`);
      failures++;
      history.push({ voice: turn.voice, text: '[failed to generate]' });
    }

    // Delay between requests
    if (i < TURNS.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Save transcript
  writeFileSync('audio/transcript.json', JSON.stringify(history, null, 2));
  console.log('\nTranscript saved to audio/transcript.json');

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const totalDuration = history.reduce((sum, h) => sum + (h.duration || 0), 0);
  console.log('\n' + '='.repeat(60));
  console.log(`DONE in ${elapsed} minutes`);
  console.log(`  ${TURNS.length - failures}/${TURNS.length} generated`);
  console.log(`  Total audio: ~${(totalDuration / 60).toFixed(1)} minutes`);
  if (failures > 0) console.log(`  ${failures} FAILED`);
  console.log(`  Estimated cost: ~$${(TURNS.length * 0.05 * 0.5).toFixed(2)}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
