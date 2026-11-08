# Thumbnails

Two thumbnails are already rendered from real frames of the app (recommended, because they show the
actual product):

- Devpost, 3:2: `video/out/thumb-devpost.jpg` (3000×2000)
- YouTube, 16:9: `video/out/thumb-youtube.jpg` (2560×1440, under 2 MB)

If you want a generated image instead, use the prompts below. Attach a real frame as the reference
so the picture stays true to the product: `docs/submission/screenshots/ref-3d-conflict.jpg` (the
3D model with the door striking the console) or `ref-studio-conflict.jpg` (the studio plan).

Palette (the product's own tokens): paper `#F6F6F3`, ink `#111315`, grey `#4A5057`, blue `#2F5BFF`,
red-orange `#FF4A1C`, green `#0E9F5A`.

---

## 1. Devpost thumbnail, 3:2 (paste into ChatGPT, Midjourney or Ideogram)

```
Create a 3:2 landscape image, 3000 × 2000 px, to be the thumbnail of a software project.

Use the attached screenshot as the reference for the product: a white architectural study model of a hotel room rendered in the browser. Keep its look: matte white walls and furniture blocks, soft daylight, gentle contact shadows.

Subject: the white study model of one rectangular hotel room, seen from a high three-quarter angle, like a photograph of a museum-quality foam-board model. No ceiling. A bed, a desk, a wardrobe and a low console are plain white blocks. In the front wall, one door stands open at about 16 degrees and its leaf touches the corner of the low console next to it. On the floor, a thin cobalt-blue (#2F5BFF) quarter-circle line shows the door's full swing. Where the leaf meets the console there is one small, vivid red-orange (#FF4A1C) mark, and the console's corner carries a short red-orange hatch. Nothing else in the image has colour.

Background: seamless warm off-white paper (#F6F6F3) with a very faint 1 mm drafting grid that fades out toward the edges.

Composition: the model fills the right 60% of the frame and is slightly cropped by the right edge. The left 40% is calm, empty paper. In that space, set the word PLANRIFT in a clean geometric grotesk (similar to Instrument Sans), semibold, near-black (#111315), tracking +2%, cap height about 9% of the image height. Below it, one line in the same typeface, regular weight, grey (#4A5057), about a third of the size: Know what a revision breaks. No other text, numbers, logos or labels anywhere.

Style: editorial, precise and calm, in the spirit of Swiss International Style and an architecture monograph cover. Photographic realism for the model; crisp, perfectly spelled typography. Generous margins. It must still read clearly when shown at 300 × 200 px.

Avoid: neon, glow, gradients, glassmorphism, holograms, floating UI panels, dashboards or charts, isometric icons, cartoon or clay 3D, people or hands, lens flare, bokeh, dark or dramatic backgrounds, Halloween clichés (pumpkins, bats, cobwebs, skulls), any company logo, extra or misspelled text.
```

Optional Frankenstein accent (add as a final paragraph if you want a nod to the category):

```
Add one restrained detail: a thin line of red-orange cross-stitches, like a surgical suture, running across the paper from the PLANRIFT wordmark toward the model's door, as if the drawing and the model were stitched together. Keep it subtle and precise, not gory.
```

---

## 2. YouTube thumbnail, 16:9 (paste into ChatGPT with the reference frame attached)

```
Make a YouTube thumbnail, 16:9, 1280 × 720 px.

Use the attached screenshot as the source of truth for the product imagery: my app's white 3D model of a hotel room, where door D-101 swings into a console. Recreate that model faithfully (same white blocks, soft shadows, blue swing arc, red-orange contact mark). Do not invent interface elements.

Layout:
- Right 55%: a tight, slightly low-angle close-up of the door striking the console. The red-orange (#FF4A1C) contact point sits on the right-third vertical line. The blue (#2F5BFF) quarter-circle swing arc is visible on the floor.
- Left 45%: two lines of very large, heavy grotesk type, left-aligned, near-black (#111315) on warm off-white (#F6F6F3):
  Line 1: IT HITS
  Line 2: AT 15.7°
  Make "15.7°" red-orange (#FF4A1C). The text block takes about 60% of the image height.
- Bottom-left, small: PLANRIFT in the same typeface, grey (#4A5057).
- Keep the bottom-right corner (about 15% × 15%) free of anything important; YouTube puts the video length there.

Style: clean, high-contrast, editorial product photography. One focal point. Readable at 168 × 94 px. Exactly the text given, spelled exactly, nothing else.

Avoid: faces or reaction shots, arrows, circles drawn around things, emojis, glow, neon, gradients, drop shadows on text, busy backgrounds, fake app screens, Halloween props, logos.
```

Alternative headline for an A/B test (YouTube Studio → Test & compare): `ONE DOOR. / 3 DRAWINGS.` with
`3 DRAWINGS.` in red-orange.
