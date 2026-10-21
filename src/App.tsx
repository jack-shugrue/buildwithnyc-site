import {
  Accordion,
  AccordionItem,
  Button,
  Footer,
  InfoBlock,
  NewsletterSignup,
  SiteHeader,
  SiteHeaderLink,
  SiteHeaderMenu,
} from '@nycopportunity/react';
import { Link as AriaLink, RouterProvider } from 'react-aria-components';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { JobPage } from './JobPage.tsx';
import { Lightbox } from './Lightbox.tsx';
import { Markdown } from './Markdown.tsx';
import { MediaCarousel } from './MediaCarousel.tsx';
import { arrive, enterPage } from './motion.ts';
import { ReviewControls } from './ReviewControls.tsx';
import { NYC_BADGE_PATH } from './nycBadge.ts';
import { WorkButton } from './WorkButton.tsx';
import {
  BASE,
  closedJobs,
  hero,
  jobs,
  links,
  newsletter,
  openPositions,
  openPositionsSection,
  ourWork,
  sections,
  settings,
} from './content.ts';
import type { ClosedJob, JobPosting, WorkSection } from './content.ts';
import { useBalancedText } from './useBalancedText.ts';
import { useIsDesktop } from './useIsDesktop.ts';

/**
 * What an address shows: the home page (BASE), an open job (BASE<slug>.html),
 * a closed job's old address (the home page, at Open positions, with a
 * note), or, for anything else, a page pointing to the open positions.
 */
type Page =
  | { kind: 'home'; closed?: ClosedJob }
  | { kind: 'job'; job: JobPosting }
  | { kind: 'not-found' };

function pageAt(address: string): Page {
  const path = new URL(address).pathname;
  if (path === BASE || path === `${BASE}index.html`) return { kind: 'home' };
  if (path.startsWith(BASE)) {
    const slug = path.slice(BASE.length).replace(/\.html$/, '');
    const job = jobs.find((j) => j.slug === slug);
    if (job) return { kind: 'job', job };
    const closed = closedJobs.find((j) => j.slug === slug);
    if (closed) return { kind: 'home', closed };
  }
  return { kind: 'not-found' };
}

/** Shows another page, at its top, its first blocks easing in. */
function changePage(update: () => void) {
  flushSync(update);
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Focus moves to the new page's main heading, so screen readers announce
  // it ("Sr. Product Strategist, heading level 1") and reading continues
  // from there, as the page switches in place instead of loading. It isn't a
  // control, so it shows no ring. (On a job page the "On this page" nav comes
  // before the heading: Shift+Tab reaches it.)
  const heading = document.querySelector<HTMLElement>('#main h1') ?? document.getElementById('main');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.setAttribute('data-nyco-page-nav-target', '');
    heading.focus({ preventScroll: true });
  }
  enterPage();
}

function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 42 15" className="logo__badge">
        <path d={NYC_BADGE_PATH} fill="currentColor" />
      </svg>
      <span className="logo__name">Opportunity</span>
    </span>
  );
}

