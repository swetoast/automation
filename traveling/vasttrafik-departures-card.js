/**
 * vasttrafik-departures-card.js
 * A Västtrafik departures card.
 */

import { LitElement, html, css } from 'lit';

class VasttrafikDeparturesCard extends LitElement {
  static get properties() {
    return {
      hass:   { type: Object },
      config: { type: Object },
      _now:   { type: Number }
    };
  }

  constructor() {
    super();
    this._now = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    this._timer = setInterval(() => (this._now = Date.now()), 60_000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  static get styles() {
    return css`
      :host {
        display: block;
        font-family: var(--ha-font-body, sans-serif);
      }
      ha-card {
        padding: 16px;
        border-radius: 8px;
        background: var(--card-background-color, var(--background-card));
        color: var(--primary-text-color);
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }
      .logo {
        width: 36px;
        height: 36px;
        margin-right: 8px;
      }
      .title {
        font-size: 1.2em;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      .departures {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .departure {
        border: 1px solid var(--divider-color);
        border-radius: 6px;
        padding: 12px;
        background: var(--card-background-color);
      }
      .dep-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }
      .dep-header ha-icon {
        color: var(--primary-color);
        margin-right: 6px;
      }
      .line {
        font-weight: 600;
        margin-right: 8px;
        color: var(--primary-text-color);
      }
      .time {
        font-size: 1.2em;
        margin-right: 4px;
        color: var(--primary-text-color);
      }
      .delay-triangle {
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 10px solid var(--vt-delay-color, var(--error-color, #f44336));
        margin: 0 6px;
      }
      .countdown {
        font-size: 0.9em;
        font-weight: 500;
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
      }
      .countdown.safe  { background: var(--vt-countdown-safe,   var(--success-color, #4caf50)); }
      .countdown.warn  { background: var(--vt-countdown-warn,   var(--warning-color, #ff9800)); }
      .countdown.alert { background: var(--vt-countdown-alert,  var(--error-color,   #f44336)); }

      .progress {
        position: relative;
        height: 6px;
        background: var(--vt-progress-bg, var(--divider-color));
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .progress-fill {
        height: 100%;
        background: var(--vt-progress-fill, var(--primary-color));
        transition: width 0.5s ease-out;
      }

      .grid {
        display: grid;
        grid-template-columns: auto 1fr;
        row-gap: 6px;
        column-gap: 12px;
      }
      .label {
        font-size: 0.75em;
        color: var(--secondary-text-color);
        text-transform: uppercase;
      }
      .value {
        font-size: 0.9em;
        color: var(--primary-text-color);
      }
      .value.delay {
        color: var(--vt-delay-color, var(--error-color));
      }
    `;
  }

  setConfig(config) {
    if (!config.sensors || !Array.isArray(config.sensors) || !config.sensors.length) {
      throw new Error("You must define at least one sensor in 'sensors'");
    }
    if (!config.logo) {
      throw new Error("You must provide a 'logo' URL");
    }
    this.config = config;
  }

  getCardSize() {
    return 1 + this.config.sensors.length * 2;
  }

  render() {
    if (!this.config || !this.hass) return html``;

    return html`
      <ha-card>
        <div class="header">
          <img src="${this.config.logo}" class="logo" alt="Logo" />
          <div class="title">Västtrafik Departures</div>
        </div>
        <div class="departures">
          ${this.config.sensors.map(id => this._renderDeparture(this.hass.states[id]))}
        </div>
      </ha-card>
    `;
  }

  _renderDeparture(entity) {
    if (!entity || ['unavailable','unknown'].includes(entity.state)) {
      return html`
        <div class="departure">
          <div class="dep-header">
            <div class="line">—</div>
            <div class="time">—</div>
            <div class="countdown safe">—</div>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:0%"></div>
          </div>
          <div class="grid">
            ${['Direction','Track','From','To','Accessibility','Delay'].map(label => html`
              <div class="label">${label}</div><div class="value">—</div>
            `)}
          </div>
        </div>
      `;
    }

    const attrs   = entity.attributes;
    const timeStr = entity.state;
    const [h, m]  = timeStr.split(':').map(v => parseInt(v, 10));
    const delay   = Number(attrs.delay) || 0;

    const now   = new Date(this._now);
    let   dep   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + delay);
    if (dep < now) dep.setDate(dep.getDate() + 1);

    const diffMin = Math.max(0, Math.round((dep - now) / 60000));
    const MAX     = 15;
    const pct     = Math.min(100, Math.max(0, Math.round(((MAX - diffMin) / MAX) * 100)));

    const displayTime = dep.toTimeString().slice(0, 5);

    const direction   = (attrs.direction || '—').split(',')[0].trim();
    const countdownCls = diffMin <= 3  ? 'alert'
                        : diffMin <= 10 ? 'warn'
                        : 'safe';

    return html`
      <div class="departure">
        <div class="dep-header">
          <ha-icon .icon="${attrs.icon || 'mdi:bus'}"></ha-icon>
          <div class="line">Line ${attrs.line}</div>
          <div class="time">${displayTime}</div>
          ${delay > 0 ? html`<div class="delay-triangle" title="Delayed"></div>` : ''}
          <div class="countdown ${countdownCls}">in ${diffMin} min</div>
        </div>
        <div class="progress">
          <div class="progress-fill" style="width:${pct}%;"></div>
        </div>
        <div class="grid">
          <div class="label">Direction</div><div class="value">${direction}</div>
          <div class="label">Track</div><div class="value">${attrs.track || '—'}</div>
          <div class="label">From</div><div class="value">${attrs.from || '—'}</div>
          <div class="label">To</div><div class="value">${attrs.to || '—'}</div>
          <div class="label">Accessibility</div><div class="value">${attrs.accessibility || '—'}</div>
          <div class="label">Delay</div>
          <div class="value delay">${delay > 0 ? `+${delay} min` : 'On time'}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('vasttrafik-departures-card', VasttrafikDeparturesCard);
