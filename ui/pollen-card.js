// pollen-card.js
// Supported keys: type, entities, title, title_logo, icon, seasonal, auto_hide
import { LitElement, html, css } from "https://unpkg.com/lit?module";

class PollenCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _logoFailed: { type: Boolean },
    };
  }

  static getStubConfig() {
    return {
      entities: [],
      title: "Pollens",
      title_logo: "",
      icon: "mdi:flower-pollen",
      seasonal: true,
      auto_hide: true, // default
    };
  }

  setConfig(config) {
    const allowed = new Set([
      "type",
      "entities",
      "title",
      "title_logo",
      "icon",
      "seasonal",
      "auto_hide",
    ]);
    const invalid = Object.keys(config ?? {}).filter((k) => !allowed.has(k));
    if (invalid.length) {
      throw new Error(
        `Unsupported option(s): ${invalid.join(
          ", "
        )}. Allowed keys are: ${[...allowed].join(", ")}.`
      );
    }
    if (!Array.isArray(config?.entities) || config.entities.length === 0) {
      throw new Error("Missing 'entities' array in card config.");
    }
    const defaults = PollenCard.getStubConfig();
    this.config = { ...defaults, ...config };
    this._logoFailed = false;
  }

  getCardSize() { return 3; }

  /* ---------------- helpers ---------------- */
  _resolveUrl(url) {
    if (!url) return "";
    const s = String(url).trim();
    if (s.startsWith("/")) {
      try { return this.hass?.hassUrl(s) ?? s; } catch { return s; }
    }
    return s;
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    const e = new Event("hass-more-info", { bubbles: true, composed: true });
    e.detail = { entityId };
    this.dispatchEvent(e);
  }

  _normalizeLabel(label) {
    // Normalize tokens so "grasses" collapses into "grass"
    const t = String(label ?? "").trim().toLowerCase();
    return t.replace(/\bgrasses\b/g, "grass");
  }

  _sevKey(v) {
    const s = String(v ?? "").trim().toLowerCase();
    if (["extreme", "very high", "severe"].includes(s)) return "extreme";
    if (s === "high") return "high";
    if (["medium", "moderate"].includes(s)) return "medium";
    if (["low", "none", "n/a", "na", "0"].includes(s)) return "low";
    const n = Number(s);
    if (!Number.isNaN(n)) {
      if (n >= 8) return "extreme";
      if (n >= 6) return "high";
      if (n >= 3) return "medium";
      return "low";
    }
    return "low";
  }

  _sevScore(key) { return { low: 0, medium: 1, high: 2, extreme: 3 }[key] ?? 0; }

  _sevColor(key) {
    return (
      { low: "#43A047", medium: "#F4B400", high: "#E53935", extreme: "#8E24AA" }[key]
      ?? "#9AA0A6"
    );
  }

  _classify(name) {
    const t = this._normalizeLabel(name);
    if (/(mold|mould|dust|dander)\b/.test(t)) return "Indoor";
    return "Outdoor";
  }

  _typeIcon(name) {
    const t = this._normalizeLabel(name); // e.g., "grasses" -> "grass"
    if (/\btrees?\b/.test(t) || /\btree pollen\b/.test(t)) return "mdi:tree";
    if (/\bgrass\b/.test(t)) return "mdi:grass"; // grass fix
    if (/\bragweed\b/.test(t)) return "mdi:flower-pollen";
    if (/(mold|mould)\b/.test(t)) return "mdi:mushroom-outline";
    if (/(dander|dust)\b/.test(t)) return "mdi:feather";
    if (/\bbirch\b/.test(t)) return "mdi:tree-outline";
    if (/\balder\b/.test(t)) return "mdi:tree";
    if (/\bmugwort\b/.test(t)) return "mdi:flower";
    if (/\bolive\b/.test(t)) return "mdi:fruit-olive";
    return "mdi:leaf";
  }

  _titleCase(s) {
    const str = String(s ?? "").toLowerCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ---------------- Adjust this too your seasonal pollens ---------------- */
  _seasonCatalog() {
    return {
      trees:   { start: [2, 1],  end: [5,31] },
      alder:   { start: [2,15],  end: [5, 7] },
      birch:   { start: [3,15],  end: [6,15] },
      grass:   { start: [5,15],  end: [9, 7] },
      mugwort: { start: [7, 1],  end: [9,15] },
      ragweed: { start: [8,15],  end: [10,7] },
      olive:   { start: null,    end: null },
      mold:    { start: null, end: null },
      mould:   { start: null, end: null },
      dust:    { start: null, end: null },
      dander:  { start: null, end: null },
    };
  }

  _seasonKeyFromLabel(name) {
    const t = this._normalizeLabel(name);
    if (/\bbirch\b/.test(t)) return "birch";
    if (/\balder\b/.test(t)) return "alder";
    if (/\bmugwort\b/.test(t)) return "mugwort";
    if (/\bragweed\b/.test(t)) return "ragweed";
    if (/\bolive\b/.test(t)) return "olive";
    if (/\bgrass\b/.test(t)) return "grass";
    if (/\btrees?\b/.test(t) || /\btree pollen\b/.test(t)) return "trees";
    if (/\bmold\b/.test(t)) return "mold";
    if (/\bmould\b/.test(t)) return "mould";
    if (/\bdust\b/.test(t)) return "dust";
    if (/\bdander\b/.test(t)) return "dander";
    return null;
  }

  _today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  _dateYMD(year, m, d) { return new Date(year, (m ?? 1) - 1, d ?? 1); }

  _seasonStatus(seasonKey) {
    if (!seasonKey) return null;
    const cat = this._seasonCatalog()[seasonKey];
    if (!cat || !cat.start || !cat.end) return { state: "off" };

    const startBufferDays = 14, endBufferDays = 7;
    const today = this._today();
    const y = today.getFullYear();
    let start = this._dateYMD(y, cat.start[0], cat.start[1]);
    let end   = this._dateYMD(y, cat.end[0],   cat.end[1]);
    if (end < start) end = this._dateYMD(y + 1, cat.end[0], cat.end[1]); // safety

    const startWithBuffer = new Date(start.getTime() - startBufferDays * 86400000);
    const endWithBuffer   = new Date(end.getTime()   + endBufferDays   * 86400000);

    if (today >= startWithBuffer && today <= endWithBuffer) {
      if (today < start) return { state: "pre" };   // SOON
      if (today > end)   return { state: "post" };  // TAPERING
      return { state: "in" };                       // IN SEASON
    }
    return { state: "off" };                        // OFF SEASON
  }

  _seasonChip(it) {
    if (!this.config.seasonal) return html``;
    if (it.category === "Indoor") {
      return html`<span class="season-chip placeholder" aria-hidden="true"></span>`;
    }

    const map = { in: "IN SEASON", pre: "SOON", post: "TAPERING", off: "OFF SEASON" };
    const label = map[it.season?.state ?? "off"] ?? "OFF SEASON";
    const cls = `season-chip ${it.season?.state ?? "off"}`;
    const reason =
      it.outlierReason === "consensus"
        ? `Consensus outlier: ${it.outlierConsensus}/${it.outlierSources} sources ≥ Medium`
        : it.outlierReason === "fallback_high"
        ? `Outlier: single source High+`
        : "";
    const title = reason ? `${label} — ${reason}` : label;

    return html`<span class=${cls} role="status" title=${title} aria-label="Season status: ${label}">${label}</span>`;
  }

  _buildRows(entityIds) {
    const known = new Set([
      "attribution", "icon", "friendly_name", "unit_of_measurement", "device_class",
    ]);

    const agg = new Map();
    for (const entityId of entityIds) {
      const entity = this.hass?.states?.[entityId];
      if (!entity?.attributes) continue;

      for (const [key, val] of Object.entries(entity.attributes)) {
        if (known.has(key)) continue;

        const normKey = this._normalizeLabel(key);
        const label = this._titleCase(normKey);
        const sevKey = this._sevKey(val);
        const sevScore = this._sevScore(sevKey);
        const category = this._classify(normKey);
        const icon = this._typeIcon(normKey);

        let a = agg.get(normKey);
        if (!a) {
          a = {
            normKey,
            label,
            category,
            icon,
            src: new Map(),  // source -> severity
            levelKey: "low",
            severity: 0,
            sourceEntity: entityId,
          };
          agg.set(normKey, a);
        }
        a.src.set(entityId, sevKey);
        if (sevScore > a.severity) {
          a.severity = sevScore;
          a.levelKey = sevKey;
          a.sourceEntity = entityId;
        }
      }
    }

    const out = [];
    for (const a of agg.values()) {
      const seasonKey = this._seasonKeyFromLabel(a.normKey);
      const season = this.config.seasonal ? this._seasonStatus(seasonKey) : null;

      let include = true;
      let outlierReason = null;
      let outlierConsensus = 0;
      let outlierSources = 0;

      const autoHide = this.config.auto_hide !== false; // default true
      if (autoHide && this.config.seasonal && a.category === "Outdoor" && season?.state === "off") {
        // Count sources with >= Medium (ignore Low/None)
        let consensus = 0;
        for (const [, sevK] of a.src.entries()) {
          const sc = this._sevScore(sevK);
          if (sc >= 1) consensus += 1;
        }

        if (consensus >= 2) {
          include = true;
          outlierReason = "consensus";
          outlierConsensus = consensus;
          outlierSources = a.src.size;
        } else if (consensus === 1) {
          let loneScore = 0;
          for (const [, sevK] of a.src.entries()) {
            const sc = this._sevScore(sevK);
            if (sc >= 1) loneScore = Math.max(loneScore, sc);
          }
          if (loneScore >= 2) {
            include = true;
            outlierReason = "fallback_high";
            outlierConsensus = 1;
            outlierSources = a.src.size;
          } else {
            include = false;
          }
        } else {
          include = false;
        }
      }

      if (!include) continue;

      out.push({
        normKey: a.normKey,
        label: a.label,
        sourceEntity: a.sourceEntity,
        category: a.category,
        icon: a.icon,
        levelKey: a.levelKey,
        levelText: this._titleCase(a.levelKey),
        severity: a.severity,
        seasonKey,
        season,
        outlierReason,
        outlierConsensus,
        outlierSources,
      });
    }

    out.sort((x, y) =>
      y.severity !== x.severity ? y.severity - x.severity : x.label.localeCompare(y.label)
    );

    return out;
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const entities = this.config.entities ?? [];
    const rows = this._buildRows(entities);
    const headerText = (this.config.title && String(this.config.title).trim()) || "Pollens";

    // Group rows: Indoor, then Outdoor
    const order = ["Indoor", "Outdoor"];
    const grouped = Object.fromEntries(order.map((g) => [g, []]));
    for (const r of rows) (grouped[r.category] ?? (grouped[r.category] = [])).push(r);
    const visibleGroups = order.filter((g) => (grouped[g] ?? []).length);

    return html`
      <ha-card>
        <div class="header" role="group" aria-label="Card title">
          ${this._brandChip(headerText)}
          <div class="title-text">${headerText}</div>
        </div>

        ${rows.length === 0
          ? html`
              <div class="msg empty" role="status" aria-live="polite" aria-atomic="true">
                <ha-icon class="msg-icon ok" icon="mdi:check-circle"></ha-icon>
                No data.
              </div>
            `
          : html`
              <div class="list" aria-live="polite">
                ${visibleGroups.map(
                  (g) => html`
                    <div class="group-label" aria-label="Group ${g}">${g}</div>
                    ${grouped[g].map((it) => this._renderRow(it))}
                  `
                )}
              </div>
            `}
      </ha-card>
    `;
  }

  _renderRow(it) {
    const aria = `${it.label} — level ${it.levelText}`.trim();
    const dotSize = 10;
    const dotColor = this._sevColor(it.levelKey);
    const groupStripClass = it.category === "Indoor" ? "bluegray" : "green";
    const open = () => this._openMoreInfo(it.sourceEntity);
    return html`
      <div
        class="item"
        data-group=${it.category}
        role="group"
        aria-label=${aria}
        @click=${open}
        @keydown=${(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
        tabindex="0"
      >
        <div class="strip ${groupStripClass}"></div>
        <div class="content">
          <div class="title-line">
            <ha-icon class="inline-icon" icon=${it.icon}></ha-icon>
            <span class="label" title=${it.label}>${it.label}</span>
            ${this._seasonChip(it)}
            <span class="level" aria-label="Level ${it.levelText}">
              <span class="dot" style="width:${dotSize}px;height:${dotSize}px;background:${dotColor};"></span>
              <span class="level-text">${it.levelText}</span>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  _brandChip(title = "") {
    const logoUrl = this._resolveUrl(this.config.title_logo);
    if (logoUrl && !this._logoFailed) {
      const img = html`<img
        class="brand-img"
        src=${logoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />`;
      this.updateComplete?.then(() => {
        const node = this.renderRoot?.querySelector(".brand-img");
        if (node && !node._bound) {
          node._bound = true;
          node.addEventListener("error", () => {
            this._logoFailed = true;
            this.requestUpdate();
          }, { once: true });
        }
      });
      return html`<div class="brand-chip" title=${title}>${img}</div>`;
    }
    const icon = this.config.icon || "mdi:flower-pollen";
    return html`
      <div class="brand-chip" title=${title}>
        <ha-icon class="brand-i" icon=${icon}></ha-icon>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host { font-family: inherit; }
      ha-card {
        padding: 0;
        background: var(--card-background-color, #fff);
        border-radius: var(--ha-card-border-radius, 12px);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color, rgba(0,0,0,.12));
        box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(16,24,40,.12));
        font-family: inherit;
        container-type: inline-size; /* for chip auto-fit */
      }

      /* Header */
      .header {
        padding: 12px 16px;
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--divider-color, rgba(0,0,0,.12));
      }
      .brand-chip {
        position: relative;
        width: 32px; height: 32px; border-radius: 10px;
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--card-background-color, #fff);
        overflow: hidden; flex: 0 0 32px;
        box-shadow: 0 1px 2px rgba(0,0,0,.06);
      }
      .brand-chip::before {
        content: ""; position: absolute; inset: 0; border-radius: inherit; border: 2px solid #fff; pointer-events: none;
      }
      .brand-chip::after {
        content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px color-mix(in srgb, #fff 65%, transparent); pointer-events: none;
      }
      .brand-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .brand-i { --mdc-icon-size: 20px; color: color-mix(in srgb, var(--secondary-text-color) 25%, var(--state-warning-color, #facd5a) 75%); }
      .title-text { font-weight: 700; font-size: 16px; line-height: 1.25; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; word-break: keep-all; font-family: inherit; }

      /* Messages */
      .msg {
        padding: 12px 16px; margin: 12px 16px;
        color: var(--primary-text-color);
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, rgba(0,0,0,.12));
        border-radius: var(--ha-card-border-radius, 12px);
        font-size: 14px; font-family: inherit;
        display: flex; align-items: center; gap: 8px;
      }
      .msg-icon { --mdc-icon-size: 20px; color: #66BB6A; }
      .msg.error .msg-icon { color: #FF6B6B; }

      /* Better empty state */
      .msg.empty { border-style: dashed; color: var(--secondary-text-color); }
      .msg.empty .msg-icon { color: color-mix(in srgb, var(--secondary-text-color) 45%, transparent); }

      /* List */
      .list {
        padding: 12px 16px 16px;
        display: grid;
        gap: 6px;
        position: relative;
        max-height: var(--pollen-list-max-height, auto);
        overflow: auto;
      }

      .group-label {
        position: sticky; top: 0; z-index: 5;
        background: var(--card-background-color, #fff);
        font-weight: 700; font-size: 12px; letter-spacing: .3px; text-transform: uppercase;
        padding: 8px 0 6px; margin-top: 6px; margin-bottom: 4px;
        /* FIX: remove border-bottom to avoid double line; keep only the long ::after line */
        border-bottom: 0;
        backdrop-filter: saturate(120%) blur(2px);
      }
      /* Single long gridline only */
      .group-label::after {
        content: "";
        display: block;
        height: 1px;
        margin-top: 6px;
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--divider-color, rgba(0,0,0,.12)) 85%, transparent),
          transparent 60%
        );
      }

      .item {
        display: grid;
        grid-template-columns: 6px 1fr;
        gap: 10px; column-gap: 12px;
        align-items: center;
        padding: 6px 0;
        cursor: pointer;
      }
      .item:hover { background: transparent; }

      .strip { width: 6px; border-radius: 3px; background: var(--divider-color, rgba(0,0,0,.18)); }
      .strip.bluegray { background: linear-gradient(180deg, color-mix(in srgb, #607d8b 94%, transparent) 0%, #607d8b 100%); }
      .strip.green   { background: linear-gradient(180deg, color-mix(in srgb, #2e7d32 94%, transparent) 0%, #2e7d32 100%); }

      .content { display: grid; gap: 6px; min-width: 0; }

      /* Title line: [icon] [label] [season chiplet] [level] */
      .title-line {
        display: grid;
        grid-template-columns: auto 1fr max-content max-content;
        gap: 6px;
        align-items: center;
        font-weight: 700; font-size: 14px; line-height: 18px;
        min-width: 0;
      }

      .inline-icon { --mdc-icon-size: 18px; transform: translateY(1px); image-rendering: -webkit-optimize-contrast; }
      .item[data-group="Indoor"] .inline-icon { color: #4285F4; }
      .item[data-group="Outdoor"] .inline-icon { color: #2e7d32; }

      .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: .2px; }

      .level {
        display: inline-grid; grid-auto-flow: column; gap: 0.6ch;
        align-items: center; color: var(--secondary-text-color);
        font-size: 13px; letter-spacing: .1px;
        font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1, "lnum" 1;
      }
      .level-text { min-width: 8ch; text-align: left; }

      .dot { display: inline-block; border-radius: 50%; box-shadow: 0 0 0 1px color-mix(in srgb, #000 8%, #fff 92%); }

      /* Seasonal chiplet (inline, outdoor only). Placeholder keeps alignment. */
      .season-chip {
        display: inline-flex; align-items: center; justify-content: center;
        height: 18px; padding: 0 6px; border-radius: 6px;
        font-size: 11px; font-weight: 700; letter-spacing: .28px;
        text-transform: uppercase; white-space: nowrap; line-height: 1;
        min-width: 8ch; color: var(--primary-text-color);
        border: 1px solid var(--divider-color, rgba(0,0,0,.14));
        background: color-mix(in srgb, var(--card-background-color) 88%, transparent);
      }
      .season-chip.in   { color: #2e7d32; border-color: color-mix(in srgb, #2e7d32 36%, transparent); }
      .season-chip.pre  { color: #1e88e5; border-color: color-mix(in srgb, #1e88e5 36%, transparent); }
      .season-chip.post { color: #f59e0b; border-color: color-mix(in srgb, #f59e0b 36%, transparent); }
      .season-chip.off  { color: var(--secondary-text-color); opacity: .9; }
      .season-chip.placeholder { visibility: hidden; padding: 0; min-width: 0; border: 0; width: 0; }

      /* Season chip auto-fit via container query */
      @container (max-width: 360px) {
        .season-chip { letter-spacing: .15px; padding: 0 5px; }
      }
      :host([narrow]) .season-chip { letter-spacing: .15px; padding: 0 5px; }

      /* A11y focus */
      .item:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    `;
  }
}

customElements.define("pollen-card", PollenCard);

window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c && c.type === "pollen-card")) {
  window.customCards.push({
    type: "pollen-card",
    name: "Pollen Card (seasonal chiplet, outdoor only, EN-only)",
    description:
      "Grouped flat list; seasonal chiplet (IN SEASON / SOON / TAPERING / OFF SEASON) appears only for outdoor allergens. Off-season auto-hide with consensus outlier.",
  });
}
