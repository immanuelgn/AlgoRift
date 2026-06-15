import type { InputAction } from "@/game/types";

const KEY_BINDINGS: Record<string, InputAction> = {
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
  w: "jump",
  arrowup: "jump",
  " ": "jump",
  f: "fire",
  j: "fire",
  e: "hack",
  shift: "hack",
};

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export class InputController {
  private held = new Set<InputAction>();
  private pressed = new Set<InputAction>();
  private released = new Set<InputAction>();

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    const action = KEY_BINDINGS[event.key.toLowerCase()];
    if (!action) return;

    event.preventDefault();
    if (!this.held.has(action)) {
      this.pressed.add(action);
    }
    this.held.add(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    const action = KEY_BINDINGS[event.key.toLowerCase()];
    if (!action) return;

    event.preventDefault();
    this.held.delete(action);
    this.released.add(action);
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
  }

  isDown(action: InputAction) {
    return this.held.has(action);
  }

  consumePressed(action: InputAction) {
    const wasPressed = this.pressed.has(action);
    this.pressed.delete(action);
    return wasPressed;
  }

  consumeReleased(action: InputAction) {
    const wasReleased = this.released.has(action);
    this.released.delete(action);
    return wasReleased;
  }

  setVirtualAction(action: InputAction, active: boolean) {
    if (active) {
      if (!this.held.has(action)) this.pressed.add(action);
      this.held.add(action);
      return;
    }

    if (this.held.delete(action)) this.released.add(action);
  }

  clearTransientActions() {
    this.pressed.clear();
    this.released.clear();
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.held.clear();
    this.clearTransientActions();
  }
}
