class LightningRadarCard extends HTMLElement {
  static get DEFAULTS() {
    return {
      size: 250,
      ringIntervalKm: 10,
      ringColor: '#666',
      ringLineWidth: 1,
      sweepColor: 'rgba(33, 150, 243, 0.3)',
      sweepSpeed: 0.2,
      strikeInnerColor: '#d32f2f',
      strikeOuterColor: '#fbc02d',
      strikeRadius: 4,
      homeIcon: '🏠',
      homeSize: 24,
      pulseDuration: 1000,     // ms
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You must define an `entity`');
    }
    this.config = Object.assign({}, LightningRadarCard.DEFAULTS, config);
  }

  connectedCallback() {
    this._animId    = null;
    this._lastPulse = 0;
    this._angle     = 0;
    this._hitTestPoints = [];
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._animId);
  }

  set hass(hass) {
    const stateObj = hass.states[this.config.entity];
    if (!stateObj) {
      this.innerHTML = `<ha-card>Entity "${this.config.entity}" not found</ha-card>`;
      return;
    }

    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }

    this.attr = stateObj.attributes;
    this._buildCard(stateObj);
    this._prepareCanvases();
    this._drawStatic();
    this._startAnimation();
  }

  getCardSize() {
    return 3;
  }

  _buildCard(entity) {
    const theme      = getComputedStyle(document.body);
    const bannerBg   = theme.getPropertyValue('--primary-color')      || '#2196f3';
    const bannerText = theme.getPropertyValue('--text-primary-color') || 'white';
    const hrs        = this.attr.avg_interval_sec
      ? (3600 / this.attr.avg_interval_sec).toFixed(1)
      : 0;

    this.innerHTML = `
      <ha-card style="overflow:hidden;">
        <div style="
          background:${bannerBg};
          color:${bannerText};
          padding:12px;
          border-radius:8px 8px 0 0;
        ">
          <div style="font-size:1.2em; font-weight:bold;">
            ⚡ Lightning Status: ${entity.state.toUpperCase()}
          </div>
          <div style="font-size:12px;">
            Alert Level: ${this.attr.alert_level || '—'}
          </div>
        </div>
        <div style="display:flex; gap:20px; padding:12px;">
          <div style="font-size:12px; line-height:1.5; padding:10px;">
            <p><strong>Total Strikes:</strong> ${this.attr.strikes_count || 0}</p>
            <p><strong>Unique Strikes:</strong> ${this.attr.unique_strikes || 0}</p>
            <p><strong>Closest Distance:</strong> ${this.attr.closest_dist ?? '—'} km</p>
            <p><strong>Intensity:</strong> ${this.attr.raw_norm ?? '—'}</p>
            <p><strong>Strikes/hour:</strong> ${hrs}</p>
            <p><strong>Warning Radius:</strong> ${this.attr.radius_km || 0} km</p>
            <p><strong>Warning Window:</strong> ${this.attr.window_sec || 0} sec</p>
          </div>
        </div>
        <div id="radarWrapper" style="
          position:relative;
          width:${this.config.size}px;
          height:${this.config.size}px;
          margin:0 auto 16px;
        ">
          <canvas id="staticCanvas"
                  width="${this.config.size}"
                  height="${this.config.size}"
                  style="position:absolute; top:0; left:0;">
          </canvas>
          <canvas id="dynamicCanvas"
                  width="${this.config.size}"
                  height="${this.config.size}"
                  style="position:absolute; top:0; left:0;">
          </canvas>
        </div>
      </ha-card>
    `;

    const wrapper = this.querySelector('#radarWrapper');
    const tip = document.createElement('div');
    tip.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: rgba(0,0,0,0.75);
      color: white;
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 4px;
      display: none;
      white-space: nowrap;
      z-index: 10;
    `;
    wrapper.appendChild(tip);
    this._tooltip = tip;

    wrapper.addEventListener('mousemove', ev => this._onMouseMove(ev));
    wrapper.addEventListener('mouseleave',  _ => tip.style.display = 'none');
  }

  _prepareCanvases() {
    this.staticCanvas  = this.querySelector('#staticCanvas');
    this.dynamicCanvas = this.querySelector('#dynamicCanvas');
    this.sCtx = this.staticCanvas.getContext('2d');
    this.dCtx = this.dynamicCanvas.getContext('2d');

    const { size }   = this.config;
    this.cx          = size / 2;
    this.cy          = size / 2;
    this.maxR        = size / 2 - 10;
    this.pxPerKm     = this.attr.radius_km
      ? this.maxR / this.attr.radius_km
      : 0;

    const maxDist = this.attr.radius_km || Infinity;
    this.strikes = Array.isArray(this.attr.distances)
      ? this.attr.distances
          .filter(s => s.km <= maxDist)
          .sort((a, b) => a.timestamp - b.timestamp)
      : [];
  }

  _drawStatic() {
    const { ringIntervalKm, ringColor, ringLineWidth, homeIcon, homeSize } = this.config;
    const s = this.sCtx;
    s.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    s.strokeStyle = ringColor;
    s.lineWidth   = ringLineWidth;
    for (let r = ringIntervalKm; r <= this.attr.radius_km; r += ringIntervalKm) {
      s.beginPath();
      s.arc(this.cx, this.cy, r * this.pxPerKm, 0, 2 * Math.PI);
      s.stroke();
    }

    s.font         = `${homeSize}px sans-serif`;
    s.textAlign    = 'center';
    s.textBaseline = 'middle';
    s.fillText(homeIcon, this.cx, this.cy);
  }

  _startAnimation() {
    this._lastPulse = performance.now();
    this._animId    = requestAnimationFrame(ts => this._animate(ts));
  }

  _animate(ts) {
    const cfg      = this.config;
    const elapsed  = ts - this._lastPulse;
    const progress = (elapsed % cfg.pulseDuration) / cfg.pulseDuration;

    this._angle = (this._angle + cfg.sweepSpeed) % 360;

    const d = this.dCtx;
    d.clearRect(0, 0, this.dynamicCanvas.width, this.dynamicCanvas.height);
    
    d.save();
    d.translate(this.cx, this.cy);
    d.rotate(this._angle * Math.PI / 180);
    d.fillStyle = cfg.sweepColor;
    d.beginPath();
    d.moveTo(0, 0);
    d.arc(0, 0, this.maxR, -0.03, +0.03);
    d.closePath();
    d.fill();
    d.restore();

    this._hitTestPoints = [];
    this.strikes.forEach(strike => {
      const angleRad = strike.bearing * Math.PI / 180;
      const r        = strike.km * this.pxPerKm;
      const x        = this.cx + r * Math.cos(angleRad);
      const y        = this.cy + r * Math.sin(angleRad);
      const pulse    = 1 + 0.5 * Math.sin(progress * 2 * Math.PI);
      const radius   = cfg.strikeRadius * pulse;

      d.beginPath();
      d.arc(x, y, radius, 0, 2 * Math.PI);
      d.fillStyle   = (strike.km < this.attr.radius_km * 0.4)
        ? cfg.strikeInnerColor
        : cfg.strikeOuterColor;
      d.globalAlpha = 1 - progress;
      d.fill();
      d.globalAlpha = 1;

      this._hitTestPoints.push({ x, y, radius, strike });
    });

    this._lastPulse = ts - (elapsed % cfg.pulseDuration);
    this._animId    = requestAnimationFrame(ts => this._animate(ts));
  }

  _onMouseMove(ev) {
    const wrapper = this.querySelector('#radarWrapper');
    const rect    = wrapper.getBoundingClientRect();
    const mx      = ev.clientX - rect.left;
    const my      = ev.clientY - rect.top;
    const tip     = this._tooltip;

    const hit = this._hitTestPoints.find(pt => {
      const dx = mx - pt.x;
      const dy = my - pt.y;
      return dx*dx + dy*dy <= pt.radius*pt.radius;
    });

    if (!hit) {
      tip.style.display = 'none';
      return;
    }

    const time = new Date(hit.strike.timestamp * 1000)
      .toLocaleTimeString();
    tip.textContent = `${hit.strike.km.toFixed(1)} km @ ${time}`;
    tip.style.left    = `${mx + 10}px`;
    tip.style.top     = `${my - 10}px`;
    tip.style.display = 'block';
  }
}

customElements.define('lightning-radar-card', LightningRadarCard);
