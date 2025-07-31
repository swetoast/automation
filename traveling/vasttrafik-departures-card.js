/**
 * vasttrafik-departures-card.js
 */

import { LitElement, html, css } from 'lit';

class VasttrafikDeparturesCard extends LitElement {
  static get properties() {
    return {
      hass:    { type: Object },
      config:  { type: Object },
      _now:    { type: Number }  // used to trigger re-render
    };
  }

  constructor() {
    super();
    this._now = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    // re-render every minute
    this._timer = setInterval(() => {
      this._now = Date.now();
    }, 60 * 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  static get styles() {
    return css`
      :host { display: block; font-family: var(--ha-font-body, sans-serif); }
      ha-card {
        padding: 16px;
        border-radius: 8px;
        box-shadow: var(--ha-card-box-shadow);
      }
      .header { display: flex; align-items: center; margin-bottom: 16px; }
      .header img.logo { width: 36px; height: 36px; margin-right: 8px; }
      .header .title { font-size: 1.2em; font-weight: 500; }
      .departures {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .departure {
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 6px;
        padding: 12px;
      }
      .dep-header { display: flex; align-items: center; margin-bottom: 8px; }
      .dep-header ha-icon { 
        color: var(--primary-color, #1976d2); margin-right: 6px; 
      }
      .dep-header .line { font-weight: 600; margin-right: 4px; }
      .dep-header .time { font-size: 1.2em; margin-right: 6px; }
      .dep-header .countdown { font-size: 0.9em; color: var(--secondary-text-color, #888); }
      .grid {
        display: grid; 
        grid-template-columns: auto 1fr; 
        row-gap: 6px; column-gap: 12px;
      }
      .label {
        font-size: 0.75em;
        color: var(--secondary-text-color, #666);
        text-transform: uppercase;
      }
      .value { font-size: 0.9em; color: var(--primary-text-color, #222); }
      .value.delay { color: var(--error-color, #d32f2f); }
    `;
  }

  setConfig(config) {
    if (!Array.isArray(config.sensors) || config.sensors.length === 0) {
      throw new Error("You must define at least one sensor in 'sensors'.");
    }
    if (!config.logo) {
      throw new Error("You must provide a 'logo' URL.");
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
          <img src="${this.config.logo}" class="logo" alt="Västtrafik logo" />
          <div class="title">Västtrafik Departures</div>
        </div>
        <div class="departures">
          ${this.config.sensors.map(id => this._renderDeparture(this.hass.states[id]))}
        </div>
      </ha-card>
    `;
  }

  _renderDeparture(entity) {
    if (!entity) {
      return html`
        <div class="departure">
          <div>Sensor <strong>not found</strong></div>
        </div>`;
    }

    const a     = entity.attributes;
    const time  = entity.state;
    const now   = new Date(this._now);
    const [h, m] = time.split(':').map(v => parseInt(v));

    let depDate = new Date(
      now.getFullYear(), 
      now.getMonth(), 
      now.getDate(), 
      h, 
      m
    );

    if (depDate < now) {
      depDate.setDate(depDate.getDate() + 1);
    }
    const diffMin = Math.max(0, Math.round((depDate - now) / 60000));

    const direction = (a.direction || '').split(',')[0].trim();
    const delay     = a.delay || 0;
    const delayText = delay > 0 ? `+${delay} min` : 'On time';
    const delayClass= delay > 0 ? 'delay' : '';
    const icon      = a.icon || 'mdi:train';

    return html`
      <div class="departure">
        <div class="dep-header">
          <ha-icon .icon="${icon}"></ha-icon>
          <div class="line">Line ${a.line}</div>
          <div class="time">${time}</div>
          <div class="countdown">in ${diffMin} min</div>
        </div>
        <div class="grid">
          <div class="label">Direction</div><div class="value">${direction}</div>
          <div class="label">Track</div><div class="value">${a.track}</div>
          <div class="label">From</div><div class="value">${a.from}</div>
          <div class="label">To</div><div class="value">${a.to}</div>
          <div class="label">Accessibility</div><div class="value">${a.accessibility}</div>
          <div class="label">Delay</div>
          <div class="value ${delayClass}">${delayText}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('vasttrafik-departures-card', VasttrafikDeparturesCard);
