import { Button, ChevronLeftIcon, ChevronRightIcon, Link } from '@nycopportunity/react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Slides } from './Slides.tsx';
import type { WorkSection } from './content.ts';

/** Matches the close fade in styles.css. */
const CLOSE_MS = 200;
/** How far a finger has to travel sideways to change the slide. */
const SWIPE_PX = 40;

interface LightboxProps {
  /** The section whose work to show; null keeps the lightbox closed. */
  section: WorkSection | null;
  /**
   * Opened from the keyboard: on close, focus goes back to the button that
   * opened it, with its focus ring. Opened by touch or mouse, nothing keeps
   * focus, so no ring appears on the page.
   */
  returnFocus: boolean;
  onClose: () => void;
}

/**
 * Full-screen gallery of a team's work: one image or looping video at a
 * time, an optional gray label and link under it, a [1/6] count, and
 * previous / Close / next at the bottom. Swipe, arrow keys and the arrows
 * all loop around at the ends. Escape closes.
 */
export function Lightbox({ section, returnFocus, onClose }: LightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  // Null until the first step, so the first item is simply there on open.
  const [direction, setDirection] = useState<'next' | 'previous' | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const swipeStart = useRef<number | null>(null);

  const items = section?.work ?? [];
  const item = items[index];

  useEffect(() => {
    const el = dialog.current;
    if (!el || !section) return;
    if (el.open) return;
    setIndex(0);
    setDirection(null);
    setIsClosing(false);
    el.showModal();
    // Focus the lightbox itself, so no control shows a focus ring on open.
    // Tab reaches the link and the buttons; Escape and the arrow keys work.
    el.focus();
    // Keep the page behind still while the lightbox is open.
    document.documentElement.classList.add('is-locked');
    return () => document.documentElement.classList.remove('is-locked');
  }, [section]);

  function close() {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      dialog.current?.close();
      if (!returnFocus) (document.activeElement as HTMLElement | null)?.blur();
      onClose();
    }, CLOSE_MS);
  }

  function step(by: 1 | -1) {
    if (items.length < 2) return;
    setDirection(by === 1 ? 'next' : 'previous');
    setIndex((i) => (i + by + items.length) % items.length);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') step(document.dir === 'rtl' ? -1 : 1);
    if (event.key === 'ArrowLeft') step(document.dir === 'rtl' ? 1 : -1);
  }

  function onPointerDown(event: PointerEvent) {
    swipeStart.current = event.clientX;
  }

  function onPointerUp(event: PointerEvent) {
    if (swipeStart.current === null) return;
    const dx = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1);
  }

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      tabIndex={-1}
      data-closing={isClosing || undefined}
      aria-label={section ? `${section.title} work` : undefined}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={onKeyDown}
    >
      {section && item && (
        <div className="lightbox__layout">
          <div
            className="lightbox__media"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipeStart.current = null)}
          >
            <Slides
              key={section.id}
              items={items}
              index={index}
              direction={direction}
              slideClassName="lightbox__slide"
            />
          </div>

          <div className="lightbox__caption">
            <div className="lightbox__text">
              {item.label && <p className="lightbox__label">{item.label}</p>}
              {item.link && (
                <Link
                  href={item.link.href}
                  external
                  variant="standalone"
                  className="lightbox__link"
                >
                  {item.link.text}
                </Link>
              )}
            </div>
            <p className="lightbox__count" aria-live="polite">
              <span aria-hidden="true">
                [{index + 1}/{items.length}]
              </span>
              <span className="visually-hidden">
                {index + 1} of {items.length}
              </span>
            </p>
          </div>

          <div className="lightbox__controls">
            {items.length > 1 && (
              <Button
                iconOnly
                variant="neutral"
                size="small"
                aria-label="Previous"
                className="pill lightbox__arrow"
                onPress={() => step(-1)}
              >
                <ChevronLeftIcon />
              </Button>
            )}
            <Button variant="neutral" size="small" className="pill lightbox__close" onPress={close}>
              Close
            </Button>
            {items.length > 1 && (
              <Button
                iconOnly
                variant="neutral"
                size="small"
                aria-label="Next"
                className="pill lightbox__arrow"
                onPress={() => step(1)}
              >
                <ChevronRightIcon />
              </Button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
