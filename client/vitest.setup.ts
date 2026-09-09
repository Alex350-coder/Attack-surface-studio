import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia. Anything using useReducedMotion (BackgroundLayer and its
// consumers: the Hero, /login, /register, WorkspaceShell) needs this to render in tests at all.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
