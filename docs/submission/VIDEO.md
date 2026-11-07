# Demo video: script, shot list, upload copy

Hard limit: **under 3:00**. This cut runs **2:48**. Record the voiceover yourself; no music is needed
(if you add any, it must be royalty-free and licensed for YouTube). Captions are in
`captions.srt` (cue times match the table below).

## Before recording

- Use https://planrift-omega.vercel.app in a fresh Chrome window, 1440×900 or 1920×1080, light mode.
- Record the screen with macOS (Shift-Cmd-5) so WebGL runs on your real GPU. Do not use a headless
  capture: the software renderer is choppy.
- Open `/demo` in a private window, or clear site data, so the sample project is fresh.
- Hide bookmarks and notifications. Move the pointer slowly; pause 1 s on every number you mention.

## Script and shots

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:14 | Landing hero, model assembling. | An architect moves a door in a hotel room. On the plan it looks fine. Does the swing hit anything? And which drawings must be reissued? |
| 0:14–0:30 | Hero: drag D-101 along the wall; the header capsule changes. | This is PLANRIFT. The room is a white study model, driven by a real geometry engine. Drag the door along the wall. |
| 0:30–0:55 | `/demo`, Plan view, baseline. Point at 1,083.7 mm, then the hinge-map strip. | The approved plan: door D-101 at 1,700 millimetres. Its swing clears console F-07 by 1,083.7 millimetres. The strip under the wall is the result at every millimetre the hinge could sit. |
| 0:55–1:25 | Click **New scenario**, type 3000 in Hinge position. Show the red banner, then **Model**. | Revision A: move the door to 3,000. The leaf strikes the console after 15.7 degrees and would push 188.7 millimetres into it. Plan and 3D agree because they are drawn from one scene. |
| 1:25–1:45 | **New**, type 2400. Show Pass and 391.5 mm. | Branch a second scenario from the approved plan and try 2,400. The swing clears the console by 391.5 millimetres. |
| 1:45–2:05 | Scroll the Result panel to the documents (A-101, A-401, D-01). | But clear is not finished. Three documents show this door: A-101, A-401 and D-01. PLANRIFT flags them for review. It never edits them. Room 513 is untouched. |
| 2:05–2:25 | **Compare**, then **Review** → **Submit for review** → tick the box → **Accept & commit**; show the receipt. | Compare the approved plan and both revisions side by side. Submit for review, acknowledge the flagged sheets, accept. The decision becomes a receipt. |
| 2:25–2:40 | Landing page, Kiro section (hook line, specs, agents). | The geometry uses exact integer arithmetic. Kiro built it from specs, steering, custom agents, and hooks that run the tests and ask before anything goes public. |
| 2:40–2:48 | End card: logo, URL, repo. | PLANRIFT. Know what a revision breaks before it is issued. |

Numbers to read exactly: 1,083.7 mm · 15.7° · 188.7 mm · 391.5 mm · A-101, A-401, D-01.
They come from the engine and match `docs/geometry/GEOMETRY_CONTRACT.md` §7.

## Do not say

- "compliant", "approved to build", "automatically updates drawings", "AI design".
- Any claim about CAD/BIM import. PLANRIFT does not read or write DWG, DXF, IFC or Revit files.

## After recording

1. Check the length: `ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4` must be under 180.
2. Upload to YouTube as **Public**, add `captions.srt` as English subtitles.
3. Send me the URL and I will check that it plays logged out and fill it into the Devpost text.

## YouTube copy

**Title:** PLANRIFT: know what a design revision breaks before it is issued (Kiroween 2026)

**Description:**

PLANRIFT is an architecture revision consequence studio. Move a door in a hotel room, see whether the
swing hits furniture (computed in whole millimetres), see which drawings must be reissued, compare
alternatives and record the decision as a receipt.

Live demo (no sign-in): https://planrift-omega.vercel.app
Source (MIT): https://github.com/AmirmLotfy/planrift

Built with Kiro for Kiroween 2026, Frankenstein category: specs, steering files, custom agents and hooks
are in the repo's `.kiro/` folder. Fictional sample project. PLANRIFT records reviews; it is not a
compliance or approval tool.

## Thumbnail

`screenshots/09-studio-conflict-3000.jpg` cropped to 16:9 with the headline "One door. Three drawings."
