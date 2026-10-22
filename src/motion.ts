/**
 * Moving between pages: a new page's top eases in, and a trip to a #section
 * glides there. Both stop the moment someone clearly takes over (scrolls,
 * drags, types or clicks), but not on a stray mouse move or a tiny nudge of
 * a trackpad or wheel.
 */

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The prototype's switch: ease a new page in, or show it at once. */
let isPageMotionOn = true;
export function setPageMotion(isOn: boolean) {
  isPageMotionOn = isOn;
}

/** How long a new page shows its top before gliding to the #section asked for. */
const ARRIVAL_PAUSE = 600;

/** Scrolling this far in one go (wheel or trackpad) means it's on purpose. */
const WHEEL_INTENT = 40;
/** A finger dragging this far means it's on purpose. */
const TOUCH_INTENT = 12;

/**
 * Calls `onIntent` once someone clearly takes over: scrolls 40px or more in
 * one go, drags a finger 12px, presses a key, or clicks or taps. Mouse moves
 * never count. Starts listening a moment later, so the click or key that
 * started things isn't taken for one. Returns a function that stops it.
 */
function watchForIntent(onIntent: () => void) {
  let wheel = 0;
  let lastWheel = 0;
  let touchY: number | null = null;
  const fire = () => {
    stop();
    onIntent();
  };
  const onWheel = (event: WheelEvent) => {
    // A pause of 200ms starts a new gesture.
    if (event.timeStamp - lastWheel > 200) wheel = 0;
    lastWheel = event.timeStamp;
    wheel += Math.abs(event.deltaY);
    if (wheel >= WHEEL_INTENT) fire();
  };
  const onTouchStart = (event: TouchEvent) => {
    touchY = event.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (event: TouchEvent) => {
    const y = event.touches[0]?.clientY;
    if (touchY !== null && y !== undefined && Math.abs(y - touchY) >= TOUCH_INTENT) fire();
  };
  const onKey = (event: KeyboardEvent) => {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) fire();
  };
  const listeners = [
    ['wheel', onWheel],
    ['touchstart', onTouchStart],
    ['touchmove', onTouchMove],
    ['keydown', onKey],
    ['mousedown', fire],
  ] as const;
  const timer = window.setTimeout(() => {
    for (const [type, listener] of listeners) {
      window.addEventListener(type, listener as EventListener, { passive: true });
    }
  });
  function stop() {
    window.clearTimeout(timer);
    for (const [type, listener] of listeners) {
      window.removeEventListener(type, listener as EventListener);
    }
  }
  return stop;
}

/** The blocks at the top of each page that ease in, in order. */
const ENTERING = [
  '.hero > *',
  '.our-work',
  '.job__header > *',
  '.job-facts',
  '.job-panel',
  '.job-note',
].join(', ');

/**
 * A new page's top eases in: each block in view fades in, rising 3px, a
 * beat (70ms) after the one above, over 900ms on a long, gentle ease-out.
 * Subtle, and it finishes at once if someone starts scrolling, typing or
 * clicking.
 */
export function enterPage() {
  if (!isPageMotionOn || prefersReducedMotion()) return;
  const main = document.getElementById('main');
  if (!main) return;
  const blocks = [...main.querySelectorAll<HTMLElement>(ENTERING)].filter(
    (el) => el.getBoundingClientRect().top < window.innerHeight,
  );
  const timing = {
    duration: 900,
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    fill: 'backwards',
  } as const;
  const animations = blocks.map((el, i) =>
    el.animate(
      [
        { opacity: 0, translate: '0 0.1875rem' },
        { opacity: 1, translate: '0 0' },
      ],
      { ...timing, delay: i * 70 },
    ),
  );
  // The page nav (desktop) just fades: its own translate places it.
  const nav = document.querySelector<HTMLElement>('.job__nav');
  if (nav) animations.push(nav.animate([{ opacity: 0 }, { opacity: 1 }], timing));
  const stop = watchForIntent(() => animations.forEach((a) => a.finish()));
  Promise.all(animations.map((a) => a.finished)).then(stop, stop);
}

/** Ease in and out (cubic): starts and ends gently. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The trip under way, if any: a new one cancels it. */
let cancelTrip = () => {};

/**
 * Goes to a #section: after `isNewPage`'s pause (the page's top showing
 * first), glides there, then moves focus to it so the next Tab continues
 * from there. Scrolling on purpose during the pause or the glide cancels it,
 * and leaves people where they are. No section (#, #top): the top of the
 * page, when already on it (`isNewPage` false).
 */
export function arrive(hash: string, isNewPage: boolean) {
  cancelTrip();
  const id = decodeURIComponent(hash.slice(1));
  const section = id ? document.getElementById(id) : null;
  if (!section && isNewPage) return;
  // The skip link: the main content takes focus at once (screen readers
  // start reading there, and the link, losing focus, fades away instead of
  // riding the scroll); the page glides there meanwhile.
  if (section?.id === 'main') section.focus({ preventScroll: true });
  let frame = 0;
  const pause = window.setTimeout(glide, isNewPage ? ARRIVAL_PAUSE : 0);
  const stopWatching = watchForIntent(() => cancelTrip());
  cancelTrip = () => {
    window.clearTimeout(pause);
    cancelAnimationFrame(frame);
    stopWatching();
    cancelTrip = () => {};
  };

  function glide() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const to = section ? Math.min(max, section.getBoundingClientRect().top + window.scrollY) : 0;
    const from = window.scrollY;
    const distance = to - from;
    if (prefersReducedMotion() || Math.abs(distance) < 2) {
      window.scrollTo({ top: to, behavior: 'instant' });
      done();
      return;
    }
    // Longer trips take a little longer: 500 to 1200ms.
    const duration = Math.min(1200, Math.max(500, Math.abs(distance) / 3));
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo({ top: from + distance * easeInOut(t), behavior: 'instant' });
      if (t < 1) frame = requestAnimationFrame(step);
      else done();
    };
    frame = requestAnimationFrame(step);
  }

  function done() {
    cancelTrip();
    const target = section ?? document.getElementById('main');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    // No focus ring: it's not a control (see the library's PageNav.css).
    target.setAttribute('data-nyco-page-nav-target', '');
    target.focus({ preventScroll: true });
  }
}
