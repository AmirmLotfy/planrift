// Frame-exact recorder for the real app. The page clock (Date, timers, requestAnimationFrame,
// performance) is frozen and advanced 1/fps per frame; CSS animations and transitions are frozen
// through the DevTools Animation domain and seeked to the same virtual time. Every frame is a
// screenshot piped into ffmpeg, so motion is perfectly even no matter how slow rendering is.
// Pointer moves are real Playwright input events; their positions are logged for the cursor overlay.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const repo = path.resolve(import.meta.dirname, '..', '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(repo, '.kiro-cache', 'pw-browsers');
const { chromium } = require(path.join(repo, 'node_modules', '@playwright', 'test'));

export const BASE = process.env.CAPTURE_BASE ?? 'https://planrift-omega.vercel.app';
/** DRY=1: run the whole scene logic at 1x without screenshots or encoding (fast check). */
export const DRY = process.env.DRY === '1';
export const OUT = path.resolve(import.meta.dirname, '..', '..', 'public', 'media', 'capture');

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Sessions still open; a failed scene must not leave a browser or an ffmpeg holding a file open
// (a leftover encoder would later overwrite a good capture with the same name).
const live = new Set();

export async function abortSessions() {
  for (const s of live) {
    s.rec?.ff?.kill('SIGKILL');
    await s.browser.close().catch(() => {});
  }
  live.clear();
}

