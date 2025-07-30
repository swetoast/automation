class LightningRadarCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error('You must define an `entity` in your card configuration');
    }
    this.config = config;
  }

  set hass(hass) {
    const entityId = this.config.entity;
    const entity = hass.states[entityId];
    if (!entity) {
      this.innerHTML = `<ha-card>Entity "${entityId}" not found</ha-card>`;
      return;
    }
    const attr = entity.attributes;

    const strikesPerHour = attr.avg_interval_sec
      ? (3600 / attr.avg_interval_sec).toFixed(1)
      : 0;

    const theme = getComputedStyle(document.body);
    const bannerBg = theme.getPropertyValue('--primary-color') || '#2196f3';
    const bannerText = theme.getPropertyValue('--text-primary-color') || 'white';

    const strikeDetails = `
      <div style="font-size:12px; line-height:1.5; padding:10px;">
        <p><strong>Total Strikes:</strong> ${attr.strikes_count || 0}</p>
        <p><strong>Unique Strikes:</strong> ${attr.unique_strikes || 0}</p>
        <p><strong>Closest Distance:</strong> ${
          attr.closest_dist != null ? attr.closest_dist : '—'
        } km</p>
        <p><strong>Intensity:</strong> ${
          attr.raw_norm != null ? attr.raw_norm : '—'
        }</p>
        <p><strong>Strikes/hour:</strong> ${strikesPerHour}</p>
        <p><strong>Warning Radius:</strong> ${attr.radius_km || 0} km</p>
        <p><strong>Warning Window:</strong> ${attr.window_sec || 0} sec</p>
      </div>
    `;

    const canvasId = 'radarCanvas';
    const radarSection = `
      <div style="display: flex; flex-direction: column; align-items: center; padding: 0 12px 16px;">
        <p style="margin: 8px 0; font-size:12px; text-align: center;">
          <strong>Strike Distribution Map</strong>
        </p>
        <canvas id="${canvasId}" width="250" height="250" style="border-radius:8px;"></canvas>
      </div>
    `;

    this.innerHTML = `
      <ha-card>
        <div style="
          background: ${bannerBg};
          color: ${bannerText};
          padding: 12px;
          border-radius: 8px 8px 0 0;">
          <div style="font-size:1.2em; font-weight:bold;">
            ⚡ Lightning Status: ${entity.state.toUpperCase()}
          </div>
          <div style="font-size:12px;">
            Alert Level: ${attr.alert_level || '—'}
          </div>
        </div>
        <div style="display: flex; gap: 20px; padding: 12px;">
          ${strikeDetails}
        </div>
        ${radarSection}
      </ha-card>
    `;

    const canvas = this.querySelector(`#${canvasId}`);
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(cx, cy) - 10;
      const pxPerKm = maxR / (attr.radius_km || 50);

      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      for (let km = 10; km <= (attr.radius_km || 50); km += 10) {
        ctx.beginPath();
        ctx.arc(cx, cy, km * pxPerKm, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', cx, cy);

      const distances = Array.isArray(attr.distances) ? attr.distances : [];
      distances.sort((a, b) => a - b);
      distances.forEach((km, i) => {
        const angle = (i / (distances.length || 1)) * 2 * Math.PI;
        const r = km * pxPerKm;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = km < (attr.radius_km * 0.4) ? '#d32f2f' : '#fbc02d';
        ctx.fill();
      });
    }
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('lightning-radar-card', LightningRadarCard);
