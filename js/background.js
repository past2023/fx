import { COLORS, TUNING } from './constants.js';

/**
 * Renders and recycles a deterministic two-layer horizontal parallax starfield.
 */
export default class Background {
  constructor() {
    this.width = 1280;
    this.height = 720;
    this.far = [];
    this.near = [];
    this.nebulaOffset = 0;
  }

  /** Regenerates the star field to match the current logical canvas dimensions. */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.far = this._makeStars(85, 0.45, 1.25);
    this.near = this._makeStars(50, 0.8, 2.15);
  }

  _makeStars(count, minSize, maxSize) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: minSize + Math.random() * (maxSize - minSize),
      a: 0.25 + Math.random() * 0.75,
      tint: Math.random() > 0.87 ? '#a9c7ff' : '#ffffff',
    }));
  }

  _updateLayer(stars, speed, dt) {
    for (const star of stars) {
      star.x -= speed * dt;
      if (star.x < -star.r) {
        star.x = this.width + star.r + Math.random() * 35;
        star.y = Math.random() * this.height;
        star.a = 0.25 + Math.random() * 0.75;
      }
    }
  }

  /** Advances parallax movement using seconds. */
  update(dt) {
    this.nebulaOffset = (this.nebulaOffset + TUNING.BACKGROUND.NEBULA_SPEED * dt) % this.width;
    this._updateLayer(this.far, TUNING.BACKGROUND.FAR_STAR_SPEED, dt);
    this._updateLayer(this.near, TUNING.BACKGROUND.NEAR_STAR_SPEED, dt);
  }

  /** Draws the dark space backdrop and both star layers. */
  render(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#090b20');
    gradient.addColorStop(0.55, COLORS.space);
    gradient.addColorStop(1, '#10091f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const cloud = ctx.createRadialGradient(
      this.width * 0.78 - this.nebulaOffset * 0.15,
      this.height * 0.2,
      10,
      this.width * 0.78,
      this.height * 0.2,
      this.width * 0.62,
    );
    cloud.addColorStop(0, 'rgba(49, 55, 130, 0.16)');
    cloud.addColorStop(1, 'rgba(18, 10, 40, 0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, this.width, this.height);

    this._renderLayer(ctx, this.far);
    this._renderLayer(ctx, this.near);
  }

  _renderLayer(ctx, stars) {
    for (const star of stars) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
