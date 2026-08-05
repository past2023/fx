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
    this.time = 0;
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
      twinkle: Math.random() * Math.PI * 2,
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
    this.time += dt;
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

    const planetX = this.width * 0.87 + Math.sin(this.time * 0.06) * 14;
    const planetY = this.height * 0.88;
    const planetRadius = Math.max(85, this.height * 0.22);
    const planet = ctx.createRadialGradient(planetX - planetRadius * 0.3, planetY - planetRadius * 0.35, 4, planetX, planetY, planetRadius);
    planet.addColorStop(0, 'rgba(117, 110, 195, .42)');
    planet.addColorStop(.55, 'rgba(37, 40, 105, .35)');
    planet.addColorStop(1, 'rgba(8, 9, 31, 0)');
    ctx.fillStyle = planet;
    ctx.beginPath(); ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(planetX, planetY); ctx.rotate(-.18); ctx.strokeStyle = 'rgba(147, 123, 255, .16)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 0, planetRadius * 1.45, planetRadius * .28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    this._renderLayer(ctx, this.far);
    this._renderLayer(ctx, this.near);
  }

  _renderLayer(ctx, stars) {
    for (const star of stars) {
      ctx.globalAlpha = star.a * (0.72 + Math.sin(this.time * 2.2 + star.twinkle) * 0.28);
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
