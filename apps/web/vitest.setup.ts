import '@testing-library/jest-dom';

// Radix UI uses pointer capture APIs that jsdom does not implement.
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => {};
window.HTMLElement.prototype.releasePointerCapture = () => {};
