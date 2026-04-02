import '@testing-library/jest-dom/vitest';

// IntersectionObserver is not available in JSDOM — provide a no-op stub
const IntersectionObserverStub = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverStub,
});

Object.defineProperty(window, 'scrollTo', {
    value: () => undefined,
    writable: true,
});

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
    }),
});
