class VasttrafikTableCard extends HTMLElement {
  setConfig(config) {
    if (!Array.isArray(config.sensors) || !config.sensors.length) {
      throw new Error("You must define at least one sensor in 'sensors'");
    }
    this.config      = config;
    this.showDelay   = config.show_delay !== false;
    this.delayColor  = config.delay_color   || "var(--error-color)";
    this.earlyColor  = config.early_color   || "var(--accent-color)";
    this.emptyText   = config.empty_text    || "No departures available";
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return this.config.sensors.length + (this.config.title ? 1 : 0);
  }

  _render() {
    if (!this.config || !this._hass) return;
    this.innerHTML = "";
    const card = document.createElement("ha-card");

    if (this.config.title) {
      const header = document.createElement("div");
      header.style.display    = "flex";
      header.style.alignItems = "center";
      header.style.padding    = "8px";

      const h = document.createElement("h1");
      h.textContent    = this.config.title;
      h.style.margin   = "0";
      h.style.fontSize = "1.2em";
      header.appendChild(h);

      if (this.config.logo) {
        const img = document.createElement("img");
        img.src             = this.config.logo;
        img.alt             = "Logo";
        img.style.height    = "24px";
        img.style.width     = "24px";
        img.style.objectFit = "contain";
        img.style.marginLeft= "auto";
        header.appendChild(img);
      }

      card.appendChild(header);
    }

    const table = document.createElement("table");
    table.style.width          = "100%";
    table.style.borderCollapse = "collapse";

    const thead  = document.createElement("thead");
    const headTr = document.createElement("tr");
    ["Time","Line","Destination","Platform","Status"].forEach(txt => {
      const th = document.createElement("th");
      th.textContent     = txt;
      th.style.padding   = "8px";
      th.style.textAlign = "center";
      th.style.background= "var(--divider-color-light)";
      headTr.appendChild(th);
    });
    thead.appendChild(headTr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const validSensors = this.config.sensors.filter(id => {
      const st = this._hass.states[id];
      return st && st.state && st.state !== "unavailable" && st.state !== "";
    });

    if (!validSensors.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan       = 5;
      td.textContent   = this.emptyText;
      td.style.padding = "16px";
      td.style.textAlign = "center";
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {

      const makeCell = (content, color) => {
        const td = document.createElement("td");
        td.textContent    = content;
        td.style.padding  = "8px";
        td.style.textAlign= "center";
        if (color) td.style.color = color;
        return td;
      };

      validSensors.forEach(sensorId => {
        const st = this._hass.states[sensorId];
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--divider-color)";

        tr.appendChild(makeCell(st.state));
        tr.appendChild(makeCell(st.attributes.line  || "-"));
        tr.appendChild(makeCell(st.attributes.to    || "-"));
        tr.appendChild(makeCell(st.attributes.track || "-"));

        let statusText = "On time", color = null;
        if (this.showDelay && st.attributes.delay != null) {
          const d = Number(st.attributes.delay);
          if (d > 0) {
            statusText = `${d} min delayed`;
            color      = this.delayColor;
          } else if (d < 0) {
            statusText = `${Math.abs(d)} min early`;
            color      = this.earlyColor;
          }
        }
        tr.appendChild(makeCell(statusText, color));

        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    card.appendChild(table);
    this.appendChild(card);
  }
}

customElements.define("vasttrafik-table-card", VasttrafikTableCard);
