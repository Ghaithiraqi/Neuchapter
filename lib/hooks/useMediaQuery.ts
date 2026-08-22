'use client';

import { useEffect, useState } from 'react';

// SSR-safe: starts false (matches server render), syncs to the real match
// once mounted in the browser. Used to gate desktop-only affordances that
// must never assume a viewport size before hydration.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
