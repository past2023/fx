/** Immutable weapon definitions and firing patterns. */
import {WEAPONS} from './constants.js';
export default class Weapon{constructor(type='blaster'){this.type=type;this.def=WEAPONS[type]}set(type){this.type=type;this.def=WEAPONS[type]}get name(){return this.def.name}get cooldown(){return this.def.cooldown}get damage(){return this.def.damage}