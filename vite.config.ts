import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { loadContent } from './scripts/content.ts';
import type { SiteContent } from './src/types.ts';

/*
 * Where the site lives. Moving it (to buildwithnyc.github.io, or a custom
 * domain) means changing these two lines: every link and media path follows.
 */
const SITE = {
  /** The address, without the path. */
  url: 'https://jack-shugrue.github.io',
  /** The path under it, starting and ending with "/". "/" at a domain's root. */
  base: '/buildwithnyc-site/',
};

const root = fileURLToPath(new URL('.', import.meta.url));
const VIRTUAL = 'virtual:content';
const RESOLVED = `\0${VIRTUAL}`;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The <head> tags for one page: title, description, link previews. */
function meta(content: SiteContent, page: { title: string; description: string; path: string; index?: boolean }) {
  const url = `${SITE.url}${content.base}${page.path}`;
  return [
    `<title>${escape(page.title)}</title>`,
    `<meta name="description" content="${escape(page.description)}" />`,
    page.index === false ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="website" />`,
  ].join('\n    ');
}

/**
 * Content and pages:
 * - `virtual:content` hands the site its content (see scripts/content.ts).
 * - The build writes a page for each open job (<slug>.html), one for each
 *   closed job's old address (it shows the open positions, with a note),
 *   404.html for any other address, and a sitemap. They all load the same
 *   app; each has its own title and description for search and link previews.
 * - The dev server answers <slug>.html addresses with the app too.
 */
function sitePages(): Plugin {
  let content: SiteContent | undefined;
  let isServe = false;
  const load = () => (content = loadContent(root, SITE.base));
  return {
    name: 'site-pages',
    configResolved(config) {
      isServe = config.command === 'serve';
    },
    buildStart() {
      // Locally, a content problem shows on the page (from load below) and
      // clears once fixed; a build stops on it.
      if (isServe) return;
      load();
      this.addWatchFile(`${root}content`);
    },
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      return `export default ${JSON.stringify(load())};`;
    },
    configureServer(server) {
      server.watcher.add(`${root}content`);
      server.watcher.on('change', (file) => {
        if (!file.startsWith(`${root}content`)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      });
      // /base/<slug>.html → the app (in production these are real files).
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split(/[?#]/)[0] ?? '';
        if (path.startsWith(SITE.base) && /^[a-z0-9-]+\.html$/.test(path.slice(SITE.base.length)))
          req.url = `${SITE.base}index.html`;
        next();
      });
    },
    transformIndexHtml(html) {
      let c = content;
      try {
        c ??= load();
      } catch {
        return html; // The app's content import shows the problem.
      }
      return html.replace(
        /<!--meta-->[\s\S]*?<!--\/meta-->/,
        `<!--meta-->${meta(c, { title: c.settings.siteTitle, description: c.settings.description, path: '' })}<!--/meta-->`,
      );
    },
    closeBundle(error) {
      // A failed build (e.g. a content problem) has nothing to write.
      if (error || !content) return;
      const out = `${root}dist/`;
      const shell = readFileSync(`${out}index.html`, 'utf8');
      const page = (file: string, head: string) =>
        writeFileSync(`${out}${file}`, shell.replace(/<!--meta-->[\s\S]*?<!--\/meta-->/, head));
      const c = content;
      const site = c.settings.siteTitle;
      for (const job of c.jobs) {
        page(
          `${job.slug}.html`,
          meta(c, {
            title: `${job.title}, ${job.team} | ${site}`,
            description: job.lead,
            path: `${job.slug}.html`,
          }),
        );
      }
      for (const job of c.closedJobs) {
        page(
          `${job.slug}.html`,
          meta(c, {
            title: `Open positions | ${site}`,
            description: c.settings.description,
            path: `${job.slug}.html`,
            index: false,
          }),
        );
      }
      page(
        '404.html',
        meta(c, { title: `Page not found | ${site}`, description: c.settings.description, path: '404.html', index: false }),
      );
      const urls = ['', ...c.jobs.map((job) => `${job.slug}.html`)];
      writeFileSync(
        `${out}sitemap.xml`,
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((path) => `  <url><loc>${SITE.url}${SITE.base}${path}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      );
    },
  };
}

export default defineConfig({
  base: SITE.base,
  plugins: [react(), sitePages()],
  server: { port: 5181 },
  preview: { port: 5182 },
});
