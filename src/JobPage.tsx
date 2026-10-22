import {
  Accordion,
  AccordionItem,
  ArrowUpRightIcon,
  InfoBlock,
  PageNav,
} from '@nycopportunity/react';
import { Link as AriaLink } from 'react-aria-components';
import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { jobPage, settings } from './content.ts';
import type { JobPosting } from './content.ts';
import { Markdown } from './Markdown.tsx';
import { useIsDesktop } from './useIsDesktop.ts';

/** The page's sections, in order: their ids and headings, also the page nav's links. */
const SECTIONS = [
  // The top of the page: the title, the facts and How to apply.
  { id: 'overview', label: 'Overview' },
  { id: 'about-the-role', label: 'About the role' },
  { id: 'responsibilities', label: 'Responsibilities' },
  { id: 'skills', label: 'Skills we’re seeking' },
  { id: 'education', label: 'Education and experience' },
  { id: 'benefits', label: 'Benefits and compensation' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
const heading = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.label;

/** Height of the sticky site header, so a section chosen in the page nav lands below it. */
const HEADER_HEIGHT = 60;

/**
 * A job posting: the team, title and lead; then How to apply, one panel with
 * the key facts and the two steps (each with its button); then the role,
 * responsibilities, skills (an accordion: a title per skill, what it means in
 * this role inside), education and benefits; and a closing card to apply.
 *
 * Desktop adds the page nav's bars at the right. Phones and tablets get a
 * floating apply button once step 1's has scrolled away; it settles into the
 * closing card's button, as the home page's View work buttons do.
 */
export function JobPage({ job }: { job: JobPosting }) {
  const isDesktop = useIsDesktop();
  const stepOneApply = useRef<HTMLAnchorElement>(null);
  const cardSlot = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = `${job.title}, ${job.team} | ${settings.siteTitle}`;
    return () => {
      document.title = previous;
    };
  }, [job]);

  const section = (id: SectionId, children: ReactNode) => (
    <section id={id} className="job-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="section-title">
        {heading(id)}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="job">
      {/* Overview: the top of the page (the page nav's first link). */}
      <div id="overview" className="job__layout">
        {/* In reading order: the title, then "On this page", then the job.
            After a page switch focus lands on the title, so Tab goes straight
            to the page nav. The layout shows the nav at the right. */}
        <header className="job__header">
          <p className="job__team">{job.team}</p>
          <h1 id="job-title" className="job__title">
            {job.title}
          </h1>
          <p className="job__lead">{job.lead}</p>
        </header>
        {isDesktop && (
          <PageNav
            variant="bars"
            side="right"
            growFrom="top"
            items={SECTIONS.map(({ id, label }) => ({ id, label }))}
            topOffset={HEADER_HEIGHT}
            className="job__nav"
          />
        )}
        <article className="job__main" aria-labelledby="job-title">

          {/* The key facts, each in its own tile. */}
          <dl className="job-facts">
            <div className="job-fact">
              <dt>Salary</dt>
              <dd>{job.salary}</dd>
            </div>
            <div className="job-fact">
              <dt>Schedule</dt>
              <dd>{job.schedule}</dd>
            </div>
            <div className="job-fact">
              <dt>Location</dt>
              <dd>{job.location}</dd>
            </div>
            <div className="job-fact">
              <dt>NYC Jobs ID</dt>
              <dd>{job.jobId}</dd>
            </div>
          </dl>

          {/* How to apply: the two steps, each with its button. */}
          <section id="how-to-apply" className="job-panel" aria-labelledby="how-to-apply-title">
            <h2 id="how-to-apply-title" className="job-panel__title">
              How to apply
            </h2>
            {/* Safari's VoiceOver drops list semantics when markers are hidden;
                the explicit role keeps "list, 2 items" for the two steps. */}
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ol className="job-steps" role="list">
              <li>
                <div className="job-steps__body">
                  <p>{jobPage.stepOne}</p>
                  <AriaLink
                    ref={stepOneApply}
                    href={job.applyHref}
                    className="nyco-button nyco-button--primary job-steps__button"
                  >
                    Apply now
                  </AriaLink>
                </div>
              </li>
              <li>
                <div className="job-steps__body">
                  <p>{jobPage.stepTwo.replaceAll('{jobId}', job.jobId)}</p>
                  <AriaLink
                    href={job.portalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nyco-button nyco-button--secondary job-steps__button"
                  >
                    Apply on NYC Jobs
                    <ArrowUpRightIcon />
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </AriaLink>
                </div>
              </li>
            </ol>
          </section>
          {/* Plain text, lined up with the panel's left edge. */}
          {job.applyNotes.map((note, i) => (
            <p key={i} className="job-text job-note">
              {note}
            </p>
          ))}

          {section(
            'about-the-role',
            <>
              <Markdown text={job.about} paragraphClass="job-text" />
              {job.aboutNote && <InfoBlock className="job-info">{job.aboutNote}</InfoBlock>}
            </>,
          )}

          {section(
            'responsibilities',
            <Markdown text={job.responsibilities} paragraphClass="job-text" listClass="job-list" />,
          )}

          {section(
            'skills',
            <>
              {job.skillsIntro && <p className="job-text">{job.skillsIntro}</p>}
              <Accordion variant="filled" icon="chevron" onlyOneOpen className="job-skills">
                {job.skills.map((skill, i) => (
                  <AccordionItem key={i} id={`skill-${i}`} title={skill.title}>
                    <p className="job-text">{skill.body}</p>
                  </AccordionItem>
                ))}
              </Accordion>
            </>,
          )}

          {section(
            'education',
            <Markdown text={job.education} paragraphClass="job-text" />,
          )}

          {section(
            'benefits',
            <Markdown text={job.benefits} paragraphClass="job-text" />,
          )}
        </article>
      </div>

      {/* The closing card, margin to margin: the question on two lines, then a
          full-width button. On phones and tablets that button is where the
          floating one lands. */}
      <section ref={card} className="apply-card" aria-labelledby="apply-card-title">
        <h2 id="apply-card-title" className="apply-card__title">
          {/* A space between the lines, so screen readers don't run them
              together; between block lines it doesn't show. */}
          {jobPage.applyCardTitle.map((line, i) => (
            <Fragment key={line}>
              {i > 0 && ' '}
              <span>{line}</span>
            </Fragment>
          ))}
        </h2>
        <div ref={cardSlot} className="apply-card__action">
          <AriaLink href={job.applyHref} className="nyco-button nyco-button--primary">
            {jobPage.applyCardButton}
          </AriaLink>
        </div>
      </section>

      {!isDesktop && (
        <FloatingApply
          href={job.applyHref}
          label={jobPage.applyCardButton}
          start={stepOneApply}
          slot={cardSlot}
          card={card}
        />
      )}
    </div>
  );
}

/** Over the last this-many px before landing, it shrinks to size and its shadow fades. */
const DOCK_DISTANCE = 120;
/** A line once crossed has to be crossed back by this much, so it never flickers. */
const HYSTERESIS = 6;

type State = 'hidden' | 'up' | 'docked';

/**
 * Phones and tablets: the apply button floats at the bottom of the screen
 * once step 1's Apply now has scrolled away: a 56px pill with a shadow. As
 * the closing card scrolls up, it settles down onto the card's own button,
 * following the scroll: it widens from its own width to the card button's
 * (filling the card), its corners go from round to the card button's
 * (concentric with the card), and its shadow fades. Then it hands over;
 * scrolling back up lifts it off again. Scrolling back above step 1 sends it
 * down out of view. The card's gray and its words fade in once the button
 * has landed, and fade out as it lifts off.
 */
function FloatingApply({
  href,
  label,
  start,
  slot,
  card,
}: {
  href: string;
  label: string;
  start: RefObject<HTMLElement | null>;
  slot: RefObject<HTMLElement | null>;
  /** The closing card: its gray and its words fade in once the button has landed. */
  card: RefObject<HTMLElement | null>;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const state = useRef<State>('hidden');

  useLayoutEffect(() => {
    const el = wrapper.current!;
    const button = el.querySelector('a')!;

    const setState = (next: State) => {
      const previous = state.current;
      if (next === previous) return;
      // Landing and lifting off happen in place, with no slide.
      const instant = next === 'docked' || previous === 'docked';
      if (instant) el.dataset.instant = '';
      el.dataset.state = next;
      el.inert = next !== 'up';
      state.current = next;
      if (slot.current) slot.current.style.visibility = next === 'up' ? 'hidden' : '';
      // While the button floats, the card waits unseen; once it has landed
      // (or isn't floating at all) the card's gray and words fade in.
      if (card.current) card.current.toggleAttribute('data-waiting', next === 'up');
      if (instant) {
        void el.offsetHeight;
        delete el.dataset.instant;
      }
    };

    const measure = () => {
      const top = start.current?.getBoundingClientRect();
      const landing = slot.current?.getBoundingClientRect();
      if (!top || !landing) return;
      const floatTop = el.offsetTop + button.offsetTop;
      const isDocked = state.current === 'docked';
      const landLine = floatTop + (isDocked ? HYSTERESIS : 0);
      const progress = Math.max(0, Math.min(1, (landing.top - floatTop) / DOCK_DISTANCE));
      el.style.setProperty('--float', String(progress));
      // Widen from its own width as a pill toward the card button's as it lands.
      button.style.inlineSize = '';
      const pillWidth = button.getBoundingClientRect().width;
      const target = slot.current?.querySelector('a')?.getBoundingClientRect().width ?? pillWidth;
      button.style.inlineSize = `${target + (pillWidth - target) * progress}px`;
      if (top.bottom >= 0) setState('hidden');
      else if (landing.top <= landLine) setState('docked');
      else setState('up');
    };

    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    // Content can move without a scroll, e.g. a skill opening above the card.
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    const slotEl = slot.current;
    const cardEl = card.current;
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      resize.disconnect();
      if (slotEl) slotEl.style.visibility = '';
      cardEl?.removeAttribute('data-waiting');
    };
  }, [start, slot, card]);

  return (
    <div ref={wrapper} className="floating-apply" data-state="hidden" inert>
      <AriaLink href={href} className="nyco-button nyco-button--primary">
        {label}
      </AriaLink>
    </div>
  );
}
