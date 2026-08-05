/**
 * Converts keyboard events into persistent abstract actions and one-frame presses.
 */
export default class InputManager {
  constructor(target = window, onInteraction = null) {
    this.target = target;
    this.onInteraction = onInteraction;
    this.down = new Set();
    this.pressed = new Set();
    this.bindings = new Map([
      ['ArrowLeft', ['left']], ['KeyA', ['left']],
      ['ArrowRight', ['right']], ['KeyD', ['right']],
      ['ArrowUp', ['up']], ['KeyW', ['up']],
      ['ArrowDown', ['down']], ['KeyS', ['down']],
      ['Space', ['shoot', 'start']], ['Enter', ['start']],
      ['KeyQ', ['previousWeapon']], ['KeyE', ['nextWeapon']], ['KeyU', ['upgrade']], ['KeyF', ['fullscreen']],
    ]);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(event) {
    const actions = this.bindings.get(event.code);
    if (!actions) return;
    event.preventDefault();
    this.onInteraction?.();
    for (const action of actions) {
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    }
  }

  _onKeyUp(event) {
    const actions = this.bindings.get(event.code);
    if (!actions) return;
    event.preventDefault();
    this.onInteraction?.();
    for (const action of actions) this.down.delete(action);
  }

  /** Returns whether an action is currently held. */
  isDown(action) { return this.down.has(action); }

  /** Returns true once during the current animation frame. */
  wasPressed(action) { return this.pressed.has(action); }

  /** Clears edge-triggered actions after one game frame. */
  endFrame() { this.pressed.clear(); }

  /** Clears input state, useful when moving between UI and gameplay. */
  reset() { this.down.clear(); this.pressed.clear(); }

  /** Removes event handlers for clean teardown. */
  destroy() {
    this.target.removeEventListener('keydown', this._onKeyDown);
    this.target.removeEventListener('keyup', this._onKeyUp);
    this.reset();
  }
}
