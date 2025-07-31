class VTDeparturesCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("You must define an array of `entities`");
    }
    this._config = config;
  }

  getCardSize() {
    return 3;
  }

  set hass(hass) {
    if (!this.content) {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          .card {
            padding: 16px;
            font-family: sans-serif;
          }
          .header {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .departure {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 0;
          }
          .line {
            font-weight: bold;
            margin-right: 8px;
            width: 2em;
          }
          .destination {
            flex-grow: 1;
            margin-right: 8px;
          }
          .time {
            font-family: monospace;
            margin-right: 4px;
            width: 4.5em;
            text-align: right;
          }
          .triangle {
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 10px solid var(--vt-delay-color, #b71c1c);
            margin-left: 6px;
          }
          .countdown {
            font-size: 0.9em;
            color: #666;
            width: 5em;
            text-align: right;
          }
        </style>
        <div class="card">
          <div class="header" id="header"></div>
          <div id="departures"></div>
        </div>
      `;
      this.shadowRoot.appendChild(shadow);
      this.content = this.shadowRoot.querySelector('.card');
    }

    const config = this._config;
    const now = new Date();

    const title = config.title || 'Departures';
    this.shadowRoot.querySelector('#header').textContent = title;

    const deps = (config.entities || [])
      .map(entityId => hass.states[entityId])
      .filter(state => state && state.state)
      .map(state => {

        const [h, m] = state.state.split(':').map(Number);
        const delay = Number(state.attributes.delay) || 0;
        
        const depDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h,
          m + delay,
        );

        return {
          line: state.attributes.line || '',
          destination: state.attributes.to || state.attributes.direction || '',
          delay,
          depDate,
        };
      })
      .sort((a, b) => a.depDate - b.depDate);

    const container = this.shadowRoot.querySelector('#departures');
    container.innerHTML = '';

    deps.forEach(dep => {
      const adjustedTime = dep.depDate.toTimeString().slice(0, 5);
      const minutesLeft = Math.round((dep.depDate - now) / 60000);
      const countdownStr =
        minutesLeft > 0 ? `in ${minutesLeft} min`
        : minutesLeft === 0 ? 'now'
        : 'departed';

      const row = document.createElement('div');
      row.className = 'departure';
      row.innerHTML = `
        <div class="line">${dep.line}</div>
        <div class="destination">${dep.destination}</div>
        <div class="time">${adjustedTime}</div>
        ${dep.delay > 0 ? '<div class="triangle" title="Delayed"></div>' : ''}
        <div class="countdown">${countdownStr}</div>
      `;
      container.appendChild(row);
    });
  }
}

customElements.define('vt-departures-card', VTDeparturesCard);
