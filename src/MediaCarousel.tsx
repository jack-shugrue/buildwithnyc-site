import { Button, ChevronLeftIcon, ChevronRightIcon } from '@nycopportunity/react';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Slides } from './Slides.tsx';
import type { WorkItem } from './content.ts';

/** How far a pointer has to travel sideways to change the slide. */
const SWIPE_PX = 40;

interface MediaCarouselProps {
  items: WorkItem[];
  /** Names the carousel for screen readers, e.g. "Digital & Data Products work". */
  label: string;
}

/**
 * Desktop's stand-in for the lightbox: a team's work in a gray frame beside
 * the section text. Progress dots sit inside the frame at the bottom (they
 * show where you are; they aren't buttons), and previous / next arrows below
 * it loop around at the ends. A single
 * item shows no controls. Swipe or drag to change slides too. A looping
 * video gets a pause / play button in the frame's bottom-right corner.
 */
export function MediaCarousel({ items, label }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  // Null until the first step, so the first item is simply there.
  const [direction, setDirection] = useState<'next' | 'previous' | null>(null);
  const swipeStart = useRef<number | null>(null);
  const hasMany = items.length > 1;

  /** One step back or forward, looping at the ends; builds on the latest slide. */
  function step(by: 1 | -1) {
    setDirection(by === 1 ? 'next' : 'previous');
    setIndex((i) => (i + by + items.length) % items.length);
  }

  function onPointerUp(event: PointerEvent) {
    if (swipeStart.current === null || !hasMany) return;
    const dx = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1);
  }

  if (!items.length) return null;

  return (
    <div className="carousel" role="group" aria-roledescription="carousel" aria-label={label}>
      <div
        className="carousel__frame"
        onPointerDown={(event) => (swipeStart.current = event.clientX)}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        <Slides
          items={items}
          index={index}
          direction={direction}
          slideClassName="carousel__slide"
        />

        {/* Progress, not controls: the arrows move between items. 8px dots are
            too small to tap reliably (WCAG 2.5.8 asks for 24px targets). */}
        {hasMany && (
          <div className="carousel__dots" aria-hidden="true">
            {items.map((_, i) => (
              <span key={i} className="carousel__dot" data-current={i === index || undefined} />
            ))}
          </div>
        )}
        {/* Tells screen readers where they are after each step. */}
        <p className="visually-hidden" aria-live="polite">
          {hasMany ? `${index + 1} of ${items.length}` : ''}
        </p>
      </div>

      {hasMany && (
        <div className="carousel__controls">
          <Button
            iconOnly
            variant="neutral"
            size="small"
            aria-label="Previous"
            className="pill"
            onPress={() => step(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            iconOnly
            variant="neutral"
            size="small"
            aria-label="Next"
            className="pill"
            onPress={() => step(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
