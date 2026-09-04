/**
 * partialLoader.js
 * Asynchronously loads modular HTML partials and mounts them into index.html
 */

const PARTIALS_CONFIG = [
  { selector: '#mount-header', url: '/partials/header.html' },
  { selector: '#mount-lobby', url: '/partials/view-lobby.html' },
  { selector: '#mount-master', url: '/partials/view-master.html' },
  { selector: '#mount-player', url: '/partials/view-player.html' },
  { selector: '#mount-gameover', url: '/partials/view-gameover.html' },
  { selector: '#mount-modals', url: '/partials/modals.html' }
];

export async function loadAllPartials() {
  await Promise.all(
    PARTIALS_CONFIG.map(async ({ selector, url }) => {
      const mountEl = document.querySelector(selector);
      if (!mountEl) return;

      try {
        const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} loading ${url}`);
        }
        const html = await response.text();
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        mountEl.replaceWith(...template.content.childNodes);
      } catch (err) {
        console.error(`[PartialLoader] Failed to mount ${url}:`, err);
      }
    })
  );
}
