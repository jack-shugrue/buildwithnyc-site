import { useEffect } from 'react';

/** Description text: section copy, lists, steps, notes. (Leads aren't
    balanced: they read best running wider than the title above them.) */
const SELECTOR = [
  '.work-section__text',
  '.job-text',
  '.job-list > li',
  '.job-steps p',
  '.job-info',
  '.job-note',
  '.open-positions__job',
].join(', ');

/** Browsers balance up to about 6 lines and ignore `balance` past that. */
const MAX_BALANCED_LINES = 6;

/**
 * Even line lengths, with no last line of just a word or two.
 *
 * Text of up to 6 lines gets `text-wrap: balance` (lines of near-equal
 * length). Longer text keeps `pretty` (the stylesheet's default), since
 * browsers don't balance it. Re-checked whenever the page's width or
 * height changes (resizing, fonts loading, an accordion opening), because
 * the line counts change with it.
 */
export function useBalancedText(key: unknown) {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) {
        delete el.dataset.wrap; // Measure as `pretty`.
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        const lines = Math.round(el.getBoundingClientRect().height / lineHeight);
        if (lines > 1 && lines <= MAX_BALANCED_LINES) el.dataset.wrap = 'balance';
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    run();
    // Width changes (resizing, fonts loading) change the line counts.
    let width = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      schedule();
    };
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(schedule);
    // Content opening (an accordion) reveals text that measured as empty.
    let height = document.body.offsetHeight;
    const content = new ResizeObserver(() => {
      if (document.body.offsetHeight === height) return;
      height = document.body.offsetHeight;
      schedule();
    });
    content.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      content.disconnect();
    };
  }, [key]);
}