export async function openSession({ width = 1440, height = 810, dpr = DRY ? 1 : 2, fps = 30 } = {}) {
  const browser = await chromium.launch({
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--hide-scrollbars',
    ],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.clock.install();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');

  const session = {
    browser,
    page,
    errors,
    fps,
    width,
    height,
    dpr,
    mouse: { x: width / 2, y: height + 40, down: false },
    rec: null,

    async goto(route, settleMs = 5000) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      const now = await page.evaluate(() => Date.now());
      await page.clock.pauseAt(now + 600);
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
      // Real time passes here: scripts load and React hydrates; no animation frame runs.
      await page.waitForTimeout(settleMs);
    },

    /** Advance virtual time without recording (lets timers and transitions settle). */
    async idle(ms) {
      const n = Math.max(1, Math.round((ms / 1000) * fps));
      for (let i = 0; i < n; i++) {
        await page.clock.runFor(1000 / fps);
        await syncAnimations(page);
      }
    },

    async start(name) {
      mkdirSync(OUT, { recursive: true });
      if (DRY) {
        session.rec = {
          name,
          file: null,
          ff: null,
          done: Promise.resolve(),
          frame: 0,
          cursor: [],
          marks: [],
          boxes: {},
          t0: Date.now(),
        };
        return;
      }
      const file = path.join(OUT, `${name}.mp4`);
      const ff = spawn(
        'ffmpeg',
        [
          '-y',
          '-v',
          'error',
          '-f',
          'image2pipe',
          '-framerate',
          String(fps),
          '-c:v',
          'mjpeg',
          '-i',
          '-',
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '13',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          file,
        ],
        { stdio: ['pipe', 'inherit', 'inherit'] },
      );
      const done = new Promise((resolve, reject) =>
        ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))),
      );
      done.catch(() => {}); // an aborted scene never awaits it
      session.rec = { name, file, ff, done, frame: 0, cursor: [], marks: [], boxes: {}, t0: Date.now() };
    },

    async frame(n = 1) {
      const r = session.rec;
      for (let i = 0; i < n; i++) {
        await page.clock.runFor(1000 / fps);
        await syncAnimations(page);
        if (!DRY) {
          let buf;
          try {
            buf = await page.screenshot({ type: 'jpeg', quality: 94, timeout: 120000 });
          } catch {
            await page.waitForTimeout(3000);
            buf = await page.screenshot({ type: 'jpeg', quality: 94, timeout: 180000 });
          }
          if (!r.ff.stdin.write(buf)) await new Promise((res) => r.ff.stdin.once('drain', res));
        }
        r.cursor.push([
          r.frame,
          Math.round(session.mouse.x * 10) / 10,
          Math.round(session.mouse.y * 10) / 10,
          session.mouse.down ? 1 : 0,
        ]);
        r.frame += 1;
        if (r.frame % 60 === 0)
          process.stdout.write(
            `  ${r.name}: ${r.frame} frames, ${((Date.now() - r.t0) / r.frame).toFixed(0)} ms/frame\n`,
          );
      }
    },

    seconds(s) {
      return session.frame(Math.round(s * fps));
    },

    mark(label) {
      session.rec.marks.push({ label, frame: session.rec.frame });
    },

    async moveTo(x, y, frames = 18) {
      const { x: x0, y: y0 } = session.mouse;
      for (let i = 1; i <= frames; i++) {
        const t = easeInOut(i / frames);
        session.mouse.x = x0 + (x - x0) * t;
        session.mouse.y = y0 + (y - y0) * t;
        await page.mouse.move(session.mouse.x, session.mouse.y);
        if (session.rec) await session.frame(1);
        else await session.idle(1000 / fps);
      }
    },

    async press() {
      await page.mouse.down();
      session.mouse.down = true;
    },

    async release() {
      await page.mouse.up();
      session.mouse.down = false;
    },

    async click(x, y, travel = 18) {
      await session.moveTo(x, y, travel);
      await session.press();
      session.mark('click');
      await session.frame(3);
      await session.release();
      await session.frame(2);
    },

    async type(text, perChar = 3) {
      for (const ch of text) {
        await page.keyboard.type(ch);
        session.mark('key');
        await session.frame(perChar);
      }
    },

    async key(name) {
      await page.keyboard.press(name);
      session.mark('key');
    },

    /**
     * Eased scroll to document y, one window.scrollTo per frame. Wheel input through Lenis lagged
     * behind its targets under the stepped clock; native scrolls are adopted by Lenis as they are.
     */
    async glide(toY, frames) {
      const y0 = await page.evaluate(() => window.scrollY);
      for (let i = 1; i <= frames; i++) {
        const y = Math.round(y0 + (toY - y0) * easeInOut(i / frames));
        await page.evaluate((v) => window.scrollTo(0, v), y);
        if (session.rec) await session.frame(1);
        else await session.idle(1000 / fps);
      }
    },

    /** Logs viewport boxes (CSS px) of elements for overlays drawn in the edit. */
    async boxes(map) {
      for (const [key, locator] of Object.entries(map)) {
        const b = await locator.first().boundingBox();
        if (!b) throw new Error(`box ${key}: element not visible`);
        session.rec.boxes[key] = {
          x: Math.round(b.x),
          y: Math.round(b.y),
          w: Math.round(b.width),
          h: Math.round(b.height),
          frame: session.rec.frame,
        };
      }
    },

    /** Centre of an element in CSS px. */
    async centre(locator) {
      const box = await locator.boundingBox();
      if (!box) throw new Error('element not visible');
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
    },

    async stop() {
      const r = session.rec;
      if (r.ff) r.ff.stdin.end();
      await r.done;
      const meta = {
        name: r.name,
        fps,
        frames: r.frame,
        width: width * dpr,
        height: height * dpr,
        cssScale: dpr,
        cursor: r.cursor,
        marks: r.marks,
        boxes: r.boxes,
      };
      if (!DRY) writeFileSync(path.join(OUT, `${r.name}.json`), JSON.stringify(meta));
      else console.log('  boxes', JSON.stringify(r.boxes));
      console.log(
        `✓ ${r.name}: ${r.frame} frames (${(r.frame / fps).toFixed(1)} s) in ${((Date.now() - r.t0) / 60000).toFixed(1)} min`,
      );
      session.rec = null;
      return meta;
    },

    async close() {
      if (errors.length) console.log('page errors:', errors.slice(0, 5).join(' | '));
      live.delete(session);
      await browser.close();
    },
  };
  live.add(session);
  return session;
}

/** Seek every CSS animation/transition to the virtual time elapsed since it was first seen. */
function syncAnimations(page) {
  return page.evaluate(() => {
    const now = performance.now();
    const seen = (window.__vt ??= new WeakMap());
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) seen.set(a, now);
      a.currentTime = now - seen.get(a);
    }
  });
}
