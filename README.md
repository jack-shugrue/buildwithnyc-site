# NYC Opportunity careers site

The careers site for the NYC Mayor's Office for Economic Opportunity. Pilot address:
https://jack-shugrue.github.io/buildwithnyc-site/

## Editing content (no code)

Content is edited in [Pages CMS](https://app.pagescms.org): sign in with GitHub and open this
repository. There are four sections:

- **Jobs:** one entry per job. Set **Status** to *Draft* (saved, not shown), *Open* (published) or
  *Closed* (taken down). Open jobs appear in the menu, the footer and Open positions on their own.
  A closed job's old link takes people to the open positions, with a note that it has closed.
- **Home page:** the top of the page, Our Work, the work sections (with their images and videos),
  and Open positions.
- **Words on every job page:** the How to apply steps and the closing card.
- **Site settings:** the site's name and description, contact email, links and newsletter.

Each save publishes the site in about 2 minutes. If something required is left empty, the site
isn't updated. The **Actions** tab on GitHub shows which field to fill in, and the live site
keeps its last good version until then.

A job's address is its file name, made from its title when it's created, e.g.
`/sr-software-engineer.html`.

## Reviewing options

Add `?review` to the address, e.g. https://jack-shugrue.github.io/buildwithnyc-site/?review, to
show two switches in the bottom-right corner: page animation on or off, and a lower content
start. Only people with that address see them. Remove `ReviewControls` once the team decides.

## Development

```
npm install
npm run dev     # http://localhost:5181/buildwithnyc-site/
npm run build   # into dist/
```

- `content/`: the content (YAML), as Pages CMS saves it. `.pages.yml` defines its forms.
- `scripts/content.ts`: reads and checks the content at build time.
- `src/`: the site (React). Components come from the NYCO component library.
- `vite.config.ts`: the site's address (`SITE`), and the pages the build writes: one per open
  job, one for each closed job's old address, a 404 page and the sitemap.
- `public/media/`: uploaded images and videos, kept as uploaded.
- `scripts/media.ts`: at build time, photos get resized WebP copies (640, 1280 and 1920px wide,
  offered as a `srcset`) and videos get a poster (their first frame, via ffmpeg, which the publish
  workflow installs; local builds without ffmpeg skip posters). Copies go in `dist/media/_opt/`. Videos over 10 MB stop the build.
- `scripts/rich-text.ts`: turns the CMS's formatted text into a small tree at build time, so
  visitors don't download a Markdown parser.

### The component library

`vendor/` holds a built copy of `@nycopportunity/react` and `@nycopportunity/tokens`, named after
the library commit it came from (currently c81d90a, nyco-ui PR #51: page nav Escape). To update it, build the library, run `npm pack` in
`packages/react` and `packages/tokens`, replace the files in `vendor/`, update the two paths in
`package.json`, and run `npm install`. Once the library is published, depend on it directly.

### Moving the site

Change `SITE` in `vite.config.ts` (for `buildwithnyc.github.io`: `url`
`https://buildwithnyc.github.io`, `base` `/`). Every link and media path follows. In the new
repository's Settings > Pages, set the source to "GitHub Actions".
