import { useSyncExternalStore } from 'react';

/** Desktop layout from here up: the same breakpoint as SiteHeader's links. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Whether the desktop layout applies. Some parts change structure, not just
 * style, between phone and desktop: the header and footer link lists, and the
 * work sections (floating button and lightbox on phones, a carousel on
 * desktop).
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches);
}
