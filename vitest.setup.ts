import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: () => undefined,
});

Element.prototype.scrollIntoView = () => undefined;
