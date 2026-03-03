import { html, nothing } from "lit";
import { t, i18n, type Locale } from "../../i18n/index.ts";
import { formatRelativeTimestamp, formatDurationHuman } from "../format.ts";
import type { GatewayHelloOk } from "../gateway.ts";
import { formatNextRun } from "../presenter.ts";
import type { UiSettings } from "../storage.ts";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

export function renderOverview(props: OverviewProps) {
  const snapshot = props.hello?.snapshot as
    | {
        uptimeMs?: number;
        policy?: { tickIntervalMs?: number };
        authMode?: "none" | "token" | "password" | "trusted-proxy";
      }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationHuman(snapshot.uptimeMs) : t("common.na");
  const tick = snapshot?.policy?.tickIntervalMs
    ? `${snapshot.policy.tickIntervalMs}ms`
    : t("common.na");
  const authMode = snapshot?.authMode;
  const isTrustedProxy = authMode === "trusted-proxy";

  const authHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) {
      return null;
    }
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px">
          ${t("overview.auth.required")}
          <div style="margin-top: 6px">
            <span class="mono">openclaw dashboard --no-open</span> → tokenized URL<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> → set token
          </div>
          <div style="margin-top: 6px">
            <a
              class="session-link"
              href="https://docs.openclaw.ai/web/dashboard"
              target="_blank"
              rel="noreferrer"
              title="Control UI auth docs (opens in new tab)"
              >Docs: Control UI auth</a
            >
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.auth.failed", { command: "openclaw dashboard --no-open" })}
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/dashboard"
            target="_blank"
            rel="noreferrer"
            title="Control UI auth docs (opens in new tab)"
            >Docs: Control UI auth</a
          >
        </div>
      </div>
    `;
  })();

  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) {
      return null;
    }
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext) {
      return null;
    }
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px">
        ${t("overview.insecure.hint", { url: "http://127.0.0.1:18789" })}
        <div style="margin-top: 6px">
          ${t("overview.insecure.stayHttp", { config: "gateway.controlUi.allowInsecureAuth: true" })}
        </div>
        <div style="margin-top: 6px">
          <a
            class="session-link"
            href="https://docs.openclaw.ai/gateway/tailscale"
            target="_blank"
            rel="noreferrer"
            title="Tailscale Serve docs (opens in new tab)"
            >Docs: Tailscale Serve</a
          >
          <span class="muted"> · </span>
          <a
            class="session-link"
            href="https://docs.openclaw.ai/web/control-ui#insecure-http"
            target="_blank"
            rel="noreferrer"
            title="Insecure HTTP docs (opens in new tab)"
            >Docs: Insecure HTTP</a
          >
        </div>
      </div>
    `;
  })();

  const currentLocale = i18n.getLocale();

  return html`
    <div class="dashboard-header" style="margin-bottom: 48px; animation: rise 0.6s var(--ease-spring) backwards;">
      <h1 class="glow-text--accent" style="font-size: 4rem; margin: 0; line-height: 1;">Overview</h1>
      <p class="muted" style="font-size: 1.2rem; margin-top: 12px; opacity: 0.7; letter-spacing: -0.01em;">Gateway status, entry points, and a fast health read.</p>
    </div>
    <div class="dashboard-grid">
      <div class="card card--main stagger-1">
        <div class="card-header-accent">
          <div class="card-title glow-text" style="font-size: 1.2rem;">${t("overview.access.title")}</div>
        </div>
        <div class="form-grid" style="margin-top: 24px;">
          <label class="field">
            <span>${t("overview.access.wsUrl")}</span>
            <input
              .value=${props.settings.gatewayUrl}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSettingsChange({ ...props.settings, gatewayUrl: v });
              }}
              placeholder="ws://100.x.y.z:18789"
            />
          </label>
          ${
            isTrustedProxy
              ? ""
              : html`
                <label class="field">
                  <span>${t("overview.access.token")}</span>
                  <input
                    .value=${props.settings.token}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onSettingsChange({ ...props.settings, token: v });
                    }}
                    placeholder="OPENCLAW_GATEWAY_TOKEN"
                  />
                </label>
                <label class="field">
                  <span>${t("overview.access.password")}</span>
                  <input
                    type="password"
                    .value=${props.password}
                    @input=${(e: Event) => {
                      const v = (e.target as HTMLInputElement).value;
                      props.onPasswordChange(v);
                    }}
                    placeholder="system or shared password"
                  />
                </label>
              `
          }
          <label class="field">
            <span>${t("overview.access.sessionKey")}</span>
            <input
              .value=${props.settings.sessionKey}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                props.onSessionKeyChange(v);
              }}
            />
          </label>
          <label class="field">
            <span>${t("overview.access.language")}</span>
            <select
              .value=${currentLocale}
              @change=${(e: Event) => {
                const v = (e.target as HTMLSelectElement).value as Locale;
                void i18n.setLocale(v);
                props.onSettingsChange({ ...props.settings, locale: v });
              }}
            >
              <option value="en">${t("languages.en")}</option>
              <option value="zh-CN">${t("languages.zhCN")}</option>
              <option value="zh-TW">${t("languages.zhTW")}</option>
              <option value="pt-BR">${t("languages.ptBR")}</option>
            </select>
          </label>
        </div>
        <div class="row" style="margin-top: 24px; gap: 12px; display: flex; align-items: center;">
          <button class="btn primary" @click=${() => props.onConnect()}>${t("common.connect")}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${t("common.refresh")}</button>
          <span class="muted" style="font-size: 12px;">${
            isTrustedProxy ? t("overview.access.trustedProxy") : t("overview.access.connectHint")
          }</span>
        </div>
      </div>

      <div class="card card--status stagger-2">
        <div class="card-header-accent">
          <div class="card-title glow-text" style="font-size: 1.2rem;">${t("overview.snapshot.title")}</div>
        </div>
        <div class="stat-grid" style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.status")}</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}" style="display: flex; align-items: center; gap: 8px;">
               <span class="statusDot ${props.connected ? "ok" : ""}" style="width: 10px; height: 10px;"></span>
              ${props.connected ? t("common.ok") : t("common.offline")}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.uptime")}</div>
            <div class="stat-value">${uptime}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.tickInterval")}</div>
            <div class="stat-value">${tick}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${t("overview.snapshot.lastChannelsRefresh")}</div>
            <div class="stat-value" style="font-size: 16px;">
              ${props.lastChannelsRefresh ? formatRelativeTimestamp(props.lastChannelsRefresh) : t("common.na")}
            </div>
          </div>
        </div>

        <div class="quick-actions" style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 16px;">
           <div class="stat-label" style="margin-bottom: 12px;">Quick Actions</div>
           <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn--sm" @click=${() => props.onRefresh()}>
                 Re-sync Gateway
              </button>
              <button class="btn btn--sm" @click=${() => window.dispatchEvent(new CustomEvent("openclaw-nav", { detail: { tab: "logs" } }))}>
                 View Logs
              </button>
              <button class="btn btn--sm" @click=${() => window.dispatchEvent(new CustomEvent("openclaw-nav", { detail: { tab: "debug" } }))}>
                 System Debug
              </button>
           </div>
        </div>

        ${
          props.lastError
            ? html`<div class="callout danger" style="margin-top: 14px;">
              <div style="font-weight: 500;">Connection Error</div>
              <div style="margin-top: 4px; opacity: 0.9;">${props.lastError}</div>
              ${authHint ?? ""}
              ${insecureContextHint ?? ""}
            </div>`
            : nothing
        }
      </div>
    </div>

    <div class="dashboard-stats" style="margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;">
      <div class="card stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
           <div class="stat-label">${t("overview.stats.instances")}</div>
           <div class="stat-value" style="font-size: 32px; margin: 8px 0;">${props.presenceCount}</div>
        </div>
        <div class="muted" style="font-size: 12px; border-top: 1px solid var(--border); padding-top: 8px;">${t("overview.stats.instancesHint")}</div>
      </div>
      <div class="card stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
           <div class="stat-label">${t("overview.stats.sessions")}</div>
           <div class="stat-value" style="font-size: 32px; margin: 8px 0;">${props.sessionsCount ?? t("common.na")}</div>
        </div>
        <div class="muted" style="font-size: 12px; border-top: 1px solid var(--border); padding-top: 8px;">${t("overview.stats.sessionsHint")}</div>
      </div>
      <div class="card stat-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
           <div class="stat-label">${t("overview.stats.cron")}</div>
           <div class="stat-value" style="font-size: 32px; margin: 8px 0;">
             ${props.cronEnabled == null ? t("common.na") : props.cronEnabled ? t("common.enabled") : t("common.disabled")}
           </div>
        </div>
        <div class="muted" style="font-size: 12px; border-top: 1px solid var(--border); padding-top: 8px;">${t("overview.stats.cronNext", { time: formatNextRun(props.cronNext) })}</div>
      </div>
    </div>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${t("overview.notes.title")}</div>
      <div class="card-sub">${t("overview.notes.subtitle")}</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div>
          <div class="note-title">${t("overview.notes.tailscaleTitle")}</div>
          <div class="muted">
            ${t("overview.notes.tailscaleText")}
          </div>
        </div>
        <div>
          <div class="note-title">${t("overview.notes.sessionTitle")}</div>
          <div class="muted">${t("overview.notes.sessionText")}</div>
        </div>
        <div>
          <div class="note-title">${t("overview.notes.cronTitle")}</div>
          <div class="muted">${t("overview.notes.cronText")}</div>
        </div>
      </div>
    </section>
  `;
}
