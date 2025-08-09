class VastraffikCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this.updateCard();
  }

  setConfig(config) {
    this.config = {
      title: 'Departures',
      logo: '',
      entities: [],
      countdown_entities: [],        
      show_delay: true,
      go_time: 5,                    
      empty_text: 'No departures at the moment.',
      line_colors: {},               
      line_text_overrides: {},       
      refresh_interval_ms: 300000,   
      debug: false,
      ...config,
    };

    if (!Array.isArray(this.config.entities) || this.config.entities.length === 0) {
      throw new Error('You need to define entities');
    }

    if (this.refreshInterval) clearInterval(this.refreshInterval);
    const interval = Number(this.config.refresh_interval_ms) || 300000;
    this.refreshInterval = setInterval(() => this.updateCard(), interval);
  }

  getCardSize() {
    return 2;
  }

  updateCard() {
    if (!this._hass || !this.config) return;

    const {
      entities,
      countdown_entities,
      title,
      logo,
      show_delay,
      go_time,
      empty_text,
      line_colors = {},
      line_text_overrides = {},
      debug,
    } = this.config;

    const hass = this._hass;

    const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
    const isUnavailable = (v) => v === 'unknown' || v === 'unavailable' || v === 'none';
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const asTime = (v) => {
      if (typeof v !== 'string') return undefined;
      const m = v.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      return m ? v : undefined;
    };
    const cleanDirection = (s) => (s || '').replace(', Påstigning fram', '').trim();

    const nowMinutesHA = (hass) => {
      const tz = hass?.config?.time_zone;
      if (!tz) {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
      }
      const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
      }).formatToParts(new Date());
      const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
      const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
      return h * 60 + m;
    };

    const minutesUntil = (hhmm, delayMin = 0, hass) => {
      const m = typeof hhmm === 'string' && hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (!m) return undefined;
      const dep = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (Number.isFinite(delayMin) ? delayMin : 0);
      const now = nowMinutesHA(hass);
      const delta = (dep - now + 1440) % 1440;
      return Math.max(0, Math.round(delta));
    };

    const defaultLineColors = {
      "1": "#ffff4d",
      "2": "#0072ce",
      "3": "#84329b",
      "5": "#e3f2c1",
      "6": "#754c24",
      "7": "#f58220",
      "8": "#009856"
    };
    const bgPalette = { ...defaultLineColors, ...line_colors };

    const normalizeHex = (hex) => {
      if (!hex || typeof hex !== 'string') return null;
      let h = hex.trim().replace(/^#/, '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
      return '#' + h.toLowerCase();
    };
    const srgbToLinear = (c) => {
      const cs = c / 255;
      return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    };
    const relativeLuminance = ({ r, g, b }) => {
      const R = srgbToLinear(r); const G = srgbToLinear(g); const B = srgbToLinear(b);
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    const parseCssRgb = (rgbStr) => {
      const m = rgbStr?.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
      if (!m) return null;
      return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]) };
    };
    const hexToRgb = (hex) => {
      const h = normalizeHex(hex);
      if (!h) return null;
      return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
    };
    const pickTextColor = (rgb) => {
      const Lbg = relativeLuminance(rgb);
      const crWhite = (1.0 + 0.05) / (Lbg + 0.05);
      const crBlack = (Lbg + 0.05) / (0.0 + 0.05);
      return crBlack >= crWhite ? '#000000' : '#ffffff';
    };

    if (!this.content) {
      const card = document.createElement('ha-card');

      const header = document.createElement('div');
      header.className = 'vt-header';

      if (logo) {
        const logoImg = document.createElement('img');
        logoImg.src = logo;
        logoImg.className = 'vt-logo';
        header.appendChild(logoImg);
      }

      const titleText = document.createElement('div');
      titleText.className = 'vt-title';
      titleText.textContent = title || 'Departures';
      header.appendChild(titleText);

      this.content = document.createElement('div');

      card.appendChild(header);
      card.appendChild(this.content);
      this.appendChild(card);
    }

    const ents = Array.isArray(entities) ? entities : [];
    const cds = Array.isArray(countdown_entities) ? countdown_entities : [];
    const total = Math.max(ents.length, cds.length);

    const rows = [];
    for (let i = 0; i < total; i++) {
      const entId = ents[i];
      const cdId = cds[i];

      const entity = entId ? hass.states?.[entId] : undefined;
      const countdownEntity = cdId ? hass.states?.[cdId] : undefined;

      if (!entity || isUnavailable(entity.state)) continue;

      const timeText = asTime(entity.state);
      const line = (entity.attributes?.line ?? '').toString();
      const direction = cleanDirection(entity.attributes?.direction || '');
      const track = (entity.attributes?.track || '').toString();
      const accessRaw = (entity.attributes?.accessibility || '').toString().toLowerCase();
      const isAccessible = accessRaw.includes('wheel');
      const delayNum = toNum(entity.attributes?.delay);
      const delayTextVal = Number.isFinite(delayNum) && delayNum !== 0
        ? `${delayNum > 0 ? '+' : '−'}${Math.abs(delayNum)} min`
        : '';

      let countdown;
      if (countdownEntity && !isUnavailable(countdownEntity.state) && !isBlank(countdownEntity.state)) {
        const parsed = toNum(countdownEntity.state);
        if (parsed !== undefined && parsed >= 0) countdown = parsed;
      }
      if (countdown === undefined) {
        const derived = minutesUntil(timeText, delayNum, hass);
        if (derived !== undefined) countdown = derived;
      }

      const metaParts = [];
      if (isAccessible) metaParts.push('Accessible');
      if (!isBlank(track)) metaParts.push(`Track ${track}`);
      if (show_delay && delayTextVal) metaParts.push(delayTextVal);
      const meta = metaParts.join(' • ');

      rows.push({
        entId,
        line,
        direction,
        timeText: timeText || '',
        countdown,
        meta,
      });
    }

    if (rows.length === 0) {
      this.content.innerHTML = `<div style="padding:16px;color:var(--secondary-text-color);">${empty_text || 'No departures at the moment.'}</div>`;
      return;
    }

    const safeGo = toNum(go_time) ?? 5;

    let html = `
      <style>
        ha-card {
          background: var(--ha-card-background, var(--card-background-color));
          color: var(--primary-text-color);
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
        }

        .vt-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px 8px;
        }
        .vt-logo { height: 24px; }
        .vt-title { font-size: 1.1rem; font-weight: 600; flex: 1 1 auto; }

        .vt-wrap {
          padding: 4px 8px 12px;
          display: grid; gap: 8px;
        }

        /* Row layout: airy, two-line, no badges clutter */
        .vt-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 8px;
          border-top: 1px solid var(--ha-card-border-color, var(--divider-color, rgba(0,0,0,0.12)));
        }
        .vt-row:first-child { border-top: none; }
        .vt-row:hover { background: var(--vt-row-hover, rgba(0,0,0,0.04)); cursor: pointer; }

        .vt-left {
          display: flex; align-items: flex-start; gap: 12px; min-width: 0; flex: 1 1 auto;
        }

        .vt-line-badge {
          padding: 4px 10px;
          border-radius: 16px;
          font-weight: 800;
          letter-spacing: .2px;
          font-size: .95rem;
          background: #888; /* real color set inline */
          color: #fff;      /* auto-contrast adjusted post-render */
          text-shadow: 0 1px 1px rgba(0,0,0,.25);
          flex: 0 0 auto;
        }

        .vt-text { display: grid; gap: 4px; min-width: 0; }
        .vt-direction {
          font-weight: 600;
          line-height: 1.2;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .vt-meta {
          color: var(--secondary-text-color);
          font-size: .85rem;
          line-height: 1.2;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .vt-right {
          display: grid; gap: 4px; justify-items: end; align-content: center;
          flex: 0 0 auto; min-width: 90px;
        }
        .vt-countdown {
          font-weight: 800; font-size: 1.1rem;
          color: var(--primary-text-color);
        }
        .vt-countdown.now { color: var(--error-color, #ff5252); }
        .vt-countdown.soon { color: var(--warning-color, #ffb020); }
        .vt-time {
          color: var(--secondary-text-color);
          font-size: .85rem;
        }

        @media (max-width: 520px) {
          .vt-row { flex-wrap: wrap; }
          .vt-right { width: 100%; justify-items: start; }
          .vt-time { order: 2; }
        }
      </style>
      <div class="vt-wrap">
    `;

    for (const r of rows) {
      const bgFallback = bgPalette[String(r.line)] || '#888888';
      const lineBadge = `
        <span class="vt-line-badge" data-line="${String(r.line)}"
          style="background: var(--vt-line-${String(r.line)}, ${bgFallback});">
          ${String(r.line || '–')}
        </span>
      `;

      const c = typeof r.countdown === 'number' ? r.countdown : undefined;
      const countdownClass = typeof c === 'number' ? (c === 0 ? 'now' : c <= safeGo ? 'soon' : '') : '';
      const countdownText = typeof c === 'number' ? (c === 0 ? 'Leaving' : `${c} min`) : '';

      const rowTitle = r.direction.replace(/"/g, '&quot;');

      html += `
        <div class="vt-row" data-entity="${r.entId}" title="${rowTitle}">
          <div class="vt-left">
            ${lineBadge}
            <div class="vt-text">
              <div class="vt-direction">${r.direction}</div>
              <div class="vt-meta">${r.meta}</div>
            </div>
          </div>
          <div class="vt-right">
            <div class="vt-countdown ${countdownClass}">${countdownText}</div>
            <div class="vt-time">${r.timeText}</div>
          </div>
        </div>
      `;
    }

    html += `</div>`;

    this.content.innerHTML = html;

    this.content.querySelectorAll('.vt-row').forEach(row => {
      row.addEventListener('click', () => {
        const entityId = row.getAttribute('data-entity');
        if (!entityId) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          detail: { entityId },
          bubbles: true,
          composed: true,
        }));
      });
    });

    this.content.querySelectorAll('.vt-line-badge').forEach(el => {
      const lineKey = el.getAttribute('data-line') || '';
      if (this.config.line_text_overrides && this.config.line_text_overrides[lineKey]) {
        el.style.color = normalizeHex(this.config.line_text_overrides[lineKey]) || this.config.line_text_overrides[lineKey];
        return;
      }
      const styles = getComputedStyle(el);
      let rgb = null;
      if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
        rgb = parseCssRgb(styles.backgroundColor);
      }
      if (!rgb) {
        const hex = bgPalette[lineKey] || '#888888';
        rgb = hexToRgb(hex);
      }
      if (rgb) {
        const fg = pickTextColor(rgb);
        el.style.color = fg;
        el.style.textShadow = fg === '#ffffff'
          ? '0 1px 1px rgba(0,0,0,0.35)'
          : '0 1px 1px rgba(255,255,255,0.25)';
      }
    });

    if (debug) {
      console.debug('[vasttrafik-card]', { rows: rows.length, tz: hass?.config?.time_zone });
    }
  }
}

if (!customElements.get('vasttrafik-table-card')) {
  customElements.define('vasttrafik-table-card', VastraffikCard);
}
