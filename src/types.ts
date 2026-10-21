/**
 * Text written in the CMS with formatting, already parsed at build time
 * (scripts/rich-text.ts): words, or an element with children.
 */
export type RichNode =
  | string
  | { t: 'p' | 'strong' | 'em' | 'a' | 'br' | 'ul' | 'ol' | 'li'; href?: string; c: RichNode[] };
export type RichText = RichNode[];

/*
 * The shape of the site's content, after scripts/content.ts reads the files
 * in content/ (the ones Pages CMS edits). Formatted text (RichText) may
 * hold paragraphs, bold, italics, links and lists.
 */

export interface WorkItem {
  type: 'image' | 'video';
  src: string;
  /** Describes the image for screen readers. Videos loop silently, so describe them too. */
  alt: string;
  /** Optional gray line under the media: the team, or a few words about the work. */
  label?: string;
  /** Optional link under the label, to the product or site. */
  link?: { text: string; href: string };
  /**
   * How it sits in the desktop carousel's gray frame: `contain` (default)
   * shows all of it with gray around it, for screenshots; `cover` fills the
   * frame edge to edge, cropping as needed, for photos.
   */
  fit?: 'contain' | 'cover';
  /** Images: resized copies made at build time (WebP), for the browser to pick from. */
  srcset?: string;
  /** Images: how wide it shows, so the browser picks the right copy. */
  sizes?: string;
  /** Videos: a still of the first frame, shown before it plays (made at build time). */
  poster?: string;
}

export interface WorkSection {
  /** Made from the title: the section's #anchor. */
  id: string;
  title: string;
  /** Formatted text. */
  body: RichText;
  /** The floating button's label, e.g. "View Product work". */
  buttonLabel: string;
  work: WorkItem[];
}

/** One open job: everything its page shows. */
export interface JobPosting {
  /** Its file name, and its address: /<slug>.html. */
  slug: string;
  /** Its page, with the site's base path. */
  href: string;
  title: string;
  /** The team, shown above the title, e.g. "Digital & Data Products". */
  team: string;
  /** The opening paragraph, under the title. */
  lead: string;
  salary: string;
  schedule: string;
  location: string;
  /** The job's ID on the NYC Jobs portal. */
  jobId: string;
  /** The application form. */
  applyHref: string;
  /** The posting on the NYC Jobs portal, where people also apply. */
  portalHref: string;
  /** Notes under How to apply, e.g. response times. */
  applyNotes: string[];
  /** Formatted text. */
  about: RichText;
  /** A short note under About the role, e.g. where the role works from. */
  aboutNote?: string;
  /** Formatted text: a bulleted list, with sub-bullets if needed. */
  responsibilities: RichText;
  skillsIntro?: string;
  /** Each skill: a few-word title, and what it means in this role (shown when opened). */
  skills: { title: string; body: string }[];
  /** Formatted text. */
  education: RichText;
  /** Formatted text. */
  benefits: RichText;
}

/** A closed job: its old address shows the open positions, with a note. */
export interface ClosedJob {
  slug: string;
  title: string;
}

export interface SiteContent {
  /** Where the site lives, e.g. "/buildwithnyc-site/" or "/". */
  base: string;
  settings: {
    siteTitle: string;
    description: string;
    contactEmail: string;
    nycOpportunityUrl: string;
    newsletter: { title: string; buttonLabel: string; href: string };
  };
  home: {
    hero: {
      title: string;
      /** Formatted text, one paragraph. */
      subtitle: RichText;
      applyLabel: string;
    };
    ourWork: { title: string; items: { id: string; title: string; body: RichText }[] };
    sections: WorkSection[];
    openPositions: {
      /** Each item starts a new line. */
      title: string[];
      applyLabel: string;
      /** Formatted text: shown instead of the list when no jobs are open. */
      emptyMessage: RichText;
    };
  };
  jobPage: {
    /** Each item starts a new line. */
    applyCardTitle: string[];
    applyCardButton: string;
    stepOne: string;
    /** "{jobId}" is replaced with the job's NYC Jobs ID. */
    stepTwo: string;
  };
  /** Open jobs, newest first. */
  jobs: JobPosting[];
  closedJobs: ClosedJob[];
}
