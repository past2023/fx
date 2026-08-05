/**
 * Unified keyboard, touch, and browser Gamepad API input layer. All devices map
 * into the same semantic actions so Xbox, PlayStation/PSP-style pads and mobile
 * controls behave identically to keyboard play.
 */
export default class InputManager {
  constructor(target = window, onInteraction = null) {
    this.target = target;
    this.onInteraction = onInteraction;
    this.down = new Set();
    this.pressed = new Set();
    this.keyboardCodes = new Map();
    this.keyboardActions = new Set();
    this.gamepadActions = new Set();
    this.touchPointers = new Map();
    this.touchActions = new Set();
    this.controllerName = '';
    this.bindings = new Map([
      ['ArrowLeft', ['left']], ['KeyA', ['left']],
      ['ArrowRight', ['right']], ['KeyD', ['right']],
      ['ArrowUp', ['up']], ['KeyW', ['up']],
      ['ArrowDown', ['down']], ['KeyS', ['down']],
      ['Space', ['shoot', 'start']], ['Enter', ['start']],
      ['KeyQ', ['previousWeapon']], ['KeyE', ['nextWeapon']],
      ['KeyU', ['upgrade']], ['KeyX', ['bomb']], ['KeyC', ['bomb']], ['KeyF', ['fullscreen']],
    ]);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this._bindTouchControls();
  }

  _onKeyDown(event) {
    const actions = this.bindings.get(event.code);
    if (!actions) return;
    event.preventDefault();
    this.onInteraction?.();
    this.keyboardCodes.set(event.code, actions);
    this._rebuildKeyboardActions();
  }

  _onKeyUp(event) {
    if (!this.bindings.has(event.code)) return;
    event.preventDefault();
    this.keyboardCodes.delete(event.code);
    this._rebuildKeyboardActions();
  }

  _rebuildKeyboardActions() {
    this.keyboardActions.clear();
    for (const actions of this.keyboardCodes.values()) for (const action of actions) this.keyboardActions.add(action);
    this._syncDown();
  }

  _bindTouchControls() {
    this.touchButtons = [...document.querySelectorAll('[data-action]')];
    for (const button of this.touchButtons) {
      button.addEventListener('pointerdown', this._onPointerDown, { passive: false });
      button.addEventListener('pointerup', this._onPointerUp, { passive: false });
      button.addEventListener('pointercancel', this._onPointerUp, { passive: false });
      button.addEventListener('pointerleave', this._onPointerUp, { passive: false });
    }
  }

  _onPointerDown(event) {
    const action = event.currentTarget?.dataset.action;
    if (!action) return;
    const actions = action.split(' ').filter(Boolean);
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    this.touchPointers.set(event.pointerId, actions);
    this.onInteraction?.();
    this._rebuildTouchActions();
  }

  _onPointerUp(event) {
    if (!this.touchPointers.has(event.pointerId)) return;
    event.preventDefault();
    this.touchPointers.delete(event.pointerId);
    this._rebuildTouchActions();
  }

  _rebuildTouchActions() {
    this.touchActions = new Set([...this.touchPointers.values()].flat());
    this._syncDown();
  }

  _onVisibilityChange() {
    if (document.hidden) this.reset();
  }

  _syncDown() {
    const next = new Set([...this.keyboardActions, ...this.gamepadActions, ...this.touchActions]);
    for (const action of next) if (!this.down.has(action)) this.pressed.add(action);
    this.down = next;
  }

  /** Polls standard and generic browser gamepads once per game frame. */
  update() {
    const pads = globalThis.navigator?.getGamepads?.() || [];
    const actions = new Set();
    this.controllerName = '';
    for (const pad of pads) {
      if (!pad?.connected) continue;
      this.controllerName = pad.id || 'GAMEPAD';
      const button = (index) => Boolean(pad.buttons?.[index]?.pressed || (pad.buttons?.[index]?.value || 0) > 0.55);
      const axis = (index) => pad.axes?.[index] || 0;
      // Universal left stick and d-pad mapping. Works with Xbox, DualShock and PSP-style browser adapters.
      if (axis(0) < -0.36 || button(14)) actions.add('left');
      if (axis(0) > 0.36 || button(15)) actions.add('right');
      if (axis(1) < -0.36 || button(12)) actions.add('up');
      if (axis(1) > 0.36 || button(13)) actions.add('down');
      // A/Cross confirms and fires. B/Circle and X/Square both trigger the emergency bomb.
      if (button(0) || button(7)) { actions.add('shoot'); actions.add('start'); }
      if (button(1) || button(2)) actions.add('bomb');
      if (button(3)) actions.add('upgrade');
      if (button(4)) actions.add('previousWeapon');
      if (button(5)) actions.add('nextWeapon');
      if (button(8)) actions.add('fullscreen');
      if (button(9)) actions.add('start');
    }
    this.gamepadActions = actions;
    this._syncDown();
  }

  /** Returns whether an action is currently held by any input source. */
  isDown(action) { return this.down.has(action); }

  /** Returns true once during the current animation frame. */
  wasPressed(action) { return this.pressed.has(action); }

  /** Human-readable active controller identifier for GUI status. */
  getControllerName() { return this.controllerName; }

  /** Clears edge-triggered actions after one game frame. */
  endFrame() { this.pressed.clear(); }

  /** Clears all device state, useful on focus loss and clean teardown. */
  reset() {
    this.down.clear(); this.pressed.clear();
    this.keyboardCodes.clear(); this.keyboardActions.clear(); this.gamepadActions.clear();
    this.touchPointers.clear(); this.touchActions.clear();
  }

  /** Removes keyboard, touch and visibility handlers for clean teardown. */
  destroy() {
    this.target.removeEventListener('keydown', this._onKeyDown);
    this.target.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    for (const button of this.touchButtons || []) {
      button.removeEventListener('pointerdown', this._onPointerDown);
      button.removeEventListener('pointerup', this._onPointerUp);
      button.removeEventListener('pointercancel', this._onPointerUp);
      button.removeEventListener('pointerleave', this._onPointerUp);
    }
    this.reset();
  }
}
