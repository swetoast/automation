// battery-card.js 
import { LitElement, html, css } from 'https://unpkg.com/lit?module';

const CONST = {
  REL_REFRESH_MS: 60_000, // refresh relative time every minute
  BUSY_RESET_MS: 900,     // feedback reset delay in ms
  DONUT: { SIZE: 140, R: 48, STROKE: 12 },
  DEFAULT_THRESHOLD: 20,
  HARD_FLOOR_PERCENT: 10, // always treat <=10% as critical low

  LABELS: {
    titleGroup: 'Title and status',
    meterText: (pct) => `Battery at ${pct}%`,
    offline: 'Offline',
    replace: 'Replace',
    ok: 'OK',
    fbMarked: 'Marked replaced',
    fbFailed: 'Failed',
    fbCopied: 'Device ID copied',
    fbCopyFailed: 'Copy failed',
  }
};

const num = (v) => Number.isFinite(Number(v)) ? Number(v) : NaN;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round = (v) => Number.isFinite(v) ? Math.round(v) : 0;
const safeString = (v, fallback = '') => { try { return String(v ?? fallback); } catch { return fallback; } };

const fmtDT = (iso) => {
  try {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
};

const fmtRel = (iso) => {
  try {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const deltaSec = Math.round((Date.now() - d.getTime()) / 1000);
    const abs = Math.abs(deltaSec);
    if (abs < 60) return 'just now';
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1]
    ];
    for (const [unit, sec] of units) {
      if (abs >= sec) {
        const value = deltaSec >= 0 ? -Math.round(abs / sec) : Math.round(abs / sec); 
        return rtf.format(value, unit);
      }
    }
    return '—';
  } catch {
    return '—';
  }
};

const modelFrom = (st) => {
  const a = st?.attributes ?? {};
  const raw = safeString(st?.state).toLowerCase();
  const level = clamp(num(st?.state), 0, 100);
  const thresholdAttr = num(a.battery_low_threshold);
  const threshold = Number.isFinite(thresholdAttr) ? thresholdAttr : CONST.DEFAULT_THRESHOLD;
  return {
    rawState: raw,
    level,
    low: !!a.battery_low,
    threshold,
    type: a.battery_type ?? '',
    qty: a.battery_quantity ?? a.battery_type_and_quantity ?? '',
    lastReplacedISO: a.battery_last_replaced ?? '',
    lastReportedISO: a.battery_last_reported ?? '',
    friendly: a.friendly_name ?? 'Battery',
    deviceId: a.device_id ?? ''
  };
};

const statusMeta = ({ level, low, threshold, rawState }) => {
  const unavailable = !rawState
    || rawState === 'unavailable'
    || rawState === 'unknown';
  if (unavailable) {
    return {
      category: 'offline',
      text: CONST.LABELS.offline,
      colorVar: 'var(--offline, #64748b)',
      icon: 'mdi:wifi-off'
    };
  }
  const underThreshold = level <= threshold;
  const underFloor = level <= CONST.HARD_FLOOR_PERCENT;
  const needsReplace = low || underThreshold || underFloor;
  if (needsReplace) {
    if (underFloor) {
      return {
        category: 'critical',
        text: CONST.LABELS.replace,
        colorVar: 'var(--error, #D04759)',
        icon: 'mdi:battery-alert'
      };
    }

    return {
      category: 'replace',
      text: CONST.LABELS.replace,
      colorVar: 'var(--replace, var(--warn, #D3B343))',
      icon: 'mdi:battery-alert'
    };
  }

  return {
    category: 'ok',
    text: CONST.LABELS.ok,
    colorVar: 'var(--success, #8BC34A)',
    icon: 'mdi:check-circle'
  };
};

class BatteryCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _st: { type: Object },
      _busyKey: { type: String },
      _fb: { type: String },
      _btnId: { type: String },
      _hasBtn: { type: Boolean },
      _logoFailed: { type: Boolean }
    };
  }

  constructor() {
    super();
    const { SIZE, R, STROKE } = CONST.DONUT;
    this._donutGeom = {
      size: SIZE, cx: SIZE / 2, cy: SIZE / 2,
      r: R, stroke: STROKE,
      circumference: 2 * Math.PI * R
    };
    this._logoFailed = false;
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error("battery-card: 'entity' is required.");
    }
    this.config = {
      entity: config.entity,
      title: config.title ?? null,
      title_logo: config.title_logo ?? '',
      replace_button: config.replace_button ?? null,
      compact: config.compact ?? true
    };
    this._logoFailed = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    this._st = hass.states[this.config.entity];
    const explicit = this.config.replace_button;
    const derived = this._deriveBtnId(this.config.entity);
    this._btnId = explicit ?? derived;
    this._hasBtn = !!hass.states[this._btnId];
  }

  connectedCallback() {
    super.connectedCallback();
    this._relTimer = setInterval(() => this.requestUpdate(), CONST.REL_REFRESH_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._relTimer) {
      try { clearInterval(this._relTimer); } finally { this._relTimer = null; }
    }
  }

  getCardSize() {
    return this.config?.compact ? 2 : 3;
  }

  _deriveBtnId(id) {
    try {
      if (typeof id !== 'string') return '';
      return id.replace(/^sensor\./, 'button.').replace(/_battery.*/i, '_battery_replaced');
    } catch {
      return '';
    }
  }

  async _runWithBusy(key, fn) {
    if (this._busyKey) return;
    this._busyKey = key;
    this._fb = '';
    try {
      await fn();
    } finally {
      setTimeout(() => {
        this._busyKey = '';
        this._fb = '';
        this.requestUpdate();
      }, CONST.BUSY_RESET_MS);
      this.requestUpdate();
    }
  }

  async _markReplaced() {
    if (!this._hasBtn || this._busyKey) return;
    await this._runWithBusy('replace', async () => {
      try {
        await this._hass.callService('button', 'press', { entity_id: this._btnId });
        this._fb = CONST.LABELS.fbMarked;
      } catch {
        this._fb = CONST.LABELS.fbFailed;
      }
    });
  }

  _moreInfo(id) {
    if (!id || this._busyKey) return;
    const e = new Event('hass-more-info', { bubbles: true, composed: true });
    e.detail = { entityId: id };
    this.dispatchEvent(e);
  }

  async _copyDeviceId(deviceId) {
    if (!deviceId || this._busyKey) return;
    await this._runWithBusy('copy', async () => {
      try {
        await navigator.clipboard.writeText(String(deviceId));
        this._fb = CONST.LABELS.fbCopied;
      } catch {
        this._fb = CONST.LABELS.fbCopyFailed;
      }
    });
  }

  _resolveUrl(url) {
    const s = safeString(url).trim();
    if (!s) return '';
    if (s.startsWith('/')) {
      try {
        return this._hass?.hassUrl?.(s) ?? s;
      } catch {
        return s;
      }
    }
    return s;
  }

  _renderBrand(logoUrl, title) {
    if (this.config.title_logo && !this._logoFailed) {
      return html`
        <div class="brand-chip" title="${title}">
          <img class="brand-img"
               src="${logoUrl}"
               alt="${title} logo"
               @error=${() => { this._logoFailed = true; this.requestUpdate(); }} />
        </div>`;
    }
    return html`
      <div class="brand-chip" title="${title}">
        <ha-icon class="brand-i" icon="mdi:battery" aria-hidden="true"></ha-icon>
      </div>`;
  }

  renderHeader(title, status) {
    const logoUrl = this._resolveUrl(this.config.title_logo);
    const brand = this._renderBrand(logoUrl, title);
    return html`
      <div class="header" role="group" aria-label="${CONST.LABELS.titleGroup}">
        <div class="row-title">
          ${brand}
          <div class="title">${title}</div>
        </div>
        <span class="status-chip ${status.category}"
              title="${status.text}"
              aria-label="${status.text}">
          <ha-icon class="chip-i" icon="${status.icon}" aria-hidden="true"></ha-icon>
          <span aria-hidden="true">${status.text}</span>
        </span>
      </div>`;
  }

  render() {
    const st = this._st;
    if (!st) {
      return html`<ha-card><div class="msg">Entity not found</div></ha-card>`;
    }
    const m = modelFrom(st);
    const title = this.config.title ?? m.friendly;
    const pct = round(m.level);
    const status = statusMeta(m);
    const arcCol = status.colorVar;
    const isCompact = !!this.config.compact;

    const { size, cx, cy, r, stroke, circumference: CIRC } = this._donutGeom;
    const dash = (clamp(pct, 0, 100) / 100) * CIRC;
    const gap = CIRC - dash;

    return html`
      <ha-card class="${isCompact ? 'compact' : 'full'}">
        ${this.renderHeader(title, status)}

        <!-- Main content row: donut gauge and details -->
        <div class="main-row">
          <div class="donut-wrap" role="meter"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"
               aria-valuetext="${CONST.LABELS.meterText(pct)}">
            <svg class="g" viewBox="0 0 ${size} ${size}" aria-hidden="true">
              <circle cx="${cx}" cy="${cy}" r="${r}"
                      fill="none"
                      stroke="color-mix(in srgb, var(--on) 16%, transparent)"
                      stroke-width="${stroke}" />
              <circle cx="${cx}" cy="${cy}" r="${r}"
                      fill="none" stroke="${arcCol}" stroke-width="${stroke}"
                      stroke-linecap="round"
                      stroke-dasharray="${dash} ${gap}"
                      transform="rotate(-90 ${cx} ${cy})" />
            </svg>
            <div class="center">
              <div class="percent">${pct}<span class="unit">%</span></div>
            </div>
          </div>

          <!-- Details list (battery type, last replaced, last reported) -->
          <div class="details-list" role="list">
            <div class="detail" role="listitem">
              <ha-icon icon="mdi:battery" class="detail-i"></ha-icon>
              <span class="k">Type</span>
              <span class="v v-primary" title="${m.type || '—'}">
                ${m.type || '—'}
                ${m.qty ? html`<span class="badge" title="Quantity">${m.qty}</span>` : ''}
              </span>
            </div>
            <div class="detail" role="listitem">
              <ha-icon icon="mdi:calendar-check" class="detail-i"></ha-icon>
              <span class="k">Last replaced</span>
              <span class="v" title="${fmtDT(m.lastReplacedISO)}">${fmtDT(m.lastReplacedISO)}</span>
            </div>
            <div class="detail" role="listitem">
              <ha-icon icon="mdi:update" class="detail-i"></ha-icon>
              <span class="k">Reported</span>
              <span class="v" title="${fmtDT(m.lastReportedISO)}">${fmtRel(m.lastReportedISO)}</span>
            </div>
          </div>
        </div>

        <!-- Action buttons: Mark Replaced, More Info, Copy ID -->
        <div class="btn-row" role="group" aria-label="Actions">
          <button class="chip icon-only ${this._busyKey==='replace'?'is-busy':''}"
                  title="${this._hasBtn ? 'Mark replaced' : 'No replace button'}"
                  aria-label="${this._hasBtn ? 'Mark replaced' : 'No replace button'}"
                  ?disabled="${!this._hasBtn || !!this._busyKey}"
                  @click=${() => this._markReplaced()}>
            <ha-icon class="chip-i" icon="mdi:battery-plus"></ha-icon>
          </button>

          <button class="chip icon-only"
                  title="More info"
                  aria-label="More info"
                  ?disabled="${!!this._busyKey}"
                  @click=${() => this._moreInfo(this.config.entity)}>
            <ha-icon class="chip-i" icon="mdi:information-outline"></ha-icon>
          </button>

          <button class="chip icon-only ${this._busyKey==='copy'?'is-busy':''}"
                  title="${m.deviceId ? 'Copy device id' : 'No device id'}"
                  aria-label="${m.deviceId ? 'Copy device id' : 'No device id'}"
                  ?disabled="${!m.deviceId || !!this._busyKey}"
                  @click=${() => this._copyDeviceId(m.deviceId)}>
            <ha-icon class="chip-i" icon="mdi:content-copy"></ha-icon>
          </button>
        </div>

        <!-- Feedback text, announced to screen readers via role="status" -->
        <div class="fb" role="status">${this._fb}</div>
      </ha-card>`;
  }

  static get styles() {
    return css`
      :host {
        /* Theme-safe tokens for colors, background, etc. */
        --surface: var(--ha-card-background, var(--card-background-color, #fff));
        --on: var(--primary-text-color, #212121);
        --on-2: var(--secondary-text-color, #9aa0a6);
        --primary: var(--primary-color, #06bfcc);
        --success: #8BC34A;
        --warn: #D3B343;
        --error: #D04759;
        --offline: #64748b;
        --replace: var(--warn); /* explicit color for Replace state */
        --radius: var(--ha-card-border-radius, 14px);
        --shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(16,24,40,.12));
      }

      ha-card {
        background: var(--surface);
        color: var(--on);
        border-radius: var(--radius);
        border: 1px solid color-mix(in srgb, var(--on) 14%, transparent);
        box-shadow: var(--shadow);
        padding: 14px;
      }

      ha-card.compact {
        padding: 12px;
      }

      /* Header section: device icon + title on left, status chip on right */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .row-title {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .title {
        font-weight: 800;
        font-size: 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .brand-chip {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--surface);
        border: 2px solid var(--on-2); /* adaptive outline around device icon */
        box-shadow: 0 1px 2px rgba(0,0,0,.06);
        flex: 0 0 32px;
      }

      .brand-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .brand-i {
        --mdc-icon-size: 20px;
        color: var(--primary);
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 12px;
        line-height: 1.1;
        white-space: nowrap;
        color: #fff; /* default text color (overridden for replace state below) */
      }

      .chip-i {
        --mdc-icon-size: 20px;
        color: currentColor;
      }

      .status-chip.ok {
        background: var(--success);
        border: 1px solid color-mix(in oklab, var(--success) 80%, #000 20%);
        text-shadow: 0 1px 0 rgba(0,0,0,.18);
      }

      .status-chip.replace {
        background: var(--replace);
        border: 1px solid color-mix(in oklab, var(--replace) 80%, #000 20%);
        color: #000; /* black text for better contrast on yellow */
        text-shadow: none; /* remove text shadow for replace state */
      }

      .status-chip.critical {
        background: var(--error);
        border: 1px solid color-mix(in oklab, var(--error) 80%, #000 20%);
        /* text color remains white (default) for red background */
        text-shadow: 0 1px 0 rgba(0,0,0,.24);
      }

      .status-chip.offline {
        background: var(--offline);
        border: 1px solid color-mix(in oklab, var(--offline) 80%, #000 20%);
        text-shadow: 0 1px 0 rgba(0,0,0,.20);
      }

      /* Layout structure */
      .main-row {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 20px;
        margin-bottom: 10px;
      }

      .donut-wrap {
        position: relative;
        width: 140px;
        height: 140px;
        display: grid;
        place-items: center;
      }

      .g {
        width: 140px;
        height: 140px;
        display: block;
      }

      .center {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        text-align: center;
      }

      .percent {
        font-weight: 900;
        font-size: 28px;
        letter-spacing: 0.2px;
      }

      .percent .unit {
        font-size: 0.7em;
        opacity: 0.8;
        margin-left: 0.04em;
      }

      /* Details list styling */
      .details-list {
        display: grid;
        grid-auto-rows: minmax(22px, auto);
        gap: 8px;
        min-width: 220px;
        font-size: 13px;
        color: var(--on-2);
      }

      .detail {
        display: grid;
        grid-template-columns: 16px 96px 1fr; /* icon - label - value */
        align-items: center;
        gap: 8px;
        min-height: 24px;
      }

      .detail-i {
        --mdc-icon-size: 16px;
        color: var(--on-2);
        opacity: 0.85;
      }

      .k {
        font-weight: 700;
        color: color-mix(in srgb, var(--on) 78%, transparent);
        white-space: nowrap;
      }

      .v {
        font-weight: 900;
        color: var(--on);
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .v-primary {
        font-size: 13.5px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 6px;
        padding: 0 6px;
        height: 18px;
        min-width: 22px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        color: #fff;
        background: color-mix(in srgb, var(--primary) 68%, #000);
      }

      /* Bottom control buttons (chips) */
      .btn-row {
        display: flex;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 6px;
      }

      .chip.icon-only {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        border: 1px solid color-mix(in oklab, var(--on) 14%, var(--surface) 86%);
        background: color-mix(in oklab, var(--on) 8%, var(--surface) 92%);
        color: var(--on);
        box-shadow: 0 1px 2px rgba(16,24,40,0.08);
        transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
      }

      .chip.icon-only .chip-i {
        --mdc-icon-size: 22px;
      }

      .chip.icon-only:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
        box-shadow: 0 3px 6px rgba(16,24,40,0.12);
      }

      .chip.icon-only:active {
        transform: translateY(0);
        filter: brightness(0.96);
      }

      .chip.icon-only:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .chip.icon-only.is-busy::after {
        content: "";
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.6);
        border-top-color: transparent;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .fb {
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        color: var(--primary);
        margin-top: 6px;
      }

      /* "full" (non-compact) tweaks */
      .full .main-row {
        grid-template-columns: 1fr;
      }

      .full .details-list {
        min-width: 0;
      }

      .full .donut-wrap {
        margin-inline: auto;
      }

      /* Responsive adjustments */
      @media (max-width: 520px) {
        .main-row {
          grid-template-columns: 1fr;
        }
        .details-list {
          min-width: 0;
        }
        .donut-wrap {
          margin-inline: auto;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .chip.icon-only, .g {
          transition: none;
        }
      }
    `;
  }
}

if (!customElements.get('battery-card')) {
  customElements.define('battery-card', BatteryCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some(c => c && c.type === 'battery-card')) {
  window.customCards.push({
    type: 'battery-card',
    name: 'Battery Card (Roborock-style header)',
    preview: true,
    description: 'Donut gauge with battery details.'
  });
}
