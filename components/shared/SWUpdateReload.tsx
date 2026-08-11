'use client';

import { useEffect } from 'react';

interface MinimalWorkbox {
  addEventListener(type: 'controlling', listener: () => void): void;
}

declare global {
  interface Window {
    workbox?: MinimalWorkbox;
  }
}

/**
 * @ducanh2912/next-pwa enables skipWaiting + clientsClaim, so a new service
 * worker installs and takes control of open tabs automatically in the
 * background — but workbox-window only *emits* a 'controlling' event when
 * that happens, it never reloads the page itself. Without this listener, an
 * already-open tab keeps running the OLD JavaScript indefinitely (until the
 * next full navigation), even though the new service worker is already
 * active underneath it — and a stale tab risks a ChunkLoadError fetching a
 * hashed chunk that no longer exists in the new build's precache.
 *
 * Reload only once the tab is backgrounded, never while it's actively being
 * used — this app handles crisis conversations and journal entries, and a
 * surprise reload mid-task is a real cost, not just an inconvenience.
 */
export function SWUpdateReload() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let updateReady = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let giveUpId: ReturnType<typeof setTimeout> | undefined;

    const reloadIfHidden = () => {
      if (updateReady && document.visibilityState === 'hidden') {
        window.location.reload();
      }
    };

    const attach = (wb: MinimalWorkbox) => {
      wb.addEventListener('controlling', () => {
        updateReady = true;
        reloadIfHidden();
      });
      document.addEventListener('visibilitychange', reloadIfHidden);
    };

    if (window.workbox) {
      attach(window.workbox);
    } else {
      // next-pwa's own registration script isn't guaranteed to have run
      // before this effect — poll briefly rather than silently miss it.
      pollId = setInterval(() => {
        if (window.workbox) {
          clearInterval(pollId);
          attach(window.workbox);
        }
      }, 100);
      giveUpId = setTimeout(() => clearInterval(pollId), 10000);
    }

    return () => {
      clearInterval(pollId);
      clearTimeout(giveUpId);
      document.removeEventListener('visibilitychange', reloadIfHidden);
    };
  }, []);

  return null;
}
