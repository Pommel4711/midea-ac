/*
 * KB35 Climate Dashboard Card
 * A dependency-free Home Assistant Lovelace card for the Kältebringer KB35.
 * SPDX-License-Identifier: MIT
 */

const KB35_CARD_VERSION = "0.2.0";

const DEFAULTS = {
  title: "Splitanlage",
  fan_auto_preset: "Auto",
  temperature_min: 16,
  temperature_max: 30,
  switches: {
    display: null,
    boost: null,
    sleep: null,
    frost: null,
    beeper: null,
  },
  selects: {
    power_limit: null,
  },
  sensors: {
    outdoor_temperature: null,
    communication: null,
    error_code: null,
  },
};

const HVAC_OPTIONS = [
  ["off", "Aus"],
  ["auto", "Auto"],
  ["cool", "Kühlen"],
  ["dry", "Entfeuchten"],
  ["heat", "Heizen"],
  ["fan_only", "Nur Lüfter"],
];

const SWING_OPTIONS = [
  ["off", "Aus"],
  ["vertical", "Vertikal"],
  ["horizontal", "Horizontal"],
  ["both", "Beide"],
];

const SWITCH_META = {
  display: { label: "Display", icon: "mdi:television" },
  boost: { label: "Boost", icon: "mdi:rocket-launch-outline" },
  sleep: { label: "Sleep", icon: "mdi:power-sleep" },
  frost: { label: "Frostschutz", icon: "mdi:snowflake-thermometer" },
  beeper: { label: "Piepton", icon: "mdi:volume-high" },
};

// The original SmartKey presents these actions in one bottom sheet. Actions
// marked "awaiting_capture" deliberately stay disabled until a KB35 frame is
// captured; the card must never make up protocol commands for them.
const QUICK_ACTIONS = [
  { key: "fan", label: "Lüfter", icon: "mdi:fan", action: "fan" },
  { key: "quickstart", label: "Schnellstart", icon: "mdi:heart-outline", action: "awaiting_capture" },
  { key: "horizontal_swing", label: "Links ↔ rechts", icon: "mdi:arrow-left-right", action: "horizontal_swing" },
  { key: "vertical_swing", label: "Oben ↕ unten", icon: "mdi:arrow-up-down", action: "vertical_swing" },
  { key: "gear", label: "Gang", icon: "mdi:gauge", action: "power_limit" },
  { key: "air_direction", label: "Luftrichtung", icon: "mdi:directions-fork", action: "awaiting_capture" },
  { key: "boost", label: "Boost", icon: "mdi:rocket-launch-outline", action: "switch" },
  { key: "sleep", label: "Sleep", icon: "mdi:power-sleep", action: "switch" },
  { key: "frost", label: "Frostschutz", icon: "mdi:snowflake-thermometer", action: "switch" },
  { key: "display", label: "LED", icon: "mdi:led-outline", action: "switch" },
  { key: "schedule", label: "Zeitplan", icon: "mdi:calendar-clock-outline", action: "awaiting_capture" },
];

const MODE_META = {
  off: { label: "Aus", icon: "mdi:power" },
  auto: { label: "Auto", icon: "mdi:refresh-auto" },
  cool: { label: "Kühlen", icon: "mdi:snowflake" },
  dry: { label: "Entfeuchten", icon: "mdi:water-percent" },
  heat: { label: "Heizen", icon: "mdi:fire" },
  fan_only: { label: "Lüfter", icon: "mdi:fan" },
  unavailable: { label: "Nicht verfügbar", icon: "mdi:alert-circle-outline" },
  unknown: { label: "Unbekannt", icon: "mdi:help-circle-outline" },
};

