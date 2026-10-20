import { Button, PauseIcon, PlayIcon } from '@nycopportunity/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WorkItem } from './content.ts';

/** How far a slide moves as it arrives or leaves. */
const DISTANCE = 16;
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'; // motion.slide.easing
const IN_MS = 300;
const OUT_MS = 200;

const prefersStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface SlidesProps {
  items: WorkItem[];
  index: number;
  /** Which way the last step went; null before the first step. */
  direction: 'next' | 'previous' | null;
  /** Class for each slide, for its layout inside the frame. */
  slideClassName: string;
}

/**
 * A team's media, stacked in one frame, shared by the desktop carousel and the
 * phone lightbox.
 *
 * Every item stays loaded, so nothing reloads or blanks between steps. A step
 * runs in two parts that never overlap: the old item fades out sliding 16px
 * away, then the new one fades in sliding 16px into place. The first item is
 * simply there.
 *
 * Looping videos play only while showing, and get a pause / play button in
 * the frame's bottom-right corner, always visible so anyone can find it
 * (WCAG 2.2.2). They start paused with reduced motion.
 */
export function Slides({ items, index, direction, slideClassName }: SlidesProps) {
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const previous = useRef(index);
  const [isPaused, setIsPaused] = useState(prefersStill);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = index;
    if (from === index || !direction || prefersStill()) return;
    // A step during a step: drop what's running and start from here.
    for (const slide of slides.current) slide?.getAnimations().forEach((a) => a.cancel());
    const dx = direction === 'next' ? DISTANCE : -DISTANCE;
    slides.current[from]?.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: `translateX(${-dx}px)` },
      ],
      { duration: OUT_MS, easing: 'ease-in' },
    );
    // The new item waits, hidden, until the old one has gone.
    slides.current[index]?.animate(
      [
        { opacity: 0, transform: `translateX(${dx}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: IN_MS, delay: OUT_MS, easing: EASING, fill: 'backwards' },
    );
  }, [index, direction]);

  // Only the showing video plays, unless it's been paused.
  useEffect(() => {
    videos.current.forEach((video, i) => {
      if (!video) return;
      if (i === index && !isPaused) void video.play().catch(() => {});
      else video.pause();
    });
  }, [index, isPaused, items]);

  const showsVideo = items[index]?.type === 'video';

  return (
    <>
      {items.map((item, i) => (
        <div
          key={i}
          ref={(el) => {
            slides.current[i] = el;
          }}
          className={slideClassName}
          data-fit={item.fit ?? 'contain'}
          data-active={i === index || undefined}
          aria-hidden={i !== index || undefined}
          inert={i !== index}
        >
          {item.type === 'video' ? (
            <video
              ref={(el) => {
                videos.current[i] = el;
              }}
              src={item.src}
              aria-label={item.alt}
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <img src={item.src} alt={item.alt} draggable={false} />
          )}
        </div>
      ))}
      {showsVideo && (
        <Button
          iconOnly
          variant="neutral"
          size="small"
          aria-label={isPaused ? 'Play video' : 'Pause video'}
          className="media-toggle"
          onPress={() => setIsPaused((paused) => !paused)}
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </Button>
      )}
    </>
  );
}
