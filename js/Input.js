// File: js/Input.js
/**
 * Keyboard input singleton.
 *
 * Exposes both *held* state (`input.left`) for continuous actions and
 * *edge* state (`input.pressed('Space')`) for one-shot actions, which is
 * consumed once per frame by main.js via `endFrame()`.
 */

const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'fire',
  ShiftLeft: 'special', ShiftRight: 'special',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  Enter: 'confirm',
};

class Input {
  constructor() {
    /** @type {Set<string>} logical actions currently held */
    this.held = new Set();
    /** @type {Set<string>} logical actions pressed this frame */
    this.edges = new Set();
    /** @type {Set<string>} raw codes currently held */
    this.codes = new Set();
    this._anyKey = false;
    this._bound = false;
  }

  /** Attach window listeners. Idempotent. */
  attach(target = window) {
    if (this._bound) return;
    this._bound = true;
    target.addEventListener('keydown', (e) => {
      const a = MAP[e.code];
      // Stop the page from scrolling under the canvas.
      if (a || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (e.repeat) return;
      this._anyKey = true;
      this.codes.add(e.code);
      if (a) { this.held.add(a); this.edges.add(a); }
    }, { passive: false });

    target.addEventListener('keyup', (e) => {
      const a = MAP[e.code];
      this.codes.delete(e.code);
      if (!a) return;
      // Only clear when no other key mapped to the same action is held.
      const stillHeld = Object.keys(MAP).some((c) => MAP[c] === a && this.codes.has(c));
      if (!stillHeld) this.held.delete(a);
    });

    // Never keep keys stuck when the tab loses focus.
    target.addEventListener('blur', () => { this.held.clear(); this.codes.clear(); });
  }

  get left()    { return this.held.has('left'); }
  get right()   { return this.held.has('right'); }
  get up()      { return this.held.has('up'); }
  get down()    { return this.held.has('down'); }
  get fire()    { return this.held.has('fire'); }
  get special() { return this.held.has('special'); }

  /** True only on the frame the action started. */
  pressed(action) { return this.edges.has(action); }

  /** True if any key at all was pressed this frame (menu "press any key"). */
  get anyKey() { return this._anyKey; }

  /** Clear per-frame edges. Call at the very end of the game loop. */
  endFrame() { this.edges.clear(); this._anyKey = false; }
}

/** Singleton input manager. */
export const input = new Input();
