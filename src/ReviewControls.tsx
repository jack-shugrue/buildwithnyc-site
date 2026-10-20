import { Switch } from '@nycopportunity/react';
import { useEffect, useState } from 'react';
import { setPageMotion } from './motion.ts';

/*
 * For reviewing options with the team, not for visitors: two switches in the
 * bottom-right corner, shown only when the address ends in ?review (and for
 * the rest of that visit). Visitors always get the defaults: page animation
 * on, regular content start. Remove this once the team has decided.
 */

const REVIEW = 'buildwithnyc:review';

/** Review mode: ?review in the address, or turned on earlier this visit. */
function isReviewing() {
  try {
    if (new URLSearchParams(window.location.search).has('review')) {
      sessionStorage.setItem(REVIEW, 'on');
      return true;
    }
    return sessionStorage.getItem(REVIEW) === 'on';
  } catch {
    return new URLSearchParams(window.location.search).has('review');
  }
}

/** A switch's setting, remembered in this browser (when storage allows). */
function useSaved(key: string, initial: boolean) {
  const [isOn, setIsOn] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === 'on';
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, isOn ? 'on' : 'off');
    } catch {
      // Private window or blocked storage: it just isn't remembered.
    }
  }, [key, isOn]);
  return [isOn, setIsOn] as const;
}

export function ReviewControls() {
  const [isReview] = useState(isReviewing);
  return isReview ? <Switches /> : null;
}

/**
 * Page animation: new pages ease in, or appear at once. Lower content start:
 * each page's content starts further below the header.
 */
function Switches() {
  const [isMotionOn, setMotionOn] = useSaved('buildwithnyc:page-motion', true);
  const [isLower, setLower] = useSaved('buildwithnyc:content-start-lower', false);
  useEffect(() => setPageMotion(isMotionOn), [isMotionOn]);
  useEffect(() => {
    if (isLower) document.documentElement.dataset.start = 'lower';
    else delete document.documentElement.dataset.start;
  }, [isLower]);
  return (
    <div className="review-controls">
      <Switch size="small" isSelected={isMotionOn} onChange={setMotionOn}>
        Page animation
      </Switch>
      <Switch size="small" isSelected={isLower} onChange={setLower}>
        Lower content start
      </Switch>
    </div>
  );
}
