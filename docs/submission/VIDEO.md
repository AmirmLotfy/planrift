# Demo video: treatment and production plan (v2)

Runtime target **2:52** (hard limit 3:00). Voiceover: `VO_SCRIPT.md`. Music and sound effects:
`MUSIC_PROMPT.md`. Inputs go in `video/inbox/` (git-ignored).

**Truthfulness:** every product shot is a recording of the deployed app driven by real input (typing,
mouse drags, scrolling). Motion graphics are presented as graphics (drawings, titles, diagrams), and
every number on screen comes from the engine. No mock-ups of the UI.

## Storyboard

| Time | Scene | Picture | VO | Music |
|---|---|---|---|---|
| 0:00–0:17 | Horror story | Motion graphic built with the real engine and plan renderer: the R-512 plan inks itself onto paper, a revision cloud appears, the door slides 1,700 → 3,000 mm (every frame solved by the engine), an ISSUED stamp lands, the swing hits F-07: red flash, strike ring, small shake | 01–02 | music box, ticking |
| 0:17–0:22 | Title | The PLANRIFT mark draws itself and the red block snaps into the swing; wordmark and tagline | 03 | impact, reveal |
| 0:22–0:40 | Live model | Recording: landing hero, the white model assembles; a smooth cursor grabs the door and slides it; the header status flips; gentle push-in on the labels | 04–05 | precision groove |
| 0:41–0:55 | Approved plan | Recording: studio at 1,700 mm; zoom to 1,083.7 mm; a highlight runs along the hinge-map strip | 06 | groove |
| 0:56–1:19 | Revision A | Recording: new scenario, type 3000; red banner; zoom to the 15.7° strike; numbers set in large type; cut to the 3D Model view; overlay of the contract's hand calculation √437 300 − 850 = −188.71 mm | 07–09 | conflict |
| 1:21–1:29 | Revision B | Recording: second scenario at 2,400; the swing turns clear; 391.5 mm | 10 | lift into major |
| 1:30–1:48 | Documents | Recording: landing review section; highlighter swipes timed to "floor plan, room elevation, door schedule"; R-513 and A-402 shown untouched | 11–12 | resolution |
| 1:49–2:03 | Decide | Recording: compare view, then submit, acknowledge, accept; the receipt with both fingerprints | 13–14 | decision |
| 2:04–2:20 | It's alive | Motion graphic: six panels (plan, engine, 3D, revisions, ledger, receipt, each a crop of real footage) pop in with the list and are stitched into a ring; a pulse runs around it; a small "It's alive." wink | 15 | layers stitch in, spark |
| 2:21–2:36 | Built with Kiro | Recording of the landing Kiro section (hook line) plus an animated `.kiro/` tree from the real files; your Kiro IDE clips if you send them | 16–17 | peak |
| 2:37–2:52 | End card | Mark, line, `planrift-omega.vercel.app`, `github.com/AmirmLotfy/planrift`, "Built with Kiro · Kiroween 2026 · Frankenstein" | 18 | music box in major, ring-out |

Burned-in captions, highlighted word by word, timed from the actual recording; the same text is uploaded to
YouTube as an SRT.

## Production pipeline

1. **Capture.** Playwright drives the deployed site at 1440×810, 2× device pixels (2880×1620 frames). The
   page clock is frozen and advanced 1/30 s per frame, with a screenshot of every frame, so motion is perfectly
   smooth whatever the render speed. Tested on 7 Nov: the hero's 3D intro captured from the live site at
   0.74 s per frame at 1× (software rendering). At 2× expect roughly 1–2 hours for all footage. Still to
   test: CSS transitions, which the page clock doesn't control (plan: pause them and seek them per frame).
2. **Cursor.** The pointer path is logged during capture and drawn in the edit as a clean cursor with
   click ripples.
3. **Edit.** Remotion project in `video/` (free for individuals), one composition per scene, cuts on the
   100 BPM bar grid (one bar = 2.4 s = 72 frames).
4. **Audio.** VO: high-pass, noise reduction from room tone, de-ess, light compression. Music ducked under
   the voice; sound effects on cuts. Master: −14 LUFS integrated, true peak ≤ −1 dBTP.
5. **Output.** 2560×1440 master (YouTube encodes 1440p uploads sharper than 1080p), 30 fps, H.264,
   plus a 1080p copy. Length checked with `ffprobe` (must be < 180 s). Watched in full before upload.

## Upload copy

**Title:** PLANRIFT: know what a design revision breaks before it is issued (Kiroween 2026)

**Description:**

PLANRIFT is an architecture revision consequence studio. Move a door in a hotel room, see whether the
swing hits furniture (computed in whole millimetres), see which drawings must be reissued, compare
alternatives and record the decision as a receipt.

Live demo (no sign-in): https://planrift-omega.vercel.app
Source (MIT): https://github.com/AmirmLotfy/planrift

Built with Kiro for Kiroween 2026, Frankenstein category: specs, steering files, custom agents and hooks
are in the repo's `.kiro/` folder. Fictional sample project. PLANRIFT records reviews; it is not a
compliance or approval tool. Music: [credit the generator and plan you used].

**Thumbnail:** a frame of the Revision A conflict, with "One door. Three drawings." set in large type.
