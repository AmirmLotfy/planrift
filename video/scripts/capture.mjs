// Records the product shots from the deployed app with real input, frame by frame.
// Usage: node scripts/capture.mjs <c1-hero|c2-studio|c3-review|c4-decide|c5-kiro|c6-story|all>
// Action times come from the voiceover word timings (scripts/lib/cues.mjs), so clicks land on the
// words that describe them.
import { TIMELINE, wordTime } from './lib/cues.mjs';
import { abortSessions, openSession } from './lib/recorder.mjs';

const at = (name, t) => t - TIMELINE.captureStart[name];

async function until(s, t) {
  const target = Math.round(t * s.fps);
  if (s.rec.frame < target) await s.frame(target - s.rec.frame);
}

async function dismissCoach(s) {
  const close = s.page.getByRole('button', { name: 'Hide the getting-started tips' }).first();
  if (await close.count()) await close.click();
  await s.idle(300);
}

/** Smooth scroll through Lenis with wheel input spread over `frames`. */
async function wheel(s, dy, frames) {
  const steps = Math.max(1, Math.min(frames, 8));
  for (let i = 0; i < frames; i++) {
    if (i < steps) await s.page.mouse.wheel(0, dy / steps);
    await s.frame(1);
  }
}

/** Document y of the nth match, from layout offsets (reveal transforms do not shift it). */
async function docY(s, selector, nth = 0) {
  const y = await s.page.evaluate(
    ([sel, n]) => {
      const el = document.querySelectorAll(sel)[n];
      if (!el) return null;
      let v = 0;
      for (let e = el; e; e = e.offsetParent) v += e.offsetTop;
      return v;
    },
    [selector, nth],
  );
  if (y === null) throw new Error(`docY: no ${selector} [${nth}]`);
  return y;
}

