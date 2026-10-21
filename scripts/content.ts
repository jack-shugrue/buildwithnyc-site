/*
 * Reads the site's content: the YAML files in content/ that Pages CMS edits.
 * Runs at build time (and in the dev server), never in the browser.
 *
 * It checks the content as it reads it. A missing required field stops the
 * build with a message naming the file and the field, so a half-finished
 * edit never reaches the live site: it keeps showing the last good build.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { toRichText } from './rich-text.ts';
import type { ClosedJob, JobPosting, SiteContent, WorkItem, WorkSection } from '../src/types.ts';

type Data = Record<string, unknown>;

/** The largest video the build accepts, in MB (about 3 MB is best). */
const MAX_VIDEO_MB = 10;

/** Fields as Pages CMS labels them (.pages.yml), for problem messages. */
const LABELS: Record<string, string> = {
  title: 'Title',
  team: 'Team',
  lead: 'Summary',
  salary: 'Salary',
  schedule: 'Schedule',
  location: 'Location',
  jobId: 'NYC Jobs ID',
  applyUrl: 'Application form link',
  nycJobsUrl: 'NYC Jobs posting link',
  about: 'About the role',
  responsibilities: 'Responsibilities',
  education: 'Education and experience',
  benefits: 'Benefits and compensation',
  subtitle: 'Subtitle',
  applyLabel: 'Button label',
  body: 'Text',
  buttonLabel: 'View work button label',
  image: 'Image',
  video: 'Video',
  alt: 'Description for screen readers',
  emptyMessage: 'Message when no jobs are open',
  applyCardTitle: 'Closing card heading',
  applyCardButton: 'Closing card button label',
  stepOne: 'How to apply, step 1',
  stepTwo: 'How to apply, step 2',
  siteTitle: 'Site name',
  description: 'Site description',
  contactEmail: 'Contact email',
  nycOpportunityUrl: 'NYC Opportunity link',
  'newsletter.title': 'Newsletter heading',
  'newsletter.buttonLabel': 'Newsletter button label',
  'newsletter.url': 'Newsletter sign-up link',
};