class KB35ClimateDashboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._activeDial = "temperature";
    this._draftValue = null;
    this._dragging = false;
    this._notice = "";
    this._sheetOpen = false;
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    if (!config || !config.climate_entity || !config.fan_entity) {
      throw new Error(
        "Bitte climate_entity und fan_entity für kb35-climate-dashboard-card angeben.",
      );
    }

    this._config = {
      ...DEFAULTS,
      ...config,
      switches: { ...DEFAULTS.switches, ...(config.switches || {}) },
      selects: { ...DEFAULTS.selects, ...(config.selects || {}) },
      sensors: { ...DEFAULTS.sensors, ...(config.sensors || {}) },
    };
    this._build();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 9;
  }

  static getStubConfig() {
    return {
      type: "custom:kb35-climate-dashboard-card",
      title: "Splitanlage 1. OG",
      climate_entity: "climate.splitanlage_1og",
      fan_entity: "fan.splitanlage_1og_luefter",
    };
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        * { box-sizing: border-box; }
        ha-card {
          --kb35-accent: var(--state-climate-cool-color, #4ba8ff);
          --kb35-accent-soft: color-mix(in srgb, var(--kb35-accent) 20%, transparent);
          background:
            radial-gradient(circle at 90% 0%, var(--kb35-accent-soft), transparent 37%),
            var(--ha-card-background, var(--card-background-color));
          border-radius: 28px;
          box-shadow: var(--ha-card-box-shadow, 0 3px 8px rgba(0, 0, 0, .18));
          color: var(--primary-text-color);
          overflow: hidden;
          position: relative;
        }
        button, select { font: inherit; }
        button { color: inherit; cursor: pointer; }
        button:focus-visible, select:focus-visible {
          outline: 2px solid var(--kb35-accent);
          outline-offset: 3px;
        }
        .shell { padding: 20px; }
        .topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .eyebrow {
          color: var(--secondary-text-color);
          font-size: .75rem;
          font-weight: 700;
          letter-spacing: .09em;
          text-transform: uppercase;
        }
        h2 { font-size: 1.3rem; line-height: 1.25; margin: 3px 0 0; }
        .status { display: flex; align-items: center; gap: 5px; color: var(--secondary-text-color); font-size: .83rem; margin-top: 5px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--disabled-text-color); }
        .status-dot.online { background: #3ecf8e; box-shadow: 0 0 0 4px rgba(62, 207, 142, .13); }
        .power {
          background: var(--secondary-background-color, rgba(127, 127, 127, .12));
          border: 0;
          border-radius: 15px;
          display: grid;
          height: 46px;
          min-width: 46px;
          place-items: center;
          transition: background .2s, color .2s, transform .2s;
        }
        .power:active { transform: scale(.94); }
        .power.on { background: var(--kb35-accent); color: #fff; }
        .power ha-icon { --mdc-icon-size: 23px; }
        .metrics { display: grid; gap: 9px; grid-template-columns: repeat(3, 1fr); margin: 19px 0 15px; }
        .metric { background: color-mix(in srgb, var(--secondary-background-color, #777) 42%, transparent); border-radius: 14px; min-width: 0; padding: 10px 11px; }
        .metric-label { color: var(--secondary-text-color); display: block; font-size: .72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .metric-value { display: block; font-size: 1rem; font-variant-numeric: tabular-nums; font-weight: 700; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tabs { background: color-mix(in srgb, var(--secondary-background-color, #777) 62%, transparent); border-radius: 15px; display: grid; gap: 4px; grid-template-columns: 1fr 1fr; padding: 4px; }
        .tab { align-items: center; background: transparent; border: 0; border-radius: 11px; display: flex; font-size: .85rem; font-weight: 700; gap: 7px; justify-content: center; min-height: 39px; transition: background .2s, box-shadow .2s; }
        .tab.active { background: var(--ha-card-background, var(--card-background-color)); box-shadow: 0 1px 4px rgba(0, 0, 0, .15); }
        .tab ha-icon { --mdc-icon-size: 19px; }
        .dial-area { display: grid; place-items: center; padding: 20px 0 17px; }
        .dial {
          --progress: .5;
          height: min(290px, 76vw);
          max-height: 290px;
          max-width: 290px;
          position: relative;
          touch-action: none;
          user-select: none;
          width: min(290px, 76vw);
        }
        .ring {
          background: conic-gradient(from 225deg, var(--kb35-accent) calc(var(--progress) * 270deg), color-mix(in srgb, var(--secondary-text-color) 20%, transparent) 0deg 270deg, transparent 0deg);
          border-radius: 50%;
          inset: 0;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 19px), #000 calc(100% - 18px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 19px), #000 calc(100% - 18px));
          position: absolute;
        }
        .marker {
          height: 100%;
          left: 0;
          pointer-events: none;
          position: absolute;
          top: 0;
          transform: rotate(-135deg);
          transition: transform .12s ease-out;
          width: 100%;
        }
        .marker::after { background: var(--kb35-accent); border: 4px solid var(--ha-card-background, var(--card-background-color)); border-radius: 50%; box-shadow: 0 2px 9px rgba(0, 0, 0, .26); content: ""; height: 19px; left: calc(50% - 9.5px); position: absolute; top: -1px; width: 19px; }
        .dial-center {
          align-items: center;
          background: color-mix(in srgb, var(--ha-card-background, #222) 87%, var(--kb35-accent));
          border: 1px solid color-mix(in srgb, var(--kb35-accent) 22%, transparent);
          border-radius: 50%;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 8px 25px rgba(0, 0, 0, .1);
          display: flex;
          flex-direction: column;
          inset: 34px;
          justify-content: center;
          position: absolute;
        }
        .dial-label { color: var(--secondary-text-color); font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .dial-value { font-size: clamp(2.55rem, 11vw, 4.25rem); font-variant-numeric: tabular-nums; font-weight: 750; letter-spacing: -.07em; line-height: 1; margin: 6px 0 0; }
        .dial-unit { font-size: .46em; letter-spacing: -.02em; margin-left: 3px; vertical-align: .14em; }
        .dial-subtitle { color: var(--secondary-text-color); font-size: .82rem; margin-top: 7px; min-height: 1.1em; }
        .step-controls { display: flex; gap: 22px; margin-top: 13px; }
        .step {
          align-items: center;
          background: color-mix(in srgb, var(--secondary-background-color, #777) 76%, transparent);
          border: 0;
          border-radius: 50%;
          display: flex;
          height: 35px;
          justify-content: center;
          width: 35px;
        }
        .step:active { background: var(--kb35-accent); color: #fff; }
        .step ha-icon { --mdc-icon-size: 19px; }
        .quick-open {
          align-items: center;
          background: color-mix(in srgb, var(--secondary-background-color, #777) 58%, transparent);
          border: 1px solid color-mix(in srgb, var(--divider-color) 65%, transparent);
          border-radius: 16px;
          display: flex;
          font-size: .89rem;
          font-weight: 750;
          gap: 10px;
          justify-content: space-between;
          margin-top: 2px;
          min-height: 54px;
          padding: 0 15px;
          text-align: left;
          width: 100%;
        }
        .quick-open ha-icon { --mdc-icon-size: 23px; }
        .quick-open .quick-open-start { align-items: center; display: flex; gap: 10px; }
        .quick-open .chevron { color: var(--secondary-text-color); }
        .sheet-backdrop {
          background: color-mix(in srgb, #000 34%, transparent);
          inset: 0;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          transition: opacity .22s ease;
          z-index: 3;
        }
        .sheet-backdrop.open { opacity: 1; pointer-events: auto; }
        .quick-sheet {
          background: var(--ha-card-background, var(--card-background-color));
          border: 1px solid color-mix(in srgb, var(--kb35-accent) 25%, var(--divider-color));
          border-radius: 25px 25px 0 0;
          bottom: 0;
          box-shadow: 0 -10px 35px rgba(0, 0, 0, .28);
          max-height: 93%;
          overflow: auto;
          padding: 13px 18px 20px;
          position: absolute;
          transform: translateY(105%);
          transition: transform .27s cubic-bezier(.2, .8, .2, 1);
          width: 100%;
        }
        .sheet-backdrop.open .quick-sheet { transform: translateY(0); }
        .sheet-head { align-items: center; display: flex; justify-content: space-between; margin-bottom: 13px; }
        .sheet-handle { background: var(--divider-color); border-radius: 999px; height: 4px; left: 50%; position: absolute; top: 7px; transform: translateX(-50%); width: 42px; }
        .sheet-title { font-size: 1.02rem; font-weight: 800; margin: 8px 0 0; }
        .sheet-close { align-items: center; background: color-mix(in srgb, var(--secondary-background-color, #777) 65%, transparent); border: 0; border-radius: 50%; display: flex; height: 35px; justify-content: center; width: 35px; }
        .sheet-close ha-icon { --mdc-icon-size: 20px; }
        .sheet-section-title { color: var(--secondary-text-color); display: block; font-size: .73rem; font-weight: 800; letter-spacing: .07em; margin: 15px 0 8px; text-transform: uppercase; }
        .auto-button {
          background: transparent;
          border: 1px solid color-mix(in srgb, var(--kb35-accent) 55%, var(--divider-color));
          border-radius: 999px;
          color: var(--kb35-accent);
          font-size: .76rem;
          font-weight: 800;
          letter-spacing: .04em;
          margin: 0;
          min-height: 40px;
          padding: 0 12px;
          width: 100%;
        }
        .auto-button.active { background: var(--kb35-accent); color: #fff; }
        .quick-actions { display: grid; gap: 8px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .quick {
          align-items: center;
          background: color-mix(in srgb, var(--secondary-background-color, #777) 58%, transparent);
          border: 1px solid transparent;
          border-radius: 15px;
          display: flex;
          flex-direction: column;
          font-size: .69rem;
          gap: 5px;
          justify-content: center;
          min-height: 67px;
          padding: 7px 2px;
          text-align: center;
          transition: background .18s, border-color .18s, color .18s;
        }
        .quick[disabled] { cursor: not-allowed; opacity: .42; }
        .quick.on { background: var(--kb35-accent-soft); border-color: color-mix(in srgb, var(--kb35-accent) 42%, transparent); color: var(--kb35-accent); }
        .quick ha-icon { --mdc-icon-size: 22px; }
        .notice { color: var(--error-color, #db4437); font-size: .8rem; line-height: 1.35; margin: 12px 2px 0; min-height: 0; }
        .notice:empty { display: none; }
        .settings { display: grid; gap: 11px; }
        .setting { align-items: center; display: grid; gap: 10px; grid-template-columns: 31px minmax(0, 1fr); }
        .setting ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 21px; }
        .setting-copy { min-width: 0; }
        .setting-label { display: block; font-size: .75rem; font-weight: 700; margin-bottom: 3px; }
        select {
          appearance: none;
          background: color-mix(in srgb, var(--secondary-background-color, #777) 60%, transparent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23888' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'%3E%3Cpath d='m3 6 5 5 5-5'/%3E%3C/svg%3E") no-repeat right 10px center;
          border: 0;
          border-radius: 10px;
          color: var(--primary-text-color);
          font-size: .86rem;
          min-height: 35px;
          padding: 0 31px 0 10px;
          width: 100%;
        }
        .footer { color: var(--secondary-text-color); font-size: .69rem; margin-top: 15px; text-align: center; }
        @media (max-width: 360px) {
          .shell { padding: 16px; }
          .quick-actions { gap: 5px; }
          .quick { font-size: .63rem; min-height: 61px; }
          .metrics { gap: 6px; }
          .metric { padding: 9px 8px; }
        }
      </style>
      <ha-card>
        <main class="shell">
          <header class="topline">
            <div>
              <div class="eyebrow">Kältebringer KB35</div>
              <h2 id="title"></h2>
              <div class="status"><span id="status-dot" class="status-dot"></span><span id="status-text">Lade Status …</span></div>
            </div>
            <button id="power" class="power" type="button" title="Ein / Aus"><ha-icon icon="mdi:power"></ha-icon></button>
          </header>

          <div class="metrics">
            <div class="metric"><span class="metric-label">Innen</span><span id="current-temp" class="metric-value">–</span></div>
            <div class="metric"><span class="metric-label">Außen</span><span id="outdoor-temp" class="metric-value">–</span></div>
            <div class="metric"><span class="metric-label">Betrieb</span><span id="mode-value" class="metric-value">–</span></div>
          </div>

          <div class="tabs" role="tablist" aria-label="Bedienfokus">
            <button class="tab active" data-dial="temperature" role="tab" type="button"><ha-icon icon="mdi:thermometer"></ha-icon>Temperatur</button>
            <button class="tab" data-dial="fan" role="tab" type="button"><ha-icon icon="mdi:fan"></ha-icon>Lüfter</button>
          </div>

          <div class="dial-area">
            <div id="dial" class="dial" role="slider" tabindex="0" aria-label="Wert einstellen">
              <div class="ring"></div>
              <div id="marker" class="marker"></div>
              <div class="dial-center">
                <span id="dial-label" class="dial-label"></span>
                <span id="dial-value" class="dial-value"></span>
                <span id="dial-subtitle" class="dial-subtitle"></span>
                <div class="step-controls">
                  <button class="step" data-step="-1" type="button" aria-label="Wert verringern"><ha-icon icon="mdi:minus"></ha-icon></button>
                  <button class="step" data-step="1" type="button" aria-label="Wert erhöhen"><ha-icon icon="mdi:plus"></ha-icon></button>
                </div>
              </div>
            </div>
          </div>

          <button id="quick-open" class="quick-open" type="button" aria-expanded="false">
            <span class="quick-open-start"><ha-icon icon="mdi:tune-variant"></ha-icon>Schnellauswahl</span>
            <ha-icon class="chevron" icon="mdi:chevron-up"></ha-icon>
          </button>
          <p id="notice" class="notice" role="status"></p>
          <div class="footer">KB35 Dashboard · v${KB35_CARD_VERSION}</div>
        </main>
        <div id="sheet-backdrop" class="sheet-backdrop" aria-hidden="true">
          <section class="quick-sheet" role="dialog" aria-modal="true" aria-label="Schnellauswahl">
            <span class="sheet-handle"></span>
            <header class="sheet-head">
              <h3 class="sheet-title">Schnellauswahl</h3>
              <button id="sheet-close" class="sheet-close" type="button" aria-label="Schnellauswahl schließen"><ha-icon icon="mdi:close"></ha-icon></button>
            </header>
            <span class="sheet-section-title">Lüfter</span>
            <button id="auto" class="auto-button" type="button">AUTO</button>
            <span class="sheet-section-title">Funktionen</span>
            <div id="quick-actions" class="quick-actions"></div>
            <span class="sheet-section-title">Betrieb</span>
            <div class="settings">
              <div class="setting">
                <ha-icon icon="mdi:air-conditioner"></ha-icon>
                <div class="setting-copy"><span class="setting-label">Betriebsart</span><select id="hvac-select" aria-label="Betriebsart"></select></div>
              </div>
              <div class="setting">
                <ha-icon icon="mdi:swap-vertical"></ha-icon>
                <div class="setting-copy"><span class="setting-label">Lamellen</span><select id="swing-select" aria-label="Lamellen"></select></div>
              </div>
              <div id="power-limit-row" class="setting">
                <ha-icon icon="mdi:gauge"></ha-icon>
                <div class="setting-copy"><span class="setting-label">Leistungsbegrenzung</span><select id="power-limit-select" aria-label="Leistungsbegrenzung"></select></div>
              </div>
              <button id="beeper" class="quick" type="button" hidden><ha-icon icon="mdi:volume-high"></ha-icon><span>Piepton</span></button>
            </div>
          </section>
        </div>
      </ha-card>
    `;

    this._elements = {
      title: this.shadowRoot.querySelector("#title"),
      statusDot: this.shadowRoot.querySelector("#status-dot"),
      statusText: this.shadowRoot.querySelector("#status-text"),
      power: this.shadowRoot.querySelector("#power"),
      currentTemp: this.shadowRoot.querySelector("#current-temp"),
      outdoorTemp: this.shadowRoot.querySelector("#outdoor-temp"),
      modeValue: this.shadowRoot.querySelector("#mode-value"),
      tabs: [...this.shadowRoot.querySelectorAll(".tab")],
      dial: this.shadowRoot.querySelector("#dial"),
      marker: this.shadowRoot.querySelector("#marker"),
      dialLabel: this.shadowRoot.querySelector("#dial-label"),
      dialValue: this.shadowRoot.querySelector("#dial-value"),
      dialSubtitle: this.shadowRoot.querySelector("#dial-subtitle"),
      auto: this.shadowRoot.querySelector("#auto"),
      quickOpen: this.shadowRoot.querySelector("#quick-open"),
      quickActions: this.shadowRoot.querySelector("#quick-actions"),
      notice: this.shadowRoot.querySelector("#notice"),
      sheetBackdrop: this.shadowRoot.querySelector("#sheet-backdrop"),
      sheetClose: this.shadowRoot.querySelector("#sheet-close"),
      hvacSelect: this.shadowRoot.querySelector("#hvac-select"),
      swingSelect: this.shadowRoot.querySelector("#swing-select"),
      powerLimitRow: this.shadowRoot.querySelector("#power-limit-row"),
      powerLimitSelect: this.shadowRoot.querySelector("#power-limit-select"),
      beeper: this.shadowRoot.querySelector("#beeper"),
    };

    this._createQuickActions();
    this._bindEvents();
  }

  _bindEvents() {
    this._elements.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        this._activeDial = tab.dataset.dial;
        this._draftValue = null;
        this._notice = "";
        this._render();
      });
    });

    this._elements.power.addEventListener("click", () => this._togglePower());
    this._elements.auto.addEventListener("click", () => this._setFanAuto());
    this._elements.quickOpen.addEventListener("click", () => this._setSheetOpen(true));
    this._elements.sheetClose.addEventListener("click", () => this._setSheetOpen(false));
    this._elements.sheetBackdrop.addEventListener("click", (event) => {
      if (event.target === this._elements.sheetBackdrop) this._setSheetOpen(false);
    });
    this.shadowRoot.querySelectorAll("[data-step]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        this._changeDial(Number(button.dataset.step));
      });
    });

    this._elements.dial.addEventListener("pointerdown", (event) => this._startDial(event));
    this._elements.dial.addEventListener("pointermove", (event) => this._moveDial(event));
    this._elements.dial.addEventListener("pointerup", (event) => this._finishDial(event));
    this._elements.dial.addEventListener("pointercancel", () => this._cancelDial());
    this._elements.dial.addEventListener("keydown", (event) => this._onDialKey(event));

    this._elements.hvacSelect.addEventListener("change", (event) => {
      this._call("climate", "set_hvac_mode", {
        entity_id: this._config.climate_entity,
        hvac_mode: event.target.value,
      });
    });
    this._elements.swingSelect.addEventListener("change", (event) => {
      this._call("climate", "set_swing_mode", {
        entity_id: this._config.climate_entity,
        swing_mode: event.target.value,
      });
    });
    this._elements.powerLimitSelect.addEventListener("change", (event) => {
      const entity = this._config.selects.power_limit;
      if (entity) {
        this._call("select", "select_option", { entity_id: entity, option: event.target.value });
      }
    });
    this._elements.beeper.addEventListener("click", () => this._toggleSwitch("beeper"));
  }

  _createQuickActions() {
    this._elements.quickActions.replaceChildren();
    QUICK_ACTIONS.forEach((meta) => {
      const button = document.createElement("button");
      button.className = "quick";
      button.type = "button";
      button.dataset.quickKey = meta.key;
      button.innerHTML = `<ha-icon icon="${meta.icon}"></ha-icon><span>${meta.label}</span>`;
      button.addEventListener("click", () => this._handleQuickAction(meta));
      this._elements.quickActions.append(button);
    });
  }

  _render() {
    if (!this._config || !this._elements) return;

    const climate = this._entity(this._config.climate_entity);
    const fan = this._entity(this._config.fan_entity);
    const climateState = climate?.state || "unavailable";
    const mode = MODE_META[climateState] || { label: climateState, icon: "mdi:air-conditioner" };
    const isOn = this._isClimateOn(climateState);
    const online = this._isOnline(climate);

    this._elements.title.textContent = this._config.title;
    this._elements.statusDot.classList.toggle("online", online);
    this._elements.statusText.textContent = online ? `${mode.label} · verbunden` : "Keine Verbindung";
    this._elements.power.classList.toggle("on", isOn);
    this._elements.power.title = isOn ? "Klimaanlage ausschalten" : "Klimaanlage einschalten";
    this._elements.currentTemp.textContent = this._temperatureText(climate?.attributes?.current_temperature);
    this._elements.outdoorTemp.textContent = this._temperatureText(this._entity(this._config.sensors.outdoor_temperature)?.state);
    this._elements.modeValue.textContent = mode.label;

    this._elements.tabs.forEach((tab) => {
      const active = tab.dataset.dial === this._activeDial;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    this._renderDial(climate, fan);
    this._renderQuickActions(climateState);
    this._renderSelects(climate);
    this._elements.sheetBackdrop.classList.toggle("open", this._sheetOpen);
    this._elements.sheetBackdrop.setAttribute("aria-hidden", String(!this._sheetOpen));
    this._elements.quickOpen.setAttribute("aria-expanded", String(this._sheetOpen));
    this._elements.notice.textContent = this._notice;
  }

  _renderDial(climate, fan) {
    const temperatureMode = this._activeDial === "temperature";
    const min = temperatureMode ? this._config.temperature_min : 0;
    const max = temperatureMode ? this._config.temperature_max : 100;
    const climateTemperature = this._number(climate?.attributes?.temperature, this._config.temperature_min);
    const fanAuto = this._isFanAuto(fan);
    const fanPercentage = this._number(fan?.attributes?.percentage, 0);
    const actual = temperatureMode ? climateTemperature : (fanAuto ? fanPercentage : fanPercentage);
    const value = this._draftValue === null ? actual : this._draftValue;
    const progress = this._clamp((value - min) / (max - min), 0, 1);

    this._elements.dial.style.setProperty("--progress", progress);
    this._elements.marker.style.transform = `rotate(${progress * 270 - 135}deg)`;
    this._elements.dial.setAttribute("aria-valuemin", String(min));
    this._elements.dial.setAttribute("aria-valuemax", String(max));
    this._elements.dial.setAttribute("aria-valuenow", String(value));
    this._elements.dial.setAttribute("aria-valuetext", temperatureMode ? `${value} Grad Celsius` : `${value} Prozent Lüfter`);
    this._elements.dialLabel.textContent = temperatureMode ? "Solltemperatur" : "Lüftergeschwindigkeit";
    this._elements.dialValue.innerHTML = temperatureMode
      ? `${value}<span class="dial-unit">°C</span>`
      : (fanAuto && this._draftValue === null
        ? `Auto<span class="dial-unit">%</span>`
        : `${value}<span class="dial-unit">%</span>`);
    this._elements.dialSubtitle.textContent = temperatureMode
      ? `Ist: ${this._temperatureText(climate?.attributes?.current_temperature)}`
      : (fanAuto ? "Automatische Lüfterregelung" : "Manuelle Lüfterregelung");
    this._elements.auto.classList.toggle("active", fanAuto);
    this._elements.auto.textContent = fanAuto ? "AUTO AKTIV" : "AUTO";
  }

  _renderQuickActions(climateState) {
    this.shadowRoot.querySelectorAll("[data-quick-key]").forEach((button) => {
      const meta = QUICK_ACTIONS.find((item) => item.key === button.dataset.quickKey);
      if (!meta) return;
      const switchEntity = this._entity(this._config.switches[meta.key]);
      const switchState = switchEntity?.state;
      const climate = this._entity(this._config.climate_entity);
      const fan = this._entity(this._config.fan_entity);
      const swing = climate?.attributes?.swing_mode || "off";
      const hasSwing = (climate?.attributes?.swing_modes || []).length > 0;
      let enabled = true;
      let active = false;
      let title = "";

      if (meta.action === "awaiting_capture") {
        enabled = false;
        title = "Für diese KB35-Funktion fehlt noch ein verifizierter Sendeframe.";
      } else if (meta.action === "switch") {
        enabled = Boolean(switchEntity) && !["unavailable", "unknown"].includes(switchState);
        active = switchState === "on";
        if (meta.key === "frost" && switchState !== "on" && climateState !== "heat") {
          enabled = false;
          title = "Frostschutz kann nur im Heizmodus aktiviert werden.";
        }
      } else if (meta.action === "fan") {
        enabled = Boolean(fan) && !["unavailable", "unknown"].includes(fan.state);
        active = this._activeDial === "fan";
      } else if (meta.action === "horizontal_swing") {
        enabled = Boolean(climate) && hasSwing;
        active = swing === "horizontal" || swing === "both";
      } else if (meta.action === "vertical_swing") {
        enabled = Boolean(climate) && hasSwing;
        active = swing === "vertical" || swing === "both";
      } else if (meta.action === "power_limit") {
        enabled = Boolean(this._config.selects.power_limit) && !["unavailable", "unknown"].includes(this._entity(this._config.selects.power_limit)?.state);
      }

      button.disabled = !enabled;
      button.classList.toggle("on", active);
      button.title = title;
    });

    const beeperEntity = this._config.switches.beeper;
    const beeperState = this._entity(beeperEntity)?.state;
    this._elements.beeper.hidden = !beeperEntity;
    this._elements.beeper.disabled = !beeperEntity || ["unavailable", "unknown"].includes(beeperState);
    this._elements.beeper.classList.toggle("on", beeperState === "on");
  }

  _renderSelects(climate) {
    const supportedHvacModes = climate?.attributes?.hvac_modes || HVAC_OPTIONS.map(([value]) => value);
    this._setOptions(this._elements.hvacSelect, HVAC_OPTIONS.filter(([value]) => supportedHvacModes.includes(value)), climate?.state);

    const supportedSwingModes = climate?.attributes?.swing_modes || SWING_OPTIONS.map(([value]) => value);
    this._setOptions(this._elements.swingSelect, SWING_OPTIONS.filter(([value]) => supportedSwingModes.includes(value)), climate?.attributes?.swing_mode || "off");
    this._elements.swingSelect.disabled = !climate || !supportedSwingModes.length;

    const powerLimit = this._entity(this._config.selects.power_limit);
    this._elements.powerLimitRow.hidden = !this._config.selects.power_limit;
    if (powerLimit) {
      const options = (powerLimit.attributes?.options || []).map((option) => [option, option]);
      this._setOptions(this._elements.powerLimitSelect, options, powerLimit.state);
      this._elements.powerLimitSelect.disabled = ["unavailable", "unknown"].includes(powerLimit.state);
    }
  }

  _setOptions(select, options, selected) {
    const valueBefore = select.value;
    const key = options.map(([value, label]) => `${value}:${label}`).join("|");
    if (select.dataset.options !== key) {
      select.replaceChildren();
      options.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
      });
      select.dataset.options = key;
    }
    select.value = options.some(([value]) => value === selected) ? selected : valueBefore;
  }

  _startDial(event) {
    if (event.target.closest("button")) return;
    this._dragging = true;
    this._elements.dial.setPointerCapture?.(event.pointerId);
    this._setDialFromPointer(event);
  }

  _moveDial(event) {
    if (!this._dragging) return;
    this._setDialFromPointer(event);
  }

  _finishDial(event) {
    if (!this._dragging) return;
    this._dragging = false;
    this._elements.dial.releasePointerCapture?.(event.pointerId);
    const value = this._draftValue;
    this._draftValue = null;
    if (value !== null) this._sendDialValue(value);
    this._render();
  }

  _cancelDial() {
    this._dragging = false;
    this._draftValue = null;
    this._render();
  }

  _setDialFromPointer(event) {
    const bounds = this._elements.dial.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 135) angle += 360;
    angle = this._clamp(angle, 135, 405);
    const min = this._activeDial === "temperature" ? this._config.temperature_min : 0;
    const max = this._activeDial === "temperature" ? this._config.temperature_max : 100;
    this._draftValue = Math.round(min + ((angle - 135) / 270) * (max - min));
    this._notice = "";
    this._render();
  }

  _onDialKey(event) {
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      this._changeDial(1);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      this._changeDial(-1);
    }
  }

  _changeDial(delta) {
    const climate = this._entity(this._config.climate_entity);
    const fan = this._entity(this._config.fan_entity);
    const base = this._activeDial === "temperature"
      ? this._number(climate?.attributes?.temperature, this._config.temperature_min)
      : this._number(fan?.attributes?.percentage, 0);
    const min = this._activeDial === "temperature" ? this._config.temperature_min : 0;
    const max = this._activeDial === "temperature" ? this._config.temperature_max : 100;
    const next = this._clamp((this._draftValue === null ? base : this._draftValue) + delta, min, max);
    this._draftValue = null;
    this._sendDialValue(next);
  }

  _sendDialValue(value) {
    this._notice = "";
    if (this._activeDial === "temperature") {
      this._call("climate", "set_temperature", {
        entity_id: this._config.climate_entity,
        temperature: value,
      });
      return;
    }
    this._call("fan", "set_percentage", {
      entity_id: this._config.fan_entity,
      percentage: value,
    });
  }

  _setFanAuto() {
    this._notice = "";
    this._call("fan", "set_preset_mode", {
      entity_id: this._config.fan_entity,
      preset_mode: this._config.fan_auto_preset,
    });
  }

  _togglePower() {
    const state = this._entity(this._config.climate_entity)?.state;
    const action = this._isClimateOn(state) ? "turn_off" : "turn_on";
    this._notice = "";
    this._call("climate", action, { entity_id: this._config.climate_entity });
  }

  _toggleSwitch(key) {
    const entity = this._config.switches[key];
    if (!entity) return;
    const current = this._entity(entity)?.state;
    const climateState = this._entity(this._config.climate_entity)?.state;
    if (key === "frost" && current !== "on" && climateState !== "heat") {
      this._notice = "Frostschutz kann nur im Heizmodus aktiviert werden.";
      this._render();
      return;
    }
    this._notice = "";
    this._call("switch", "toggle", { entity_id: entity });
  }

  _handleQuickAction(meta) {
    if (meta.action === "fan") {
      this._activeDial = "fan";
      this._draftValue = null;
      this._setSheetOpen(false);
      return;
    }
    if (meta.action === "switch") {
      this._toggleSwitch(meta.key);
      return;
    }
    if (meta.action === "horizontal_swing") {
      this._toggleSwingAxis("horizontal");
      return;
    }
    if (meta.action === "vertical_swing") {
      this._toggleSwingAxis("vertical");
      return;
    }
    if (meta.action === "power_limit") {
      this._elements.powerLimitSelect.focus();
      this._notice = "Gang unten im Auswahlfeld wählen.";
      this._render();
    }
  }

  _toggleSwingAxis(axis) {
    const climate = this._entity(this._config.climate_entity);
    const current = climate?.attributes?.swing_mode || "off";
    let next = "off";
    if (axis === "horizontal") {
      next = ({ off: "horizontal", horizontal: "off", vertical: "both", both: "vertical" })[current] || "horizontal";
    } else {
      next = ({ off: "vertical", vertical: "off", horizontal: "both", both: "horizontal" })[current] || "vertical";
    }
    this._notice = "";
    this._call("climate", "set_swing_mode", {
      entity_id: this._config.climate_entity,
      swing_mode: next,
    });
  }

  _setSheetOpen(open) {
    this._sheetOpen = open;
    this._render();
  }

  _call(domain, service, data) {
    if (!this._hass) {
      this._notice = "Home Assistant ist noch nicht verbunden.";
      this._render();
      return;
    }
    Promise.resolve(this._hass.callService(domain, service, data)).catch(() => {
      this._notice = "Befehl konnte nicht gesendet werden. Bitte Verbindung und Entitäts-ID prüfen.";
      this._render();
    });
  }

  _entity(entityId) {
    return entityId && this._hass?.states ? this._hass.states[entityId] : null;
  }

  _isOnline(climate) {
    const explicit = this._entity(this._config.sensors.communication)?.state;
    if (explicit) return explicit === "on" || explicit === "connected" || explicit === "online";
    return Boolean(climate && !["unavailable", "unknown"].includes(climate.state));
  }

  _isClimateOn(state) {
    return !["off", "unavailable", "unknown", undefined, null].includes(state);
  }

  _isFanAuto(fan) {
    return fan?.attributes?.preset_mode === this._config.fan_auto_preset;
  }

  _temperatureText(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toLocaleString("de-DE", { maximumFractionDigits: 1 })} °C` : "–";
  }

  _number(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  _clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
}

if (!customElements.get("kb35-climate-dashboard-card")) {
  customElements.define("kb35-climate-dashboard-card", KB35ClimateDashboardCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "kb35-climate-dashboard-card",
  name: "KB35 Climate Dashboard",
  description: "Dashboard-Karte für Kältebringer KB35 / Midea-ESPHome",
  preview: true,
});
