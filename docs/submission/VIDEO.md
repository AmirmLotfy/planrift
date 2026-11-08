# Demo video: final cut

**File:** `video/out/planrift-demo-1440p.mp4` (git-ignored; 89.5 MB)
**Length:** 2:48 (168.0 s, limit 3:00) · 2560×1440 · 30 fps · H.264 CRF 16 · AAC 320 kb/s
**Loudness:** −14.1 LUFS integrated, true peak −1.5 dBFS before AAC encoding
**Captions:** burned in (word-highlighted) and `captions.srt` for YouTube
**Thumbnails:** `video/out/thumb-youtube.jpg` (2560×1440), `video/out/thumb-devpost.jpg` (3000×2000)

**Truthfulness:** every product shot is a recording of the deployed app at
https://planrift-omega.vercel.app, driven by real input (typing, mouse drags, scrolling). Motion
graphics are drawings and titles; the opening animation is drawn with the app's own engine and plan
renderer, and every number on screen is computed by the engine. No mock-ups of the interface.

## Cut

| Time      | Scene                   | Picture                                                                                                                                                                                        | Voiceover       |
| --------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 0:00–0:14 | Horror story            | The R-512 plan inks itself; the door slides 1,700 → 3,000 mm (each frame solved by the engine); an ISSUED stamp lands; the swing strikes F-07 at 15.7°                                         | VO-01, 02       |
| 0:14–0:23 | Title                   | The PLANRIFT mark draws itself; wordmark and tagline                                                                                                                                           | VO-03 (as type) |
| 0:23–0:39 | Live model              | Landing hero: the white model; the cursor grabs D-101 and drags it to 3,000 mm, then to 2,400 mm                                                                                               | VO-04, 05       |
| 0:39–0:46 | Approved plan           | Studio at 1,700 mm; zoom to the 1,083.7 mm clearance                                                                                                                                           | VO-06           |
| 0:46–0:54 | Hinge map               | Landing "Where can the door go?": the cursor reads the strip along the whole wall                                                                                                              | VO-06           |
| 0:54–1:08 | Revision A              | New scenario, type 3000, Enter: Conflict; 15.7° and 188.7 mm called out                                                                                                                        | VO-07, 08       |
| 1:08–1:14 | One model               | Landing scroll story: the model becomes the drawing                                                                                                                                            | VO-09           |
| 1:14–1:24 | Exact maths, Revision B | Studio Model view with the integer predicate card; second scenario at 2,400 mm: Pass, 391.5 mm                                                                                                 | VO-09, 10       |
| 1:24–1:40 | Drawings to reissue     | Landing review section: A-101, A-401, D-01 as they are named; the three _Review required_ flags; the note that room 513 is unflagged                                                           | VO-11, 12       |
| 1:40–1:52 | Decide                  | Compare, review Revision B, submit, acknowledge, accept; the receipt and its fingerprints                                                                                                      | VO-13, 14       |
| 1:52–2:10 | Under the hood          | Six real panels (editor, engine source, 3D room, revision control, document ledger, audit trail) appear on their words and are stitched into one loop; "It's alive."                           | VO-15           |
| 2:10–2:24 | Built with Kiro         | Landing Kiro section, read from `.kiro/` at build time: rings on the specs, steering and agents columns as named, then on the hooks that gate tasks, block secrets and ask before going public | VO-16, 17       |
| 2:24–2:34 | Reel                    | Eight real shots on the music's beat                                                                                                                                                           | –               |
| 2:34–2:48 | End card                | Mark, line, live URL, repo URL, "Built with Kiro · Kiroween 2026 · Frankenstein"                                                                                                               | VO-18 (as type) |

## Sound

- **Voice:** the supplied `VO.wav`, split into 18 lines with whisper.cpp word timings aligned to the
  script; 48 kHz, −16 LUFS per line, limiter.
- **Music:** the supplied `music.mp3` (about 105 BPM), ducked under the voice with a sidechain
  compressor, fading out from 2:44.5. Cuts and the reel sit on its beat grid.
- **Effects:** synthesised from scratch for this video in `video/scripts/sfx.mjs` (pen, paper,
  stamp, thud, hit, whoosh, pop, snap, spark, felt-tip marker, UI click, keystroke). UI clicks and
  keystrokes are placed from the capture logs, so each one lands on the real input.
- **Master:** two-pass loudnorm to −14 LUFS, −1.5 dBTP.

## How it was made (reproducible)

All in `video/` (Remotion 4, free for individuals). Media inputs are git-ignored.

1. `node scripts/transcribe.mjs && node scripts/align.mjs` → `build/vo-lines.json` (word timings)
2. `node scripts/vo.mjs` · `node scripts/sfx.mjs` · `node scripts/prepare.mjs` (captions, moments, cues) · `node scripts/mix.mjs`
3. `node scripts/capture.mjs all` records the deployed app frame by frame: the page clock is frozen and
   advanced 1/30 s per frame, CSS animations are seeked to the same virtual time, and every 2×
   screenshot goes to ffmpeg. Pointer paths, clicks and element boxes are logged for the edit.
4. `node scripts/index-captures.mjs`, then
   `npx remotion render src/index.ts PlanriftDemo out/planrift-demo-1440p.mp4 --concurrency=2 --crf=16 --audio-codec=aac --audio-bitrate=320k`
5. `node scripts/stills.mjs --thumbs` (thumbnails) · `node scripts/srt.mjs` (captions file)

Upload copy and settings: `YOUTUBE.md`. Thumbnail prompts: `THUMBNAIL_PROMPTS.md`.
