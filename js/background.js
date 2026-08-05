import { COLORS, TUNING } from './constants.js';

/**
 * Renders a four-depth parallax space field: distant stars, near stars, fast dust,
 * and high-speed foreground streaks that sell the level's forward momentum.
 */
export default class Background {
  constructor(quality = 1) {
    this.quality = quality;
    this.width = 1280;
    this.height = 720;
    this.far = [];
    this.near = [];
    this.mid = [];
    this.foreground = [];
    this.asteroids = [];
    this.asteroidTimer = TUNING.BACKGROUND.ASTEROID_MIN_INTERVAL;
    this.nebulaOffset = 0;
    this.time = 0;
  }

  /** Adjusts visual density for lower-power devices before the next resize. */
  setQuality(quality) { this.quality = Math.max(.3, Math.min(1, quality)); }

  /** Regenerates all procedural background layers for the current logical canvas dimensions. */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.far = this._makeStars(Math.round(90 * this.quality), 0.4, 1.2, 0.55);
    this.near = this._makeStars(Math.round(62 * this.quality), 0.75, 2.0, 0.78);
    this.mid = this._makeStars(Math.round(38 * this.quality), 1.0, 2.8, 0.92);
    this.foreground = this._makeStreaks(Math.max(6, Math.round(22 * this.quality)));
    this.asteroids.length = 0;
    this.asteroidTimer = TUNING.BACKGROUND.ASTEROID_MIN_INTERVAL + Math.random() * TUNING.BACKGROUND.ASTEROID_INTERVAL_VARIANCE;
  }

  _makeStars(count, minSize, maxSize, opacity) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: minSize + Math.random() * (maxSize - minSize),
      a: opacity * (0.45 + Math.random() * 0.55),
      tint: Math.random() > 0.9 ? '#a9c7ff' : Math.random() > 0.84 ? '#d8bbff' : '#ffffff',
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  _makeStreaks(count) {
    return Array.from({ length: count }, () => this._newStreak(Math.random() * this.width));
  }

  _newStreak(x = this.width + 30) {
    return {
      x,
      y: Math.random() * this.height,
      length: 22 + Math.random() * 96,
      width: 0.65 + Math.random() * 1.7,
      a: 0.18 + Math.random() * 0.45,
      tint: Math.random() > 0.78 ? '#7be6ff' : Math.random() > 0.86 ? '#e2b5ff' : '#d8efff',
    };
  }

  _updateLayer(stars, speed, dt) {
    for (const star of stars) {
      star.x -= speed * dt;
      if (star.x < -star.r) {
        star.x = this.width + star.r + Math.random() * 35;
        star.y = Math.random() * this.height;
        star.a = Math.min(1, star.a * (0.72 + Math.random() * 0.45));
      }
    }
  }

  _updateStreaks(dt) {
    for (const streak of this.foreground) {
      streak.x -= TUNING.BACKGROUND.FOREGROUND_STREAK_SPEED * dt;
      if (streak.x < -streak.length - 10) Object.assign(streak, this._newStreak(this.width + streak.length + Math.random() * 180));
    }
  }

  _spawnAsteroid() {
    const radius = 17 + Math.random() * 30;
    const pointCount = 7 + Math.floor(Math.random() * 4);
    const points = [];
    for (let index = 0; index < pointCount; index += 1) {
      const angle = index / pointCount * Math.PI * 2;
      points.push({ angle, radius: radius * (0.68 + Math.random() * 0.42) });
    }
    const craters = Array.from({ length: 3 }, () => ({
      x: (Math.random() - .5) * radius,
      y: (Math.random() - .5) * radius,
      r: 2 + Math.random() * radius * .13,
    }));
    this.asteroids.push({
      x: this.width + radius + Math.random() * 110,
      y: radius + 28 + Math.random() * Math.max(1, this.height - radius * 2 - 56),
      radius,
      points,
      craters,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * .42,
      speed: TUNING.BACKGROUND.ASTEROID_MIN_SPEED + Math.random() * TUNING.BACKGROUND.ASTEROID_SPEED_VARIANCE,
      alpha: .28 + Math.random() * .37,
    });
  }

  _updateAsteroids(dt) {
    this.asteroidTimer -= dt;
    if (this.asteroidTimer <= 0 && this.asteroids.length < (this.quality < .8 ? 1 : 3)) {
      this._spawnAsteroid();
      this.asteroidTimer += TUNING.BACKGROUND.ASTEROID_MIN_INTERVAL + Math.random() * TUNING.BACKGROUND.ASTEROID_INTERVAL_VARIANCE;
    }
    for (let index = this.asteroids.length - 1; index >= 0; index -= 1) {
      const asteroid = this.asteroids[index];
      asteroid.x -= asteroid.speed * dt;
      asteroid.angle += asteroid.spin * dt;
      if (asteroid.x < -asteroid.radius * 2) this.asteroids.splice(index, 1);
    }
  }

  /** Advances all parallax layers using seconds. */
  update(dt) {
    this.time += dt;
    this.nebulaOffset = (this.nebulaOffset + TUNING.BACKGROUND.NEBULA_SPEED * dt) % this.width;
    this._updateLayer(this.far, TUNING.BACKGROUND.FAR_STAR_SPEED, dt);
    this._updateLayer(this.near, TUNING.BACKGROUND.NEAR_STAR_SPEED, dt);
    this._updateLayer(this.mid, TUNING.BACKGROUND.MID_STAR_SPEED, dt);
    this._updateStreaks(dt);
    this._updateAsteroids(dt);
  }

  /** Draws the deep-space backdrop and all parallax depths in painter's order. */
  render(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#090b20');
    gradient.addColorStop(0.52, COLORS.space);
    gradient.addColorStop(1, '#120922');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this._renderNebula(ctx);
    this._renderPlanet(ctx);
    this._renderLayer(ctx, this.far, 1);
    this._renderLayer(ctx, this.near, 1.3);
    this._renderLayer(ctx, this.mid, 1.9);
    this._renderAsteroids(ctx);
    this._renderStreaks(ctx);
  }

  _renderNebula(ctx) {
    const cloud = ctx.createRadialGradient(
      this.width * 0.78 - this.nebulaOffset * 0.15,
      this.height * 0.2,
      10,
      this.width * 0.78,
      this.height * 0.2,
      this.width * 0.62,
    );
    cloud.addColorStop(0, 'rgba(49, 55, 130, 0.19)');
    cloud.addColorStop(.45, 'rgba(49, 29, 111, 0.09)');
    cloud.addColorStop(1, 'rgba(18, 10, 40, 0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, this.width, this.height);

    const cyanCloud = ctx.createRadialGradient(this.width * .16, this.height * .76, 4, this.width * .16, this.height * .76, this.width * .45);
    cyanCloud.addColorStop(0, 'rgba(40, 170, 201, .1)'); cyanCloud.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cyanCloud; ctx.fillRect(0, 0, this.width, this.height);
  }

  _renderPlanet(ctx) {
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
  }

  _renderLayer(ctx, stars, sizeBoost) {
    for (const star of stars) {
      ctx.globalAlpha = star.a * (0.72 + Math.sin(this.time * 2.2 + star.twinkle) * 0.28);
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r * sizeBoost, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _renderAsteroids(ctx) {
    for (const asteroid of this.asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y); ctx.rotate(asteroid.angle);
      ctx.globalAlpha = asteroid.alpha;
      ctx.shadowColor = '#697aa0'; ctx.shadowBlur = 12;
      const rock = ctx.createRadialGradient(-asteroid.radius * .28, -asteroid.radius * .34, 2, 0, 0, asteroid.radius * 1.1);
      rock.addColorStop(0, '#aab4ca'); rock.addColorStop(.38, '#59637b'); rock.addColorStop(1, '#1d2335');
      ctx.fillStyle = rock; ctx.strokeStyle = 'rgba(207, 221, 255, .36)'; ctx.lineWidth = 1;
      ctx.beginPath();
      asteroid.points.forEach((point, index) => {
        const px = Math.cos(point.angle) * point.radius;
        const py = Math.sin(point.angle) * point.radius;
        if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(13, 18, 31, .55)';
      for (const crater of asteroid.craters) {
        ctx.beginPath(); ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  _renderStreaks(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const streak of this.foreground) {
      const tail = ctx.createLinearGradient(streak.x, streak.y, streak.x + streak.length, streak.y);
      tail.addColorStop(0, 'rgba(255,255,255,0)');
      tail.addColorStop(.55, streak.tint);
      tail.addColorStop(1, '#ffffff');
      ctx.globalAlpha = streak.a;
      ctx.strokeStyle = tail;
      ctx.shadowColor = streak.tint;
      ctx.shadowBlur = 7;
      ctx.lineWidth = streak.width;
      ctx.beginPath(); ctx.moveTo(streak.x, streak.y); ctx.lineTo(streak.x + streak.length, streak.y); ctx.stroke();
    }
    ctx.restore();
  }
}
