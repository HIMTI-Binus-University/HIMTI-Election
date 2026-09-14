import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

HTMLDialogElement.prototype.showModal = function showModal() {
  this.open = true;
};

HTMLDialogElement.prototype.close = function close() {
  this.open = false;
};