/** Lowercase words joined by hyphens, for #anchors. */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function loadContent(root: string, base: string): SiteContent {
  const dir = join(root, 'content');
  const problems: string[] = [];

  /** Reads one YAML file; media paths get the site's base path. */
  const read = (file: string, name = file): Data => {
    const path = join(dir, file);
    if (!existsSync(path)) {
      problems.push(`${name}: the file (content/${file}) is missing.`);
      return {};
    }
    try {
      return withBase((parse(readFileSync(path, 'utf8')) ?? {}) as Data, base) as Data;
    } catch (error) {
      problems.push(`${name}: couldn't be read (${(error as Error).message.split('\n')[0]}).`);
      return {};
    }
  };

  /** A field's text, trimmed. Required fields report a problem when empty. */
  const text = (
    data: Data,
    field: string,
    file: string,
    required = true,
    label = LABELS[field] ?? field,
  ): string => {
    const value = field.split('.').reduce<unknown>((at, key) => (at as Data | undefined)?.[key], data);
    const result = typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
    if (required && !result) problems.push(`${file}: "${label}" is empty.`);
    return result;
  };

  const list = <T>(data: Data, field: string): T[] => {
    const value = data[field];
    return Array.isArray(value) ? (value as T[]) : [];
  };

  const lines = (data: Data, field: string, file: string) => {
    const result = list<unknown>(data, field)
      .map((line) => String(line ?? '').trim())
      .filter(Boolean);
    if (!result.length)
      problems.push(`${file}: "${LABELS[field] ?? 'Heading'}" needs at least one line.`);
    return result;
  };

  // Settings
  const s = read('settings.yml', 'Site settings');
  const settings: SiteContent['settings'] = {
    siteTitle: text(s, 'siteTitle', 'Site settings'),
    description: text(s, 'description', 'Site settings'),
    contactEmail: text(s, 'contactEmail', 'Site settings'),
    nycOpportunityUrl: text(s, 'nycOpportunityUrl', 'Site settings'),
    newsletter: {
      title: text(s, 'newsletter.title', 'Site settings'),
      buttonLabel: text(s, 'newsletter.buttonLabel', 'Site settings'),
      href: text(s, 'newsletter.url', 'Site settings'),
    },
  };

  // Home page
  const h = read('home.yml', 'Home page');
  const hero = (h.hero ?? {}) as Data;
  const ourWork = (h.ourWork ?? {}) as Data;
  const open = (h.openPositions ?? {}) as Data;
  const sections: WorkSection[] = list<Data>(h, 'sections').map((section, i) => {
    const where = `Home page, work section ${i + 1}`;
    const title = text(section, 'title', where);
    return {
      id: slugify(title) || `section-${i + 1}`,
      title,
      body: toRichText(text(section, 'body', where)),
      buttonLabel: text(section, 'buttonLabel', where),
      work: list<Data>(section, 'media').map((item, j): WorkItem => {
        const at = `${where}, media ${j + 1}`;
        const type = item.kind === 'video' ? 'video' : 'image';
        const linkText = text(item, 'linkText', at, false);
        const linkUrl = text(item, 'linkUrl', at, false);
        const src = text(item, type === 'video' ? 'video' : 'image', at);
        // Videos play as uploaded: keep them small so pages stay quick.
        if (type === 'video' && src.startsWith(`${base}media/`)) {
          const file = join(root, 'public', src.slice(base.length));
          const mb = existsSync(file) ? statSync(file).size / 1_000_000 : 0;
          if (mb > MAX_VIDEO_MB)
            problems.push(
              `${at}: the video is ${mb.toFixed(1)} MB. Compress it to under ${MAX_VIDEO_MB} MB (about 3 MB is best), e.g. at compress.lochie.me, then upload it again.`,
            );
        }
        return {
          type,
          src,
          alt: text(item, 'alt', at),
          label: text(item, 'caption', at, false) || undefined,
          link: linkText && linkUrl ? { text: linkText, href: linkUrl } : undefined,
          fit: item.fit === 'cover' ? 'cover' : 'contain',
        };
      }),
    };
  });
  const home: SiteContent['home'] = {
    hero: {
      title: text(hero, 'title', 'Home page, top of the page'),
      subtitle: toRichText(text(hero, 'subtitle', 'Home page, top of the page')),
      applyLabel: text(hero, 'applyLabel', 'Home page, top of the page'),
    },
    ourWork: {
      title: text(ourWork, 'title', 'Home page, Our Work'),
      items: list<Data>(ourWork, 'items').map((item, i) => {
        const title = text(item, 'title', `Home page, Our Work item ${i + 1}`);
        return {
          id: slugify(title) || `item-${i + 1}`,
          title,
          body: toRichText(text(item, 'body', `Home page, Our Work item ${i + 1}`)),
        };
      }),
    },
    sections,
    openPositions: {
      title: lines(open, 'title', 'Home page, Open positions'),
      applyLabel: text(open, 'applyLabel', 'Home page, Open positions'),
      emptyMessage: toRichText(text(open, 'emptyMessage', 'Home page, Open positions')),
    },
  };

  // Words on every job page
  const p = read('job-page.yml', 'Words on every job page');
  const jobPage: SiteContent['jobPage'] = {
    applyCardTitle: lines(p, 'applyCardTitle', 'Words on every job page'),
    applyCardButton: text(p, 'applyCardButton', 'Words on every job page'),
    stepOne: text(p, 'stepOne', 'Words on every job page'),
    stepTwo: text(p, 'stepTwo', 'Words on every job page'),
  };

  // Jobs: one file each; the file name is the address.
  const jobsDir = join(dir, 'jobs');
  const files = existsSync(jobsDir)
    ? readdirSync(jobsDir).filter((f) => /\.ya?ml$/.test(f))
    : [];
  const jobs: (JobPosting & { posted: string })[] = [];
  const closedJobs: ClosedJob[] = [];
  for (const file of files) {
    const where = `jobs/${file}`;
    const slug = file.replace(/\.ya?ml$/, '');
    if (!/^[a-z0-9-]+$/.test(slug)) {
      problems.push(`${where}: file names may only use lowercase letters, numbers and hyphens.`);
      continue;
    }
    const j = read(join('jobs', file));
    const status = String(j.status ?? 'draft');
    // Drafts aren't checked or built: they can be half-written.
    if (status === 'draft') continue;
    if (status === 'closed') {
      closedJobs.push({ slug, title: text(j, 'title', where, true, 'Job title') });
      continue;
    }
    if (status !== 'open') {
      problems.push(`${where}: "Status" must be Draft, Open or Closed.`);
      continue;
    }
    jobs.push({
      slug,
      href: `${base}${slug}.html`,
      posted: text(j, 'posted', where, false),
      title: text(j, 'title', where, true, 'Job title'),
      team: text(j, 'team', where),
      lead: text(j, 'lead', where),
      salary: text(j, 'salary', where),
      schedule: text(j, 'schedule', where),
      location: text(j, 'location', where),
      jobId: text(j, 'jobId', where),
      applyHref: text(j, 'applyUrl', where),
      portalHref: text(j, 'nycJobsUrl', where),
      applyNotes: list<unknown>(j, 'applyNotes')
        .map((note) => String(note ?? '').trim())
        .filter(Boolean),
      about: toRichText(text(j, 'about', where)),
      aboutNote: text(j, 'aboutNote', where, false) || undefined,
      responsibilities: toRichText(text(j, 'responsibilities', where)),
      skillsIntro: text(j, 'skillsIntro', where, false) || undefined,
      skills: list<Data>(j, 'skills').map((skill, i) => ({
        title: text(skill, 'title', `${where}, skill ${i + 1}`, true, 'Skill'),
        body: text(skill, 'description', `${where}, skill ${i + 1}`, true, 'What it means in this role'),
      })),
      education: toRichText(text(j, 'education', where)),
      benefits: toRichText(text(j, 'benefits', where)),
    });
  }

  if (problems.length) {
    throw new Error(
      `The site's content has ${problems.length} problem${problems.length > 1 ? 's' : ''} to fix before it can be published:\n` +
        problems.map((problem) => `  - ${problem}`).join('\n'),
    );
  }

  // Newest first; jobs without a date after the dated ones, by title.
  jobs.sort(
    (a, b) => (b.posted || '').localeCompare(a.posted || '') || a.title.localeCompare(b.title),
  );
  return {
    base,
    settings,
    home,
    jobPage,
    jobs: jobs.map(({ posted: _posted, ...job }) => job),
    closedJobs,
  };
}

/** Pages CMS saves uploads as /media/…; the site may live under a base path. */
function withBase(value: unknown, base: string): unknown {
  if (typeof value === 'string') {
    return value.startsWith('/media/') ? `${base}${value.slice(1)}` : value;
  }
  if (Array.isArray(value)) return value.map((item) => withBase(item, base));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withBase(v, base)]));
  }
  return value;
}
