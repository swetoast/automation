class PollenSECard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) throw new Error("Please define entity");
    this.config = config;
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    const accuweatherEntity = this.config.accuweather_entity
      ? hass.states[this.config.accuweather_entity]
      : null;

    const seasonRaw = this.config.season_entity
      ? hass.states[this.config.season_entity]?.state
      : null;

    const season = seasonRaw
      ? seasonRaw.charAt(0).toUpperCase() + seasonRaw.slice(1)
      : null;

    const noPollensLabel =
      this.config.no_pollens_label || "No significant pollen levels";

    const severityMapNum = {
      1: { text: "Very Low", color: "#4CAF50" },
      2: { text: "Low", color: "#8BC34A" },
      3: { text: "Moderate", color: "#F6D860" },
      4: { text: "High", color: "#FFC107" },
      5: { text: "Very High", color: "#FF9800" },
      6: { text: "Extreme", color: "#F44336" }
    };

    const severityMapText = {
      "very low": "#4CAF50",
      "low": "#8BC34A",
      "moderate": "#F6D860",
      "high": "#FFC107",
      "very high": "#FF9800",
      "extreme": "#F44336"
    };

    const seasonalPollens = {
      Spring: ["alder", "birch", "grasses"],
      Summer: ["grasses", "mugwort", "olive_tree"],
      Autumn: ["ragweed", "mugwort"],
      Winter: []
    };

    const seasonGradients = {
      Spring: "linear-gradient(90deg, rgba(144,238,144,0.15), rgba(255,255,255,0))",
      Summer: "linear-gradient(90deg, rgba(255,215,0,0.15), rgba(255,255,255,0))",
      Autumn: "linear-gradient(90deg, rgba(255,165,0,0.15), rgba(255,255,255,0))",
      Winter: "linear-gradient(90deg, rgba(173,216,230,0.15), rgba(255,255,255,0))"
    };

    const data = entity.attributes;

    // Seasonal pollens
    let pollenList = Object.entries(data)
      .filter(([key, val]) => !["friendly_name", "icon", "OK"].includes(key))
      .map(([type, val]) => ({
        type,
        value: Number(val),
        severity: severityMapNum[Number(val)] || null,
        source: "pollen"
      }))
      .filter(p => p.value > 0 && p.severity);

    pollenList.sort((a, b) => b.value - a.value);

    // AccuWeather allergens
    let extraList = [];
    if (accuweatherEntity) {
      const attrs = accuweatherEntity.attributes;
      ["Mold", "Dust & Dander"].forEach(key => {
        if (attrs[key]) {
          const sevText = attrs[key];
          const color =
            severityMapText[sevText.toLowerCase()] || "var(--primary-text-color)";
          extraList.push({
            type: key,
            value: sevText,
            color,
            source: "accuweather"
          });
        }
      });
    }

    const style = `
      <style>
        ha-card {
          padding: 16px;
          background: var(--ha-card-background, #fff);
          color: var(--primary-text-color, #000);
          border-radius: 12px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,0.15));
        }
        h2 {
          margin: 0 0 12px;
          font-size: 1.4em;
          font-weight: 600;
        }
        h3 {
          margin: 16px 0 8px;
          font-size: 1em;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.7;
          border-top: 1px solid var(--divider-color, rgba(0,0,0,0.1));
          padding-top: 8px;
        }
        .row {
          display: flex;
          align-items: center;
          padding: 8px;
          border-radius: var(--ha-card-border-radius, 8px);
          margin-bottom: 6px;
          transition: background 0.3s ease, color 0.3s ease;
        }
        .icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          margin-right: 12px;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: transform 0.2s ease;
        }
        .icon:hover {
          transform: scale(1.05);
        }
        .icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .name {
          flex: 1;
          text-transform: capitalize;
          font-size: 1em;
        }
        .badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: 600;
          color: #fff;
          text-transform: capitalize;
          transition: background-color 0.3s ease;
        }
        .season-highlight {
          background-image: ${season && seasonGradients[season] ? seasonGradients[season] : "none"};
        }
        .no-pollens {
          text-align: center;
          font-style: italic;
          opacity: 0.7;
          padding: 12px 0;
        }
      </style>
    `;

    let rows = "";

    if (pollenList.length === 0 && extraList.length === 0) {
      rows = `<div class="no-pollens">${noPollensLabel}</div>`;
    } else {
      if (pollenList.length > 0) {
        rows += pollenList
          .map(p => {
            const isSeasonal =
              season &&
              seasonalPollens[season]?.includes(p.type.toLowerCase());
            return `
              <div class="row ${isSeasonal ? "season-highlight" : ""}">
                <div class="icon">
                  <img src="/local/pollens/${p.type.toLowerCase().replace(" ", "_")}.png" alt="${p.type}">
                </div>
                <div class="name">${p.type.replace("_", " ")}</div>
                <div class="badge" style="background-color:${p.severity.color}">
                  ${p.severity.text}
                </div>
              </div>
            `;
          })
          .join("");
      }

      if (extraList.length > 0) {
        rows += `<h3>Other Allergens</h3>`;
        rows += extraList
          .map(e => `
            <div class="row">
              <div class="icon">
                <img src="/local/pollens/${e.type.toLowerCase().replace(/ & /g, "_").replace(" ", "_")}.png" alt="${e.type}">
              </div>
              <div class="name">${e.type}</div>
              <div class="badge" style="background-color:${e.color}">
                ${e.value}
              </div>
            </div>
          `)
          .join("");
      }
    }

    const content = `
      <ha-card>
        <h2>${season ? `${season} Pollens` : "Pollens"}</h2>
        ${rows}
      </ha-card>
    `;

    this.shadowRoot.innerHTML = style + content;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("pollen-se-card", PollenSECard);

(window).customCards = (window).customCards || [];
(window).customCards.push({
  type: "pollen-se-card",
  name: "Season Pollens Card",
  preview: true,
  description:
    "Pollen data with unified severity badges, alert tooltips, seasonal badge overlay, and Sweden-localized season context.",
});