const SCENES = {
  /** Landing hero: the white model assembles, then the door is dragged into the console and back. */
  async 'c1-hero'() {
    const name = 'c1-hero';
    const s = await openSession();
    await s.goto('/', 7000);
    await s.start(name);
    await until(s, 5.0);
    // Grab point: inside the swing square, just below the door tag.
    const tag = await s.page
      .locator('[data-kind="door"]')
      .first()
      .evaluate((el) => {
        const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform);
        return { x: Number(m[1]), y: Number(m[2]) };
      });
    const grab = { x: tag.x + 8, y: tag.y + 56 };
    const hinge = () => s.page.locator('[data-hinge]').first().getAttribute('data-hinge').then(Number);
    const label = () =>
      s.page
        .locator('[data-kind="hinge"]')
        .first()
        .evaluate((el) => {
          const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform);
          return { x: Number(m[1]), y: Number(m[2]) };
        });
    await s.moveTo(grab.x, grab.y, 38);
    const L0 = await label();
    const h0 = await hinge();
    await until(s, at(name, wordTime('VO-05', 'Grab')) + 0.05);
    await s.press();
    s.mark('grab');
    // Calibrate on this camera: a short nudge east, then the wall direction in screen px per mm
    // from how far the hinge label moved.
    await s.moveTo(grab.x + 20, grab.y + 8.5, 6);
    const h1 = await hinge();
    if (h1 === h0) throw new Error('drag did not register');
    const L1 = await label();
    const dir = { x: (L1.x - L0.x) / (h1 - h0), y: (L1.y - L0.y) / (h1 - h0) };
    let k = Math.hypot(20, 8.5) / Math.hypot(dir.x * (h1 - h0), dir.y * (h1 - h0));
    console.log(
      `  calibration: ${h0}→${h1} mm, ${Math.hypot(dir.x, dir.y).toFixed(3)} px/mm on the wall top, floor scale ${k.toFixed(2)}`,
    );
    // Closed loop: follow an eased hinge path; correct the floor scale as the hinge reports back.
    const pathTo = async (target, frames) => {
      const startMm = await hinge();
      const sx = s.mouse.x;
      const sy = s.mouse.y;
      for (let i = 1; i <= frames; i++) {
        const t = i / frames;
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        const want = startMm + (target - startMm) * e;
        s.mouse.x = sx + dir.x * (want - startMm) * k;
        s.mouse.y = sy + dir.y * (want - startMm) * k;
        await s.page.mouse.move(s.mouse.x, s.mouse.y);
        await s.frame(1);
        const got = await hinge();
        if (Math.abs(got - startMm) > 120 && Math.abs(want - startMm) > 120)
          k *= Math.min(1.08, Math.max(0.93, Math.sqrt((want - startMm) / (got - startMm))));
      }
      for (let i = 0; i < 12; i++) {
        const err = target - (await hinge());
        if (err === 0) break;
        s.mouse.x += dir.x * err * k * 0.9;
        s.mouse.y += dir.y * err * k * 0.9;
        await s.page.mouse.move(s.mouse.x, s.mouse.y);
        await s.frame(1);
      }
      return hinge();
    };
    console.log('  reached', await pathTo(3000, 54));
    await s.frame(24);
    console.log('  reached', await pathTo(2400, 46));
    await s.frame(14);
    await s.release();
    await s.moveTo(s.mouse.x + 160, s.mouse.y + 120, 24);
    await until(s, 16.0);
    console.log('  hinge at end', await hinge());
    await s.stop();
    await s.close();
  },

  /** Studio: approved plan, Revision A at 3,000 mm (Enter on the downbeat), 3D view, Revision B at 2,400 mm. */
  async 'c2-studio'() {
    const name = 'c2-studio';
    const s = await openSession();
    await s.goto('/demo', 6000);
    await dismissCoach(s);
    const p = s.page;
    await s.start(name);
    const newScenario = async () =>
      s.centre(p.getByRole('button', { name: 'New scenario from the committed revision' }).first());
    const hingeField = async () => s.centre(p.getByTestId('hinge-input'));
    await until(s, at(name, wordTime('VO-07', 'Revision')) - 0.9);
    let c = await newScenario();
    await s.click(c.x, c.y, 26);
    await s.frame(10);
    c = await hingeField();
    await s.click(c.x, c.y, 16);
    await p.keyboard.press('ControlOrMeta+A');
    await until(s, at(name, wordTime('VO-07', 'three')));
    await s.type('3000', 8);
    await until(s, at(name, 59.34) - 0.02);
    await s.key('Enter');
    s.mark('conflict');
    // VO-09 plays over the landing morph in the edit; switch to 3D here so the cut back lands in Model view.
    await until(s, at(name, wordTime('VO-09', 'Plan')) + 1.2);
    c = await s.centre(p.getByRole('button', { name: 'Model', exact: true }).first());
    await s.click(c.x, c.y, 20);
    s.mark('model');
    await until(s, at(name, wordTime('VO-10', 'Revision')) - 2.0);
    c = await newScenario();
    await s.click(c.x, c.y, 22);
    await s.frame(8);
    c = await hingeField();
    await s.click(c.x, c.y, 14);
    await p.keyboard.press('ControlOrMeta+A');
    await s.type('2400', 7);
    await until(s, at(name, wordTime('VO-10', 'twentyfour')) + 0.45);
    await s.key('Enter');
    s.mark('pass');
    await until(s, at(name, wordTime('VO-10', 'Three')) - 0.7);
    c = await s.centre(p.getByRole('button', { name: 'Split', exact: true }).first());
    await s.click(c.x, c.y, 16);
    s.mark('split');
    await until(s, 84.42 - TIMELINE.captureStart[name]);
    await s.stop();
    await s.close();
  },

  /**
   * Landing review section: the headline, then each sheet as the voiceover names it, the three
   * "Review required" flags together, and finally the note that room 513 was not flagged.
   */
  async 'c3-review'() {
    const name = 'c3-review';
    const s = await openSession();
    await s.goto('/', 6000);
    const p = s.page;
    const title = await docY(s, '#review h2');
    const sheet = (i) => docY(s, '#review article', i);
    const badge0 = await docY(s, '#review article [class*="swipe"]', 0);
    const note = await docY(s, '#review [class*="untouched"]');
    await p.evaluate((y) => window.scrollTo(0, y), title - 410);
    await s.idle(1200);
    await s.start(name);
    await s.frame(4);
    await s.glide(title - 150, 36);
    await until(s, at(name, 89.75));
    await s.glide((await sheet(1)) - 380, 18);
    await until(s, at(name, 90.95));
    await s.glide((await sheet(2)) - 380, 18);
    await until(s, at(name, 92.45));
    await s.glide(badge0 - 118, 15);
    // Boxes are read at the end of each hold, once reveal transitions have settled.
    await until(s, at(name, 96.3));
    await s.boxes({
      badge0: p.locator('#review article [class*="swipe"]').nth(0),
      badge1: p.locator('#review article [class*="swipe"]').nth(1),
      badge2: p.locator('#review article [class*="swipe"]').nth(2),
    });
    await s.glide(note - 520, 21);
    await until(s, 100.38 - TIMELINE.captureStart[name]);
    await s.boxes({ note: p.locator('#review [class*="untouched"]') });
    await s.stop();
    await s.close();
  },

  /** Studio decision: compare, review Revision B, submit, acknowledge, accept, receipt. */
  async 'c4-decide'() {
    const name = 'c4-decide';
    const s = await openSession();
    await s.goto('/demo', 6000);
    await dismissCoach(s);
    const p = s.page;
    const make = async (mm) => {
      await p.getByRole('button', { name: 'New scenario from the committed revision' }).first().click();
      await s.idle(300);
      await p.getByTestId('hinge-input').fill(String(mm));
      await p.getByTestId('hinge-input').press('Enter');
      await s.idle(400);
    };
    await make(3000);
    await make(2400);
    await s.moveTo(1180, 470, 1);
    await s.start(name);
    let c = await s.centre(p.getByRole('button', { name: 'Compare', exact: true }).first());
    await s.click(c.x, c.y, 14);
    await until(s, at(name, wordTime('VO-13', 'Submit')) - 0.75);
    c = await s.centre(p.getByRole('button', { name: 'Review Revision B' }).first());
    await s.click(c.x, c.y, 14);
    await s.frame(6);
    c = await s.centre(p.getByRole('button', { name: 'Submit for review' }).first());
    await s.click(c.x, c.y, 12);
    await until(s, at(name, wordTime('VO-13', 'acknowledge')) + 0.1);
    c = await s.centre(p.getByRole('checkbox').first());
    await s.click(c.x, c.y, 14);
    await until(s, at(name, wordTime('VO-13', 'accept')) - 0.25);
    c = await s.centre(p.getByRole('button', { name: 'Accept & commit' }).first());
    await s.click(c.x, c.y, 10);
    s.mark('receipt');
    await s.moveTo(c.x + 180, c.y + 260, 22);
    await until(s, 111.78 - TIMELINE.captureStart[name]);
    await s.stop();
    await s.close();
  },

  /**
   * Landing Kiro section, one continuous shot for VO-16 and VO-17: the title arrives, the page moves
   * to the specs / agents / steering columns as they are named, then back up to the six hooks.
   */
  async 'c5-kiro'() {
    const name = 'c5-kiro';
    const s = await openSession();
    await s.goto('/', 6000);
    const p = s.page;
    const title = await docY(s, '#kiro-title');
    const schedule = await docY(s, '#kiro [class*="schedule"]');
    await p.evaluate((y) => window.scrollTo(0, y), title - 840);
    await s.idle(1200);
    await s.start(name);
    await s.frame(3);
    await s.glide(title - 110, 39);
    await until(s, at(name, 131.62));
    await s.glide(schedule - 175, 20);
    // Boxes are read at the end of each hold, once reveal transitions have settled.
    await until(s, at(name, 136.0));
    const col = (id) => p.locator(`#kiro section[aria-labelledby="${id}"]`);
    await s.boxes({ specs: col('kiro-specs'), agents: col('kiro-agents'), steering: col('kiro-steering') });
    await s.glide(title - 110, 27);
    await until(s, at(name, 144.4));
    const station = (file) => p.locator('#kiro li[class*="station"]').filter({ hasText: file });
    await s.boxes({
      stations: p.locator('#kiro ol[class*="stations"]'),
      'session-resume': station('session-resume'),
      'task-start-gate': station('task-start-gate'),
      'secret-guard': station('secret-guard'),
      'geometry-regression': station('geometry-regression'),
      'public-action-guard': station('public-action-guard'),
      'task-completion-gate': station('task-completion-gate'),
    });
    await s.stop();
    await s.close();
  },

  /** Landing "Where can the door go?": the ruler's own sweep, then the cursor reads the whole wall. */
  async 'c7-ruler'() {
    const s = await openSession();
    await s.goto('/', 6000);
    // Readout card and strip both in view (the floating header covers the card's top edge only).
    await s.page.evaluate(() => {
      const fit = document.querySelector('#fit');
      window.scrollTo(0, fit.getBoundingClientRect().top + scrollY + 100);
    });
    await s.idle(400);
    const track = await s.page.evaluate(() => {
      const strip = [
        ...document.querySelectorAll('#fit [class*="instrument"] > *'),
      ][2].getBoundingClientRect();
      return { x0: strip.x, x1: strip.x + strip.width, y: strip.y + 42 };
    });
    await s.start('c7-ruler');
    await s.frame(78); // the ruler's own sweep after it is revealed
    const xAt = (f) => track.x0 + (track.x1 - track.x0) * f;
    await s.moveTo(xAt(0.47), track.y, 20);
    await s.moveTo(xAt(0.12), track.y, 46);
    await s.moveTo(xAt(0.86), track.y, 110);
    await s.moveTo(xAt(0.4), track.y, 30);
    await s.frame(12);
    await s.stop();
    await s.close();
  },

  /** Landing scroll story: Revision A push-in, then the model rises and turns into the drawing. */
  async 'c6-story'() {
    const s = await openSession();
    await s.goto('/', 7000);
    const total = await s.page.evaluate(() => {
      const el = document.querySelector('#model');
      return { top: el.getBoundingClientRect().top + scrollY, h: el.offsetHeight - innerHeight };
    });
    await s.page.evaluate((y) => window.scrollTo(0, y), Math.round(total.top + total.h * 0.4));
    await s.idle(2600);
    await s.start('c6-story');
    await s.frame(10);
    await wheel(s, Math.round(total.h * 0.24), 120);
    await s.frame(30);
    await s.stop();
    await s.close();
  },
};

const which = process.argv[2] ?? 'all';
const order = which === 'all' ? Object.keys(SCENES) : which.split(',');
for (const name of order) {
  const t0 = Date.now();
  try {
    console.log(`▶ ${name}`);
    await SCENES[name]();
  } catch (e) {
    console.log(`✗ ${name}: ${e.stack}`);
    await abortSessions();
  }
  console.log(`  ${name} took ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
