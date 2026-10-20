/*
 * The site's content, read from the files in content/ when the site is built
 * (see scripts/content.ts). Edit it in Pages CMS, not here.
 */
import content from 'virtual:content';

export type { ClosedJob, JobPosting, WorkItem, WorkSection } from './types.ts';

/** Where the site lives, e.g. "/buildwithnyc-site/". Every link starts with it. */
export const BASE = content.base;

export const { settings, home, jobPage, jobs, closedJobs } = content;
export const { hero, ourWork, sections, openPositions: openPositionsSection } = home;
export const newsletter = settings.newsletter;

/** The open jobs, as the menu, footer and Open positions list show them. */
export const openPositions = jobs.map((job) => ({ title: job.title, href: job.href }));

export const links = {
  /** The home page, at its top. */
  home: BASE,
  about: `${BASE}#top`,
  openPositions: `${BASE}#open-positions`,
  contact: `mailto:${settings.contactEmail}`,
  nycOpportunity: settings.nycOpportunityUrl,
};