export function App() {
  const [lightbox, setLightbox] = useState<{ section: WorkSection; byKeyboard: boolean } | null>(
    null,
  );
  const hasOpenings = openPositions.length > 0;
  const isDesktop = useIsDesktop();
  // Links between pages switch in place (no page load), so there's no flash.
  const [page, setPage] = useState(() => pageAt(window.location.href));
  const isHome = page.kind === 'home';
  useBalancedText(page.kind === 'job' ? page.job.slug : page.kind);

  useEffect(() => {
    if (page.kind === 'job') return; // The job page names itself.
    document.title =
      page.kind === 'home' ? settings.siteTitle : `Page not found | ${settings.siteTitle}`;
  }, [page]);

  /** Goes to a link on this site in place: another page, or a #section. */
  const go = useCallback((link: string) => {
    const to = new URL(link, window.location.href);
    const isNewPage = to.pathname !== window.location.pathname;
    history.pushState(null, '', to.href);
    if (isNewPage) changePage(() => setPage(pageAt(to.href)));
    // A new page starts at the top, then a moment later glides to its
    // section. On the same page, straight there.
    arrive(to.hash, isNewPage);
  }, []);

  useEffect(() => {
    // Plain links (the library's react-aria links and menu items go through
    // RouterProvider below).
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const to = new URL(link.href);
      if (to.origin !== window.location.origin || !to.pathname.startsWith(BASE)) return;
      event.preventDefault();
      go(to.href);
    };
    const onPop = () => changePage(() => setPage(pageAt(window.location.href)));
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    const first = pageAt(window.location.href);
    if (first.kind === 'home' && first.closed) {
      // A closed job's old address: the home page's address, then down to the
      // open positions, where a note says the job has closed.
      history.replaceState(null, '', links.openPositions);
      window.scrollTo({ top: 0, behavior: 'instant' });
      arrive('#open-positions', true);
    } else if (window.location.hash) {
      // Opened at a #section (a link from elsewhere): from the top, then there.
      window.scrollTo({ top: 0, behavior: 'instant' });
      arrive(window.location.hash, true);
    }
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
    };
  }, [go]);

  return (
    <RouterProvider navigate={go}>
      {/* First stop for keyboard users: past the header's links to the page. */}
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <SiteHeader
        logo={<Logo />}
        homeLabel={`${settings.siteTitle} home`}
        homeHref={links.home}
        isSticky
        hideOnScroll
      >
        <SiteHeaderLink href={links.about}>About</SiteHeaderLink>
        <SiteHeaderLink href={links.contact}>Contact</SiteHeaderLink>
        {/* Desktop: Careers is a dropdown of the jobs. Phones: one flat list. */}
        {isDesktop ? (
          <SiteHeaderMenu label="Careers">
            <SiteHeaderLink href={links.openPositions}>Open positions</SiteHeaderLink>
            {openPositions.map((job) => (
              <SiteHeaderLink key={job.href} href={job.href}>
                {job.title}
              </SiteHeaderLink>
            ))}
          </SiteHeaderMenu>
        ) : (
          <>
            <SiteHeaderLink href={links.openPositions}>Open positions</SiteHeaderLink>
            {openPositions.map((job) => (
              <SiteHeaderLink key={job.href} href={job.href}>
                {job.title}
              </SiteHeaderLink>
            ))}
          </>
        )}
        <SiteHeaderLink href={links.nycOpportunity} external>
          NYC Opportunity
        </SiteHeaderLink>
      </SiteHeader>

      <main id="main" tabIndex={-1} className="page">
        {page.kind === 'job' && <JobPage key={page.job.slug} job={page.job} />}
        {page.kind === 'not-found' && <NotFound />}
        {page.kind === 'home' && (
          <>
            <section className="hero">
              <h1 className="hero__title">{hero.title}</h1>
              <p className="hero__subtitle">
                <Markdown text={hero.subtitle} inline />
              </p>
              {hasOpenings && (
                <AriaLink
                  href={links.openPositions}
                  className="nyco-button nyco-button--primary hero__apply"
                >
                  {hero.applyLabel}
                </AriaLink>
              )}
            </section>

            <section className="our-work" aria-labelledby="our-work-title">
              <h2 id="our-work-title" className="section-title">
                {ourWork.title}
              </h2>
              <Accordion variant="filled" icon="chevron" onlyOneOpen>
                {ourWork.items.map((item) => (
                  <AccordionItem key={item.id} id={item.id} title={item.title}>
                    <Markdown text={item.body} />
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {sections.map((section) => {
              const text = (
                <>
                  <h2 id={`${section.id}-title`} className="section-title">
                    {section.title}
                  </h2>
                  <Markdown text={section.body} paragraphClass="work-section__text" />
                </>
              );
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="work-section"
                  aria-labelledby={`${section.id}-title`}
                >
                  {/* Keyed per layout, so crossing the breakpoint builds each one fresh
                      instead of reusing the other's elements. */}
                  {isDesktop ? (
                    // Desktop: the work in a carousel beside the text. The text
                    // comes first in the page's order (the heading, its links,
                    // then the carousel's arrows: top to bottom); the layout
                    // shows the carousel at the left.
                    <Fragment key="desktop">
                      <div className="work-section__body">{text}</div>
                      <MediaCarousel items={section.work} label={`${section.title} work`} />
                    </Fragment>
                  ) : (
                    <Fragment key="phone">
                      {text}
                      {/* Where the floating button lands at the end of the section. */}
                      <div className="work-section__action" data-work-slot>
                        <Button
                          variant="neutral"
                          size="small"
                          className="pill"
                          onPress={(event) =>
                            setLightbox({ section, byKeyboard: event.pointerType === 'keyboard' })
                          }
                        >
                          {section.buttonLabel}
                        </Button>
                      </div>
                    </Fragment>
                  )}
                </section>
              );
            })}

            <section
              id="open-positions"
              className="open-positions"
              aria-labelledby="open-positions-title"
            >
              <h2 id="open-positions-title" className="open-positions__title">
                {/* A space between the lines, so screen readers don't run them
                    together; between block lines it doesn't show. */}
                {openPositionsSection.title.map((line, i) => (
                  <Fragment key={line}>
                    {i > 0 && ' '}
                    <span>{line}</span>
                  </Fragment>
                ))}
              </h2>
              {page.closed && (
                <InfoBlock className="open-positions__notice">
                  {hasOpenings
                    ? `The ${page.closed.title} position has closed. These are the positions open now.`
                    : `The ${page.closed.title} position has closed.`}
                </InfoBlock>
              )}
              {hasOpenings ? (
                <ul className="open-positions__list">
                  {openPositions.map((job) => (
                    // The whole row opens the job: its title link covers the
                    // row. Apply now goes to the same page, so it's the row's
                    // look, not a second link: one stop per job for keyboard
                    // and screen reader users, and clicks pass through to the row.
                    <li key={job.href} className="open-positions__row">
                      <AriaLink href={job.href} className="open-positions__job">
                        {job.title}
                      </AriaLink>
                      <span
                        aria-hidden="true"
                        className="nyco-button nyco-button--secondary nyco-button--small"
                      >
                        {openPositionsSection.applyLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                // No jobs open: the message written in the CMS instead.
                <div className="open-positions__empty">
                  <Markdown text={openPositionsSection.emptyMessage} paragraphClass="job-text" />
                </div>
              )}
            </section>
          </>
        )}

        {/* Home only: a job page closes with its own apply card instead. */}
        {isHome && (
          <div id="newsletter">
            <NewsletterSignup
              className="newsletter"
              titleStyle={isDesktop ? 'h2' : 'h3'}
              title={newsletter.title}
              buttonLabel={newsletter.buttonLabel}
              href={newsletter.href}
            />
          </div>
        )}
      </main>

      <Footer
        variant="minimal"
        logo={<Logo />}
        homeLabel={`${settings.siteTitle} home`}
        homeHref={links.home}
        className="footer"
        hideGroupTitles
        sections={
          isDesktop
            ? [
                {
                  links: [
                    { label: 'About', href: links.about },
                    { label: 'Contact', href: links.contact },
                  ],
                },
                {
                  title: 'Careers',
                  links: [
                    { label: 'Open positions', href: links.openPositions },
                    ...openPositions.map((job) => ({ label: job.title, href: job.href })),
                  ],
                },
                {
                  links: [{ label: 'NYC Opportunity', href: links.nycOpportunity, external: true }],
                },
              ]
            : [
                {
                  links: [
                    { label: 'About', href: links.about },
                    { label: 'Contact', href: links.contact },
                    { label: 'Open positions', href: links.openPositions },
                    { label: 'NYC Opportunity', href: links.nycOpportunity, external: true },
                  ],
                },
              ]
        }
      />

      {/* Home page, phones only: on desktop each section shows its work in a carousel. */}
      {isHome && !isDesktop && (
        <WorkButton
          sections={sections}
          onOpen={(section, byKeyboard) => setLightbox({ section, byKeyboard })}
        />
      )}
      {isHome && (
        <Lightbox
          section={lightbox?.section ?? null}
          returnFocus={lightbox?.byKeyboard ?? false}
          onClose={() => setLightbox(null)}
        />
      )}
      <ReviewControls />
    </RouterProvider>
  );
}

/** Any other address, e.g. an old site's page: where to go instead. */
function NotFound() {
  return (
    <section className="hero not-found">
      <h1 className="hero__title">This page has moved, or the position has closed.</h1>
      <p className="hero__subtitle">See the positions open now, or start from our home page.</p>
      <div className="not-found__actions">
        <AriaLink href={links.openPositions} className="nyco-button nyco-button--primary">
          See open positions
        </AriaLink>
        <AriaLink href={links.home} className="nyco-button nyco-button--secondary">
          Go to the home page
        </AriaLink>
      </div>
    </section>
  );
}
