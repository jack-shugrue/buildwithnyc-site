import { Button } from '@nycopportunity/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WorkSection } from './content.ts';

/**
 * A section's button rises once its heading and about a line of its text are
 * on screen: the heading's top this far above the bottom of the screen.
 */
const RISE_OFFSET = 128;
/**
 * Buffer at each threshold: once crossed, a line has to be crossed back by
 * this much before the button changes again, so a finger resting near a
 * line (or a trackpad's small back-and-forth) can't make it flicker.
 */
const HYSTERESIS = 6;
/** Matches the leave transition in styles.css. */
const LEAVE_MS = 200;
/**
 * Over the last this-many px of scrolling before the section's own button
 * reaches the floating one, the floating one settles down onto the page:
 * it shrinks to the in-page button's size and its shadow and frosting fade.
 */
const DOCK_DISTANCE = 120;

type Phase = 'down' | 'raising' | 'up' | 'leaving';

/** The in-page button at the end of a section, which the floating one lands on. */
export const slotFor = (id: string) =>
  document.querySelector<HTMLElement>(`#${CSS.escape(id)} [data-work-slot]`);

interface WorkButtonProps {
  sections: WorkSection[];
  /** `byKeyboard`: opened from the keyboard, so focus should come back with a focus ring. */
  onOpen: (section: WorkSection, byKeyboard: boolean) => void;
}

/**
 * The floating "View ___ work" button.
 *
 * - It rises from below the screen once its section's heading is on screen.
 * - It floats above the page: a touch larger than actual size, frosted, with
 *   a shadow. As the section's own button (centered under it, at the end of
 *   the text) scrolls up to meet it, it settles down onto the page, linked
 *   to scrolling, and hands over: the floating one disappears and the
 *   in-page one stays with the page.
 * - Scrolling back up reverses it: the in-page button lifts back off the
 *   page and floats again.
 * - If the section changes any other way (a fast jump, or scrolling up past
 *   the heading), it shrinks and fades away instead.
 *
 * Positions update on every scroll event, outside React, so the settling
 * tracks the finger; React only renders the label.
 */
export function WorkButton({ sections, onOpen }: WorkButtonProps) {
  const [shownId, setShownId] = useState<string | null>(null);
  const [raiseCount, setRaiseCount] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const machine = useRef({
    phase: 'down' as Phase,
    shown: null as string | null,
    target: null as string | null,
    /** 1 while far from the landing spot, 0 on it. */
    progress: 1,
    timer: 0,
  });

  // The in-page button is hidden while the floating one stands in for it.
  const syncSlots = useRef(() => {
    const m = machine.current;
    for (const section of sections) {
      const slot = slotFor(section.id);
      if (slot)
        slot.style.visibility = m.shown === section.id && m.phase !== 'down' ? 'hidden' : '';
    }
  });

  const setPhase = useRef((phase: Phase) => {
    const m = machine.current;
    m.phase = phase;
    const el = wrapper.current;
    if (el) {
      el.dataset.phase = phase;
      el.inert = phase !== 'up';
    }
    syncSlots.current();
  });

  const sync = useRef(() => {
    const m = machine.current;
    const next = m.target;
    if (m.phase === 'leaving') return; // The leave timer syncs again when it ends.
    if (m.phase === 'up') {
      if (m.shown === next) return;
      setPhase.current('leaving');
      m.timer = window.setTimeout(() => {
        setPhase.current('down');
        sync.current();
      }, LEAVE_MS);
      return;
    }
    // Down, or about to rise: (re)start the rise with the latest section.
    if (!next) {
      setPhase.current('down');
      return;
    }
    m.phase = 'raising';
    m.shown = next;
    setShownId(next);
    setRaiseCount((n) => n + 1);
  });

  // Once the new label has rendered below the screen, send it up.
  useLayoutEffect(() => {
    const m = machine.current;
    if (m.phase !== 'raising') return;
    const el = wrapper.current!;
    // Lifting off the in-page button (scrolling back up): appear right where
    // it is, with no rise from below.
    const liftOff = m.progress < 1;
    if (liftOff) el.dataset.instant = '';
    void el.offsetHeight; // Commit the lowered position first, so it animates.
    setPhase.current('up');
    if (liftOff) {
      void el.offsetHeight;
      delete el.dataset.instant;
    }
    sync.current(); // In case the section changed meanwhile.
  }, [raiseCount]);

  useEffect(() => {
    const m = machine.current;
    const el = wrapper.current!;
    const button = el.querySelector('button')!;

    const measure = () => {
      const bottom = window.innerHeight;
      // Where the floating button's top sits when it's up (layout position,
      // so the rise and leave transforms don't skew it).
      const floatTop = el.offsetTop + button.offsetTop;
      let target: string | null = null;
      let docked: string | null = null;
      let progress = 1;

      for (const section of sections) {
        const heading = document.getElementById(section.id)?.getBoundingClientRect();
        const slot = slotFor(section.id)?.getBoundingClientRect();
        // The section that has the button keeps it a little longer either way.
        const holding = section.id === m.target;
        const riseLine = bottom - RISE_OFFSET + (holding ? HYSTERESIS : 0);
        const landLine = floatTop + (holding ? 0 : HYSTERESIS);
        if (!heading || !slot || heading.top > riseLine) continue;
        if (slot.top > landLine) {
          target = section.id;
          progress = Math.min(1, (slot.top - floatTop) / DOCK_DISTANCE);
        } else {
          docked = section.id;
        }
      }

      // Settle toward the page; a leaving button keeps its look.
      if (
        m.phase !== 'leaving' &&
        (m.shown === target || m.phase === 'down' || m.phase === 'raising')
      ) {
        el.style.setProperty('--float', String(progress));
      }

      m.target = target;
      m.progress = progress;
      // Landed: hand over to the in-page button at once, with no exit motion.
      if (docked && docked === m.shown && (m.phase === 'up' || m.phase === 'raising')) {
        window.clearTimeout(m.timer);
        setPhase.current('down');
      }
      sync.current();
    };

    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    // Content can move without a scroll: an accordion opening above a section
    // pushes it down the page. Re-measure whenever the page's height changes.
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    return () => {
      window.clearTimeout(m.timer);
      // Leaving (e.g. the window widened to desktop): show the in-page buttons again.
      for (const section of sections) {
        const slot = slotFor(section.id);
        if (slot) slot.style.visibility = '';
      }
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      resize.disconnect();
    };
  }, [sections]);

  const section = sections.find((s) => s.id === shownId);

  return (
    <div ref={wrapper} className="work-button" data-phase="down" inert>
      <Button
        variant="neutral"
        size="small"
        className="work-button__button pill"
        onPress={(event) => section && onOpen(section, event.pointerType === 'keyboard')}
      >
        {section?.buttonLabel ?? ''}
      </Button>
    </div>
  );
}
