/*
 * Uploaded media, made web-ready at build time (never in the CMS):
 *
 * - Photos and screenshots (JPG, PNG, WebP) get resized WebP copies, 640,
 *   1280 and 1920px wide (never wider than the original). The page offers
 *   them as a srcset, so each screen downloads the smallest that's sharp
 *   enough. The upload itself stays untouched, as the source.
 * - Videos get a poster: a still of their first frame, shown before they
 *   play (and instead of playing, for people who've asked for less motion).
 *   That needs ffmpeg, which GitHub's build machines have; without it the
 *   build skips posters.
 *
 * Copies go in dist/media/_opt/, named after the file's contents, so a
 * replaced upload never shows a stale copy.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';
import type { SiteContent } from '../src/types.ts';

const WIDTHS = [640, 1280, 1920];
/** How wide media shows: half the screen in the desktop carousel, all of it in the phone lightbox. */
const SIZES = '(min-width: 1024px) 50vw, 100vw';

type Task =
  | { kind: 'image'; file: string; out: string; width: number }
  | { kind: 'poster'; file: string; out: string };

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

/**
 * Plans the copies for every uploaded image and video, and points the
 * content at them (srcset, sizes, poster). Run before the site is bundled.
 */
export async function planMedia(root: string, content: SiteContent): Promise<Task[]> {
  const { base } = content;
  const tasks: Task[] = [];
  for (const section of content.home.sections) {
    for (const item of section.work) {
      if (!item.src.startsWith(`${base}media/`)) continue;
      const file = join(root, 'public', item.src.slice(base.length));
      const stem = `${basename(file, extname(file))}-${createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8)}`;
      if (item.type === 'image' && /\.(jpe?g|png|webp)$/i.test(file)) {
        const { width = 0 } = await sharp(file).metadata();
        const widths = [...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1)!)];
        const unique = [...new Set(widths)];
        for (const w of unique) tasks.push({ kind: 'image', file, out: `${stem}-${w}.webp`, width: w });
        item.srcset = unique.map((w) => `${base}media/_opt/${stem}-${w}.webp ${w}w`).join(', ');
        item.sizes = SIZES;
        // The largest copy, for anything that ignores srcset.
        item.src = `${base}media/_opt/${stem}-${unique.at(-1)}.webp`;
      } else if (item.type === 'video' && hasFfmpeg) {
        tasks.push({ kind: 'poster', file, out: `${stem}-poster.webp` });
        item.poster = `${base}media/_opt/${stem}-poster.webp`;
      } else if (item.type === 'video') {
        console.log(`media: no ffmpeg here, so ${basename(file)} has no poster in this build.`);
      }
    }
  }
  return tasks;
}

/** Writes the planned copies into the built site. Run after it's bundled. */
export async function writeMedia(tasks: Task[], outDir: string) {
  const dir = join(outDir, 'media', '_opt');
  mkdirSync(dir, { recursive: true });
  await Promise.all(
    tasks.map(async (task) => {
      const out = join(dir, task.out);
      if (task.kind === 'image') {
        await sharp(task.file).resize({ width: task.width }).webp({ quality: 82 }).toFile(out);
      } else {
        const frame = execFileSync(
          'ffmpeg',
          ['-loglevel', 'error', '-i', task.file, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'],
          { maxBuffer: 64 * 1024 * 1024 },
        );
        await sharp(frame).webp({ quality: 82 }).toFile(out);
      }
    }),
  );
}
