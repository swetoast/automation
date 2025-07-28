class LightningRadarCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    const entity = hass.states[this.config.entity];
    const attr = entity.attributes;

    const theme = getComputedStyle(document.body);
    const bannerBg = theme.getPropertyValue('--primary-color') || '#2196f3';
    const bannerText = theme.getPropertyValue('--text-primary-color') || 'white';

    const strikeDetails = `
      <div style="font-size:12px; line-height:1.5; padding:10px;">
        <p><strong>Total Strikes:</strong> ${attr.total_strikes}</p>
        <p><strong>Unique Strikes:</strong> ${attr.unique_strikes_count}</p>
        <p><strong>Closest Distance:</strong> ${attr.closest_distance_km} km</p>
        <p><strong>Intensity:</strong> ${attr.intensity_norm}</p>
        <p><strong>Strikes/hour:</strong> ${attr.strikes_per_hour}</p>
        <p><strong>Warning Radius:</strong> ${attr.warning_radius_km} km</p>
        <p><strong>Warning Window:</strong> ${attr.warning_window_sec} sec</p>
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
          border-radius: 8px 8px 0 0;
        ">
          <div style="font-size:1.2em; font-weight:bold;">
            ⚡ Lightning Status: ${entity.state.toUpperCase()}
          </div>
          <div style="font-size:12px;">Alert Level: ${attr.alert_level}</div>
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
      const pxPerKm = maxR / 50;

      ctx.clearRect(0, 0, w, h);

      // Concentric rings
      ctx.strokeStyle = '#bbb';
      ctx.lineWidth = 1;
      for (let km = 10; km <= 50; km += 10) {
        ctx.beginPath();
        ctx.arc(cx, cy, km * pxPerKm, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Center house emoji
      ctx.font = '24px sans-serif';       // adjust size as needed
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', cx, cy);

      // Plot strikes
      (attr.sorted_distances_km || []).forEach((km, i) => {
        const angle = (i / (attr.sorted_distances_km.length || 1)) * 2 * Math.PI;
        const r = km * pxPerKm;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = km < 20 ? '#d32f2f' : '#fbc02d';
        ctx.fill();
      });
    }
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('lightning-radar-card', LightningRadarCard);
