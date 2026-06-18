"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
} from "lucide-react";
import {
  ActionButton,
  Modal,
} from "@/components/ui/ozion-design-system";

type WhatsAppConnectionRow = {
  id: string;
  workspace_id: string;
  phone_number: string;
  display_name: string | null;
  status: "connected" | "disconnected" | "error" | string;
  type: "cloud_api" | "qrcode" | string;
  messages_today?: number | null;
  created_at: string;
  updated_at?: string | null;
};

type EmbeddedSignupConfig = {
  ready: boolean;
  appId?: string;
  configurationId?: string;
  graphApiVersion?: string;
};

type EmbeddedSignupSession = {
  event?: string;
  phoneNumberId?: string;
  wabaId?: string;
  businessId?: string;
};

type FacebookLoginResponse = {
  status?: string;
  authResponse?: {
    code?: string;
  };
};

type FacebookSDK = {
  init: (options: { appId: string; autoLogAppEvents?: boolean; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSDK;
    fbAsyncInit?: () => void;
  }
}

type DeviceTab = "active" | "inactive";
type ConnectionChoice = "official" | "contingency";

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function readSignupSession(raw: unknown): EmbeddedSignupSession {
  if (!raw || typeof raw !== "object") return {};
  const envelope = raw as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object"
    ? envelope.data as Record<string, unknown>
    : envelope;

  return {
    event: safeString(envelope.event),
    phoneNumberId: safeString(data.phone_number_id) ?? safeString(data.phoneNumberId),
    wabaId: safeString(data.waba_id) ?? safeString(data.wabaId),
    businessId: safeString(data.business_id) ?? safeString(data.businessId),
  };
}

function connectionName(connection: WhatsAppConnectionRow) {
  return connection.display_name || connection.phone_number || "WhatsApp Oficial";
}

function WhatsAppMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_0_30px_rgba(37,211,102,0.28)] ${className}`}>
      <MessageCircle className="h-1/2 w-1/2 fill-white text-white" strokeWidth={2.6} />
    </div>
  );
}

export default function WhatsAppPage() {
  const [connections, setConnections] = useState<WhatsAppConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [detailsConnection, setDetailsConnection] = useState<WhatsAppConnectionRow | null>(null);
  const [deviceTab, setDeviceTab] = useState<DeviceTab>("active");
  const [connectionChoice, setConnectionChoice] = useState<ConnectionChoice>("official");
  const [randomizerLink] = useState(() => (
    typeof window === "undefined" ? "https://app.mdii.com.br/w/ozion" : `${window.location.origin}/w/ozion`
  ));
  const [signupStep, setSignupStep] = useState("Pronto para conectar");
  const [signupConfig, setSignupConfig] = useState<EmbeddedSignupConfig | null>(null);
  const signupSessionRef = useRef<EmbeddedSignupSession>({});

  const deviceLimit = 3;
  const activeConnections = connections.filter((connection) => connection.status === "connected");
  const inactiveConnections = connections.filter((connection) => connection.status !== "connected");
  const visibleConnections = deviceTab === "active" ? activeConnections : inactiveConnections;
  const reachedDeviceLimit = activeConnections.length >= deviceLimit;

  const loadConnections = useCallback(async function loadConnections() {
    setLoading(true);
    try {
      const response = await fetch("/api/whatsapp/connections", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao carregar dispositivos do WhatsApp");
      const rows = result.connections || [];
      setConnections(rows);
    } catch (loadError) {
      setConnections([]);
      setNotice({
        type: "error",
        message: loadError instanceof Error ? loadError.message : "Falha ao carregar dispositivos do WhatsApp",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSignupConfig = useCallback(async function fetchSignupConfig() {
    const response = await fetch("/api/whatsapp/embedded-signup/config", { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Conexão oficial indisponível.");
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Conexão oficial indisponível.");
    return result as EmbeddedSignupConfig;
  }, []);

  const loadSignupConfig = useCallback(async function loadSignupConfig() {
    try {
      const result = await fetchSignupConfig();
      setSignupConfig(result);
      if (!result.ready) setSignupStep("Aguardando ativação do app");
    } catch {
      setSignupConfig({ ready: false });
      setSignupStep("Aguardando ativação do app");
    }
  }, [fetchSignupConfig]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConnections();
      void loadSignupConfig();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConnections, loadSignupConfig]);

  useEffect(() => {
    function handleEmbeddedSignupMessage(event: MessageEvent) {
      if (!["https://www.facebook.com", "https://web.facebook.com"].includes(event.origin)) return;
      const payload = typeof event.data === "string" ? safeParseJson(event.data) : event.data;
      if (!payload || typeof payload !== "object") return;
      const record = payload as Record<string, unknown>;
      if (record.type !== "WA_EMBEDDED_SIGNUP") return;

      const session = readSignupSession(payload);
      signupSessionRef.current = {
        ...signupSessionRef.current,
        ...session,
      };

      if (session.event === "FINISH") {
        setSignupStep("Confirmando dispositivo na Ozion");
      } else if (session.event === "CANCEL") {
        setSignupStep("Conexão cancelada");
      }
    }

    window.addEventListener("message", handleEmbeddedSignupMessage);
    return () => window.removeEventListener("message", handleEmbeddedSignupMessage);
  }, []);

  async function ensureFacebookSdk(config: EmbeddedSignupConfig) {
    if (!config.appId || !config.graphApiVersion) throw new Error("Conexão oficial indisponível no momento.");
    const version = config.graphApiVersion.startsWith("v") ? config.graphApiVersion : `v${config.graphApiVersion}`;

    if (window.FB) {
      window.FB.init({ appId: config.appId, cookie: true, xfbml: false, version });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("A Meta demorou para responder. Tente novamente.")), 15000);

      window.fbAsyncInit = () => {
        window.clearTimeout(timeout);
        if (!window.FB) {
          reject(new Error("Não foi possível carregar o popup oficial da Meta."));
          return;
        }
        window.FB.init({ appId: config.appId!, cookie: true, xfbml: false, version });
        resolve();
      };

      if (document.getElementById("facebook-jssdk")) return;
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Não foi possível abrir a conexão oficial da Meta."));
      };
      document.body.appendChild(script);
    });
  }

  async function completeEmbeddedSignup(code: string) {
    setSignupStep("Salvando dispositivo seguro");
    const response = await fetch("/api/whatsapp/embedded-signup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        signup: signupSessionRef.current,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a conexão.");

    setNotice({ type: "success", message: "Dispositivo conectado com sucesso." });
    setSignupStep("Dispositivo conectado");
    setConnectModalOpen(false);
    await loadConnections();
  }

  async function copyRandomizerLink() {
    try {
      await navigator.clipboard.writeText(randomizerLink);
      setNotice({ type: "success", message: "Link randomizador copiado." });
    } catch {
      setNotice({ type: "error", message: "Não foi possível copiar o link." });
    }
  }

  async function disconnectDevice(connection: WhatsAppConnectionRow) {
    if (!window.confirm(`Desconectar ${connectionName(connection)}?`)) return;
    const response = await fetch(`/api/whatsapp/connections?id=${connection.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setNotice({ type: "error", message: result.error || "Não foi possível desconectar o dispositivo." });
      return;
    }
    setNotice({ type: "success", message: "Dispositivo desconectado." });
    await loadConnections();
  }

  function continueConnectionFlow() {
    if (connectionChoice === "official") {
      void startEmbeddedSignup();
      return;
    }
    setConnectModalOpen(false);
    setNotice({ type: "info", message: "WhatsApp Contingência será conectado pelo fluxo de sessão alternativa." });
  }

  async function startEmbeddedSignup() {
    setNotice(null);
    signupSessionRef.current = {};

    let config = signupConfig;
    if (!config) {
      setSignupStep("Preparando conexão oficial");
      config = await fetchSignupConfig().catch(() => ({ ready: false }));
      setSignupConfig(config);
    }

    if (!config.ready || !config.configurationId) {
      setNotice({ type: "error", message: "A conexão oficial ainda não está disponível. A Ozion precisa concluir a ativação do app Meta." });
      setSignupStep("Aguardando ativação do app");
      return;
    }

    setConnecting(true);
    setSignupStep("Abrindo popup oficial da Meta");

    try {
      await ensureFacebookSdk(config);
      if (!window.FB) throw new Error("Popup oficial indisponível.");

      window.FB.login(
        (response) => {
          void (async () => {
            try {
              const code = response.authResponse?.code;
              if (!code) throw new Error("A conexão foi cancelada antes da confirmação.");
              await new Promise((resolve) => window.setTimeout(resolve, 450));
              await completeEmbeddedSignup(code);
            } catch (error) {
              setSignupStep("Conexão não concluída");
              setNotice({
                type: "error",
                message: error instanceof Error ? error.message : "Não foi possível concluir a conexão.",
              });
            } finally {
              setConnecting(false);
            }
          })();
        },
        {
          config_id: config.configurationId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            sessionInfoVersion: 3,
          },
        },
      );
    } catch (error) {
      setConnecting(false);
      setSignupStep("Conexão não concluída");
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Não foi possível abrir a Meta.",
      });
    }
  }

  const connectDisabled = connecting;

  return (
    <div className="min-h-full bg-[#050807] p-4 text-white sm:p-6">
      <div className="pointer-events-none fixed inset-0 oz-grid-bg opacity-40" />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Meus dispositivos</h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">Minhas conexões com dispositivos WhatsApp.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadConnections()}
            className="oz-button-secondary inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </header>

        {reachedDeviceLimit ? (
          <div className="relative rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
            Você atingiu o número máximo de dispositivos no plano atual.{" "}
            <a href="/plans" className="font-black text-amber-200 underline decoration-amber-300/60 underline-offset-4">
              Clique aqui para atualizar seu plano.
            </a>
          </div>
        ) : null}

        {notice ? (
          <div
            className={`relative rounded-xl border px-4 py-3 text-sm font-medium ${
              notice.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : notice.type === "info"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="relative oz-card rounded-xl p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Meu link randomizador</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                  O link distribui o lead entre dispositivos ativos para equilibrar o atendimento.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
              <input
                readOnly
                value={randomizerLink}
                className="oz-input h-11 min-w-0 flex-1 rounded-lg px-3 text-sm font-semibold text-zinc-200"
                aria-label="Link randomizador da Ozion"
              />
              <button
                type="button"
                onClick={() => void copyRandomizerLink()}
                className="oz-button-primary pulse-button inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black"
              >
                <Copy className="h-4 w-4" />
                Copiar Link
              </button>
            </div>
          </div>
        </section>

        <section className="relative space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
              {[
                { id: "active" as const, label: "Sessões Ativas", count: activeConnections.length },
                { id: "inactive" as const, label: "Sessões Inativas", count: inactiveConnections.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDeviceTab(tab.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                    deviceTab === tab.id
                      ? "bg-emerald-500 text-zinc-950 shadow-[0_0_22px_rgba(16,185,129,0.22)]"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando dispositivos
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => setConnectModalOpen(true)}
              disabled={reachedDeviceLimit}
              className="group min-h-72 rounded-xl border border-dashed border-emerald-500/35 bg-emerald-500/5 p-6 text-left transition hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-500/10 hover:shadow-[0_0_35px_rgba(16,185,129,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-full flex-col items-center justify-center text-center">
                <WhatsAppMark className="h-20 w-20 transition group-hover:scale-105" />
                <h3 className="mt-6 text-lg font-black text-white">Conectar um novo dispositivo</h3>
                <p className="mt-2 max-w-56 text-sm leading-6 text-zinc-500">Clique para adicionar um novo WhatsApp</p>
                <span className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-black text-zinc-950">
                  <Plus className="h-4 w-4" />
                  Conectar
                </span>
              </div>
            </button>

            {visibleConnections.map((connection) => (
              <article key={connection.id} className="oz-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <WhatsAppMark className="h-12 w-12" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-[#0b1110]">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Meta / WhatsApp Oficial</p>
                      <h3 className="mt-1 text-base font-black text-white">{connection.phone_number || "Número conectado"}</h3>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                    Ativo
                  </span>
                </div>

                <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Nome do dispositivo</p>
                  <p className="mt-2 text-sm font-black text-white">{connectionName(connection)}</p>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Conexão realizada com sucesso
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDetailsConnection(connection)}
                    className="oz-button-secondary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black"
                  >
                    <Info className="h-4 w-4" />
                    Mostrar Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnectDevice(connection)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-sm font-black text-red-200 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Desconectar
                  </button>
                </div>
              </article>
            ))}

            {!loading && visibleConnections.length === 0 ? (
              <div className="oz-card flex min-h-72 items-center justify-center rounded-xl p-6 text-center">
                <div>
                  <Smartphone className="mx-auto h-10 w-10 text-zinc-600" />
                  <h3 className="mt-4 text-base font-black text-white">
                    {deviceTab === "active" ? "Nenhuma sessão ativa" : "Nenhuma sessão inativa"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {deviceTab === "active"
                      ? "Conecte um novo WhatsApp para iniciar."
                      : "Dispositivos desconectados aparecerão aqui."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="relative grid gap-4 sm:grid-cols-3">
          <div className="oz-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Ativos</p>
            <p className="mt-2 text-2xl font-black text-white">{activeConnections.length}</p>
          </div>
          <div className="oz-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Inativos</p>
            <p className="mt-2 text-2xl font-black text-white">{inactiveConnections.length}</p>
          </div>
          <div className="oz-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Limite do plano</p>
            <p className="mt-2 text-2xl font-black text-white">{activeConnections.length}/{deviceLimit}</p>
          </div>
        </section>
      </div>

      {detailsConnection ? (
        <Modal
          title="Detalhes do dispositivo"
          description="Resumo operacional da conexão WhatsApp."
          onClose={() => setDetailsConnection(null)}
          footer={
            <ActionButton type="button" onClick={() => setDetailsConnection(null)}>
              Fechar
            </ActionButton>
          }
        >
          <div className="grid gap-3">
            {[
              ["Número conectado", detailsConnection.phone_number || "Não informado"],
              ["Nome do dispositivo", connectionName(detailsConnection)],
              ["Status", detailsConnection.status === "connected" ? "Conexão realizada com sucesso" : "Sessão inativa"],
              ["Tipo", detailsConnection.type === "cloud_api" ? "WhatsApp Oficial" : "WhatsApp Contingência"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {connectModalOpen ? (
        <Modal
          title="Conectar um novo dispositivo"
          description="Escolha o tipo de conexão WhatsApp."
          onClose={() => setConnectModalOpen(false)}
          footer={
            <>
              <ActionButton type="button" variant="secondary" onClick={() => setConnectModalOpen(false)}>
                Cancelar
              </ActionButton>
              <ActionButton type="button" onClick={continueConnectionFlow} disabled={connectDisabled}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                Continuar
              </ActionButton>
            </>
          }
        >
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setConnectionChoice("official")}
              className={`rounded-xl border p-4 text-left transition ${
                connectionChoice === "official"
                  ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_28px_rgba(16,185,129,0.14)]"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">WhatsApp Oficial</h3>
                  <p className="mt-1 text-xs font-medium text-zinc-500">Conecta pelo popup oficial da Meta.</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setConnectionChoice("contingency")}
              className={`rounded-xl border p-4 text-left transition ${
                connectionChoice === "contingency"
                  ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_28px_rgba(16,185,129,0.14)]"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">WhatsApp Contingência</h3>
                  <p className="mt-1 text-xs font-medium text-zinc-500">Sessão alternativa para operação de apoio.</p>
                </div>
              </div>
            </button>

            {connecting ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Estado da conexão</p>
                <p className="mt-2 text-sm font-black text-white">{signupStep}</p>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
