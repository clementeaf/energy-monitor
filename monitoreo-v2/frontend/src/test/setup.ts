import '@testing-library/jest-dom/vitest';

if (typeof CSS !== 'undefined' && typeof CSS.supports !== 'function') {
  CSS.supports = () => false;
}
