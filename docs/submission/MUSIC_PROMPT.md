# Background music and sound effects: prompts

## What I need

- 2 or 3 instrumental versions, **2:55 or longer** (longer is fine; I edit to the picture).
- WAV if your plan allows it, otherwise the highest-quality MP3. If the tool offers **stems**
  (drums, bass, other), send them too; they let me duck and cut cleanly.
- If the tool lets you set tempo, use **100 BPM**: one bar is then exactly 2.4 s, so cuts land on the beat.
- Files go in `video/inbox/`: `music-a.wav`, `music-b.wav`, and so on.

**Licensing:** generate on a plan that grants commercial use, and keep the download record. Suno's free
plan is personal and non-commercial only; songs made while on Pro or Premier carry commercial rights
([summary](https://terms.law/ai-output-rights/suno/)). ElevenLabs positions Eleven Music for commercial use
([overview](https://coverr.co/blog/eleven-music-elevenlabs-ai-music-model-2026)); check that your plan
covers it. The hackathon forbids music you don't have rights to.

## The idea

The music tells the same story as the video. It opens as a slightly spooky music box in D minor (the
Kiroween "horror story"), turns into a warm, precise electronic pulse, goes tense at the conflict, lifts
into D major at the fix, builds as the parts are "stitched" together, and ends with the opening music-box
tune, now in major. The mix stays airy in the voice range so the narration sits on top.

## Option A: ElevenLabs Music (recommended; it follows section lengths)

**Prompt:**

> Instrumental cinematic electronic score for a precise, modern product film, 100 BPM, D minor resolving to
> D major, 2 minutes 55 seconds. Opens with an eerie but playful music box and a ticking clock over a low
> warm drone, a soft low impact, then a warm analog synth arpeggio, felt piano, soft kick and brushed
> hi-hats. A tense filtered section with staccato strings, then a bright lift into major. Builds layer by
> layer to a sparkling peak and ends on the music-box melody in major with a natural ring-out. Clean, airy
> mix that leaves room for a voiceover. No vocals.

If you can edit the composition plan, use these sections:

| # | Section | Length | Feel |
|---|---|---|---|
| 1 | Haunted sketch | 0:00–0:14 (14 s) | music box or celesta melody in D minor, ticking clock, low warm drone, sparse, mysterious but playful |
| 2 | Impact and reveal | 0:14–0:22 (8 s) | soft deep impact, reverse swell, a warm chord opens, gentle shimmer |
| 3 | Precision groove | 0:22–0:56 (34 s) | soft kick on 1 and 3, brushed hats, 16th-note analog arpeggio, felt piano chords, curious and optimistic, steady |
| 4 | Conflict | 0:56–1:20 (24 s) | filter closes, pulsing low synth, staccato strings, one dissonant stab near 1:00, tense but not loud |
| 5 | Resolution | 1:20–1:47 (27 s) | lift into D major, filter opens, pads widen, lighter percussion, relief |
| 6 | Decision | 1:47–2:02 (15 s) | steady confident pulse, clean plucks, a sense of order |
| 7 | It's alive | 2:02–2:35 (33 s) | layers stitch in one by one (pizzicato, arpeggio, drums, low strings), rising to a bright spark at about 2:17, still below voice level |
| 8 | Outro | 2:35–2:55 (20 s) | strip back to the opening music-box melody in D major over a warm pad, soft final hit at 2:37, natural ring-out |

**Exclude:** vocals, choir, lyrics, spoken words, EDM drop, dubstep, trap hi-hats, aggressive distortion,
horror screams, jump scares, busy lead melody.

## Option B: Suno (Instrumental on)

**Style box:**

> Instrumental cinematic electronic, product film, 100 BPM, D minor to D major. Eerie playful music box and
> ticking clock intro, soft low impact, warm analog synth arpeggio, felt piano, soft kick, brushed hats,
> tense filtered staccato strings, bright major lift, layered build to a sparkling peak, music-box outro in
> major. Clean airy mix, space for voiceover.

**Exclude styles:** vocals, choir, rap, EDM drop, dubstep, trap, heavy distortion, horror screams

**Lyrics box (structure only):**

```
[Intro: eerie music box, ticking clock, low drone]
[Impact]
[Build: warm reveal]
[Verse: precision groove, analog arpeggio, felt piano]
[Breakdown: tense, filtered, staccato strings]
[Chorus: bright lift, major key]
[Bridge: steady pulse, clean plucks]
[Build: layers stitch in one by one, rising]
[Climax: sparkling peak]
[Outro: music box melody in major, warm pad, ring out]
[End]
```

Suno won't hit the timings exactly; that's fine. Pick takes where the intro stays sparse for about 14 s
and the ending rings out instead of cutting off.

## Optional: sound effects (they add a lot)

ElevenLabs Sound Effects or similar; same licensing rule. One file each, in `video/inbox/`.

| File | Prompt |
|---|---|
| `sfx-pen.wav` | Fine technical pen drawing a long straight line on heavy paper, close and quiet, 2 seconds |
| `sfx-door-thud.wav` | Wooden door swinging open fast, then a dull thud against a wooden cabinet, dry, 1.5 seconds |
| `sfx-stamp.wav` | Rubber stamp pressed firmly onto paper on a desk, one crisp hit, 0.8 seconds |
| `sfx-hit.wav` | Soft deep cinematic impact with a short warm tail, no metal, 2 seconds |
| `sfx-whoosh.wav` | Airy, subtle whoosh for a screen transition, 0.6 seconds |
| `sfx-click.wav` | Minimal soft UI click, glassy, quiet, 0.2 seconds |
| `sfx-marker.wav` | Highlighter marker swiping across paper, one stroke, 0.7 seconds |
| `sfx-paper.wav` | Three paper sheets sliding and landing on a desk, gentle, 1.5 seconds |
| `sfx-spark.wav` | Small electric spark crackle and a soft hum swelling up, playful, 1.5 seconds |

## Optional: Kiro IDE clips

Real footage of Kiro helps the "how Kiro was used" score. If you can, record with Shift-Cmd-5 (no audio),
after closing anything private (other projects, email, tokens, the MCP settings file):

| File | What to show | Length |
|---|---|---|
| `kiro-specs.mov` | PLANRIFT open in Kiro; open `.kiro/specs/core-geometry-engine/tasks.md` and scroll slowly | 10–15 s |
| `kiro-hooks.mov` | the Agent Hooks panel listing the six hooks | 8–10 s |
| `kiro-steering.mov` | the `.kiro/steering` files in the explorer, click one open | 8 s |

Without these clips I'll animate the real `.kiro` files instead.
