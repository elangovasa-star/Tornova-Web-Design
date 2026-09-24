// jsdom has no matchMedia; the layout asks it for the mobile breakpoint.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
}

// jsdom has no real scrollIntoView (it logs "not implemented" and does nothing); FAQ deep-linking calls it.
Element.prototype.scrollIntoView = function () {};
