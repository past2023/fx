// File: js/Assets.js
/**
 * Asset registry — the seam between procedural pixel art and PNG artwork.
 *
 * The game ships with **zero image files**: every sprite is drawn from a
 * pixel matrix. This module lets you drop PNGs in `assets/` and have them
 * replace that procedural art with no changes to gameplay code.
 *
 * How it works
 * ------------
 * Every drawable registers a stable key (see `assets/manifest.js`). At draw
 * time a module asks `art.get('player.hull')`:
 *   - image loaded  → the caller blits the PNG
 *   - not loaded    → the caller falls back to its `drawMatrix` routine
 *
 * Nothing here throws on a missing file: an absent or broken PNG simply
 * leaves the procedural art in place, so the game always runs.
 *
 * GUI/HUD text and bars are intentionally NOT part of this system — they stay
 * vector/`fillText` so they scale crisply at any resolution.
 *
 * See `assets/ASSET_GUIDE.md` for canvas sizes, pivots and naming.
 */

/** @typedef {{key:string, src:string, pivot?:[number,number], frames?:number, fps?:number}} AssetDef */

class AssetManager {
  constructor() {
    /** @type {Map<string, HTMLImageElement|HTMLCanvasElement>} */
    this.images = new Map();
    /** @type {Map<string, AssetDef>} */
    this.defs = new Map();
    /** @type {Set<string>} keys that failed to load (warn once) */
    this.failed = new Set();
    this.enabled = true;      // master switch — false forces procedural art
    this.loading = 0;
    this.loaded = 0;
    this.basePath = './assets/';
  }

  /**
   * Load a manifest of asset definitions. Missing files are non-fatal.
   * @param {AssetDef[]} manifest
   * @returns {Promise<{loaded:number, failed:number, total:number}>}
   */
  async load(manifest = []) {
    if (!manifest.length) return { loaded: 0, failed: 0, total: 0 };
    const jobs = manifest.map((def) => this.loadOne(def));
    const results = await Promise.all(jobs);
    const loaded = results.filter(Boolean).length;
    return { loaded, failed: results.length - loaded, total: results.length };
  }

  /**
   * Load a single asset. Resolves to false instead of rejecting when the file
   * is absent, so a partial asset pack works fine.
   * @param {AssetDef} def
   * @returns {Promise<boolean>}
   */
  loadOne(def) {
    this.defs.set(def.key, def);
    return new Promise((resolve) => {
      const img = new Image();
      const url = /^(https?:|data:|\.|\/)/.test(def.src) ? def.src : this.basePath + def.src;
      img.onload = () => {
        // Guard against 0-byte / broken decodes.
        if (!img.naturalWidth) { this.failed.add(def.key); resolve(false); return; }
        this.images.set(def.key, img);
        this.loaded++;
        resolve(true);
      };
      img.onerror = () => {
        this.failed.add(def.key);
        resolve(false);
      };
      img.src = url;
    });
  }

  /**
   * Register an already-created image/canvas under a key (useful for tests
   * or runtime-generated atlases).
   * @param {string} key
   * @param {CanvasImageSource} img
   */
  set(key, img) { this.images.set(key, img); }

  /**
   * Fetch a loaded image.
   * @param {string} key
   * @returns {CanvasImageSource|null} null when the caller should fall back
   */
  get(key) {
    if (!this.enabled) return null;
    return this.images.get(key) ?? null;
  }

  /** @returns {boolean} true when a key has usable artwork. */
  has(key) { return this.enabled && this.images.has(key); }

  /** @returns {boolean} true when the full water texture set is available. */
  hasWater() {
    return this.enabled && this.images.has('water.deep');
  }

  /**
   * Draw a sprite centred on (cx, cy), honouring an optional pivot and
   * rotation. This is the single blit helper every entity uses, so swapping
   * art never changes call sites.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} key
   * @param {number} cx centre X in game px
   * @param {number} cy centre Y in game px
   * @param {object} [o]
   * @param {number} [o.scale] uniform scale (1 = native pixel size)
   * @param {number} [o.rot] rotation in radians
   * @param {boolean} [o.flipX]
   * @param {number} [o.alpha]
   * @param {number} [o.frame] frame index for a horizontal strip
   * @returns {boolean} false when there was no image (caller should fall back)
   */
  draw(ctx, key, cx, cy, { scale = 1, rot = 0, flipX = false, alpha = 1, frame = 0 } = {}) {
    const img = this.get(key);
    if (!img) return false;
    const def = this.defs.get(key) || {};
    const frames = def.frames || 1;
    const fw = img.width / frames;
    const fh = img.height;
    const sx = (frame % frames) * fw;

    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.translate(Math.round(cx), Math.round(cy));
    if (rot) ctx.rotate(rot);
    if (flipX) ctx.scale(-1, 1);
    const dw = fw * scale;
    const dh = fh * scale;
    // Pivot is expressed in source pixels from the top-left; default = centre.
    const px = def.pivot ? def.pivot[0] : fw / 2;
    const py = def.pivot ? def.pivot[1] : fh / 2;
    ctx.drawImage(img, sx, 0, fw, fh, Math.round(-px * scale), Math.round(-py * scale), dw, dh);
    ctx.restore();
    return true;
  }

  /**
   * Tile an image vertically across a band, scrolling by `offset`.
   * Used by the water layers; the texture must be seamless top-to-bottom.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {CanvasImageSource} img
   * @param {number} offset current scroll offset in px
   * @param {number} top band top edge
   * @param {number} bottom band bottom edge
   * @param {number} [alpha]
   */
  tileY(ctx, img, offset, top, bottom, alpha = 1) {
    const w = img.width, h = img.height;
    if (!h) return;
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.rect(0, top, ctx.canvas.width, bottom - top);
    ctx.clip();
    const start = top - h + ((offset % h) + h) % h;
    for (let y = start; y < bottom; y += h) {
      for (let x = 0; x < ctx.canvas.width; x += w) {
        ctx.drawImage(img, Math.round(x), Math.round(y));
      }
    }
    ctx.restore();
  }

  /** Turn the whole PNG layer off/on at runtime (debug: `__neonwake.art`). */
  setEnabled(on) { this.enabled = !!on; }
}

/** Singleton asset registry. */
export const art = new AssetManager();
