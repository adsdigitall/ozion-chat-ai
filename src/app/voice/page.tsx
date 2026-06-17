"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Mic, Pause, Play, RefreshCw, Search, Star, Trash2, UploadCloud, Volume2, Wand2, X } from "lucide-react";

type Voice = {
  id: string;
  name: string;
  provider: "elevenlabs" | "openai" | "cartesia";
  voice_id: string | null;
  language: string | null;
  gender: string | null;
  style: string | null;
  is_cloned: boolean | null;
  is_favorite: boolean | null;
};

type VoiceUsage = {
  provider: "elevenlabs";
  tier: string | null;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string | null;
};

type VoiceGenerationSettings = {
  preset: "natural" | "expressive" | "stable" | "custom";
  model_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
  output_format: string;
};

const naturalSettings: VoiceGenerationSettings = {
  preset: "natural",
  model_id: "eleven_v3",
  stability: 0.48,
  similarity_boost: 0.82,
  style: 0.35,
  speed: 1,
  use_speaker_boost: true,
  output_format: "mp3_44100_128",
};

const presetSettings: Record<VoiceGenerationSettings["preset"], VoiceGenerationSettings> = {
  natural: naturalSettings,
  expressive: {
    preset: "expressive",
    model_id: "eleven_v3",
    stability: 0.32,
    similarity_boost: 0.78,
    style: 0.62,
    speed: 0.98,
    use_speaker_boost: true,
    output_format: "mp3_44100_128",
  },
  stable: {
    preset: "stable",
    model_id: "eleven_multilingual_v2",
    stability: 0.72,
    similarity_boost: 0.86,
    style: 0.18,
    speed: 1,
    use_speaker_boost: true,
    output_format: "mp3_44100_128",
  },
  custom: naturalSettings,
};

function decimalLabel(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function numberLabel(value: number) {
  return value.toLocaleString("pt-BR");
}

export default function VoicePage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("Olá! Esta é uma demonstração da voz do seu agente Ozion.");
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [usage, setUsage] = useState<VoiceUsage | null>(null);
  const [lastGenerationCost, setLastGenerationCost] = useState<number | null>(null);
  const [settings, setSettings] = useState<VoiceGenerationSettings>(naturalSettings);
  const [syncing, setSyncing] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSaving, setCloneSaving] = useState(false);
  const [cloneForm, setCloneForm] = useState({ name: "", description: "" });
  const [cloneFiles, setCloneFiles] = useState<File[]>([]);
  const [detailsVoice, setDetailsVoice] = useState<Voice | null>(null);
  const [deletingVoice, setDeletingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [form, setForm] = useState({ name: "", provider: "openai" as Voice["provider"], voice_id: "nova", language: "pt-BR", gender: "", style: "" });

  async function loadVoices() {
    setSyncing(true);
    try {
      const response = await fetch("/api/voice/configs", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao carregar vozes.");
      setUsage(result.usage ?? null);
      if (result.warning) setError(result.warning);
      const nextVoices = Array.isArray(result.voices) ? result.voices : [];
      setVoices(nextVoices);
      setSelectedId((current) => nextVoices.some((voice: Voice) => voice.id === current) ? current : nextVoices[0]?.id ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar vozes.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadVoices(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const selected = voices.find((voice) => voice.id === selectedId) ?? voices[0];
  const filtered = useMemo(() => voices.filter((voice) => !search || `${voice.name} ${voice.provider} ${voice.style}`.toLowerCase().includes(search.toLowerCase())), [search, voices]);
  const clonedVoices = filtered.filter((voice) => voice.is_cloned);
  const nativeVoices = filtered.filter((voice) => !voice.is_cloned);
  const characterCount = Array.from(text).length;
  const estimatedCredits = selected?.provider === "elevenlabs" ? characterCount : null;
  const remainingAfterGeneration = usage && estimatedCredits !== null ? usage.remaining - estimatedCredits : null;

  function applyPreset(preset: VoiceGenerationSettings["preset"]) {
    setSettings(preset === "custom" ? { ...settings, preset: "custom" } : presetSettings[preset]);
  }

  function updateSetting<K extends keyof VoiceGenerationSettings>(key: K, value: VoiceGenerationSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value, preset: key === "preset" ? value as VoiceGenerationSettings["preset"] : "custom" }));
  }

  async function generate() {
    if (!selected?.voice_id || selected.provider === "cartesia") {
      setError("Selecione uma voz OpenAI ou ElevenLabs configurada.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: selected.voice_id,
          provider: selected.provider,
          settings: selected.provider === "elevenlabs" ? settings : undefined,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Falha ao gerar áudio.");
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const nextUrl = URL.createObjectURL(await response.blob());
      const estimatedCost = Number(response.headers.get("X-Ozion-Estimated-Credits") ?? characterCount);
      setLastGenerationCost(Number.isFinite(estimatedCost) ? estimatedCost : characterCount);
      setAudioUrl(nextUrl);
      window.setTimeout(() => void audioRef.current?.play(), 0);
      void loadVoices();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Falha ao gerar áudio.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveVoice(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/voice/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, gender: form.gender || null, style: form.style || null, is_cloned: false, is_favorite: false, config: {} }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar voz.");
      setShowModal(false);
      await loadVoices();
      setSelectedId(result.voice.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar voz.");
    } finally {
      setSaving(false);
    }
  }

  async function cloneVoice(event: FormEvent) {
    event.preventDefault();
    setCloneSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.append("name", cloneForm.name);
      if (cloneForm.description) payload.append("description", cloneForm.description);
      cloneFiles.forEach((file) => payload.append("files", file));

      const response = await fetch("/api/voice/clone", {
        method: "POST",
        body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao clonar voz.");

      setShowCloneModal(false);
      setCloneForm({ name: "", description: "" });
      setCloneFiles([]);
      await loadVoices();
      setSelectedId(result.voice.id);
    } catch (cloneError) {
      setError(cloneError instanceof Error ? cloneError.message : "Falha ao clonar voz.");
    } finally {
      setCloneSaving(false);
    }
  }

  async function toggleFavorite(voice: Voice) {
    if (voice.id.startsWith("openai-") || voice.id.startsWith("elevenlabs-remote-")) return;
    await fetch(`/api/voice/configs?id=${voice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: !voice.is_favorite }),
    });
    await loadVoices();
  }

  async function removeVoice(voice: Voice) {
    if (!voice.voice_id) return;
    setDeletingVoice(true);
    setError(null);
    try {
      const params = new URLSearchParams({ id: voice.id, remote: "1", voiceId: voice.voice_id });
      const response = await fetch(`/api/voice/configs?${params.toString()}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Falha ao excluir voz.");
      }
      setDetailsVoice(null);
      await loadVoices();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Falha ao excluir voz.");
    } finally {
      setDeletingVoice(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-white">Voice Studio</h1><p className="mt-1 text-sm text-zinc-500">Use apenas suas vozes clonadas da ElevenLabs</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadVoices()} disabled={syncing} className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:border-zinc-700 disabled:opacity-50">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Atualizar vozes
          </button>
          <button onClick={() => setShowCloneModal(true)} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white"><UploadCloud className="h-4 w-4" />Clonar voz</button>
        </div>
      </div>
      {error && <button onClick={() => setError(null)} className="w-full rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-300">{error}</button>}

      {!voices.length && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <UploadCloud className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Nenhuma voz clonada ainda</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">As vozes prontas da ElevenLabs ficam ocultas. Clique em Clonar voz ou Atualizar vozes para trazer apenas suas vozes clonadas.</p>
          <button onClick={() => setShowCloneModal(true)} className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white">Clonar primeira voz</button>
        </div>
      )}
      {!!voices.length && (
        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
          <div className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-3xl border border-emerald-500/15 bg-zinc-950 p-5 shadow-2xl shadow-black/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <Wand2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">Teste rapido</p>
                    <h2 className="mt-1 text-xl font-bold text-white">Gerador de audio</h2>
                    <p className="mt-1 text-sm text-zinc-400">Use essa area so para testar a geracao com a voz escolhida.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCloneModal(true)} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">
                  Clonar
                </button>
              </div>

              {selected && (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-emerald-300">
                      <Volume2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">{selected.name}</p>
                      <p className="text-xs text-zinc-500">{selected.is_cloned ? "Voz clonada selecionada" : "Voz nativa selecionada"}</p>
                    </div>
                  </div>
                </div>
              )}

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={5}
                placeholder="Digite aqui o texto para testar o audio."
                className="mt-4 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500/30"
              />

              {selected?.provider === "elevenlabs" && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {([
                      ["natural", "Natural"],
                      ["expressive", "Emocao"],
                      ["stable", "Robusto"],
                    ] as const).map(([preset, label]) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${settings.preset === preset ? "bg-emerald-500 text-white" : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-emerald-500/40"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-xs font-semibold text-zinc-400">Modelo</span>
                    <select value={settings.model_id} onChange={(event) => updateSetting("model_id", event.target.value)} className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500/40">
                      <option value="eleven_v3">Eleven v3</option>
                      <option value="eleven_multilingual_v2">Multilingual v2</option>
                      <option value="eleven_turbo_v2_5">Turbo v2.5</option>
                    </select>
                  </label>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                        Estabilidade
                        <strong className="text-emerald-300">{decimalLabel(settings.stability)}</strong>
                      </span>
                      <input type="range" min="0" max="1" step="0.01" value={settings.stability} onChange={(event) => updateSetting("stability", Number(event.target.value))} className="w-full accent-emerald-500" />
                    </label>
                    <label className="space-y-2">
                      <span className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                        Similaridade
                        <strong className="text-emerald-300">{decimalLabel(settings.similarity_boost)}</strong>
                      </span>
                      <input type="range" min="0" max="1" step="0.01" value={settings.similarity_boost} onChange={(event) => updateSetting("similarity_boost", Number(event.target.value))} className="w-full accent-emerald-500" />
                    </label>
                    <label className="space-y-2">
                      <span className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                        Sotaque
                        <strong className="text-emerald-300">{decimalLabel(settings.style)}</strong>
                      </span>
                      <input type="range" min="0" max="1" step="0.01" value={settings.style} onChange={(event) => updateSetting("style", Number(event.target.value))} className="w-full accent-emerald-500" />
                    </label>
                    <label className="space-y-2">
                      <span className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                        Velocidade
                        <strong className="text-emerald-300">{decimalLabel(settings.speed)}</strong>
                      </span>
                      <input type="range" min="0.7" max="1.2" step="0.01" value={settings.speed} onChange={(event) => updateSetting("speed", Number(event.target.value))} className="w-full accent-emerald-500" />
                    </label>
                  </div>
                </>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs text-zinc-500">Texto</p>
                  <p className="mt-1 text-lg font-bold text-white">{numberLabel(characterCount)} caracteres</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <p className="text-xs text-zinc-500">Custo</p>
                  <p className="mt-1 text-lg font-bold text-white">{estimatedCredits !== null ? `${numberLabel(estimatedCredits)} creditos` : "Nao informado"}</p>
                </div>
              </div>

              {remainingAfterGeneration !== null && (
                <p className="mt-3 text-xs font-medium text-zinc-500">
                  Saldo previsto apos gerar: <span className={remainingAfterGeneration < 0 ? "text-amber-300" : "text-emerald-300"}>{numberLabel(remainingAfterGeneration)}</span>
                </p>
              )}
              {lastGenerationCost !== null && <p className="mt-1 text-xs font-medium text-emerald-300">Ultima geracao: {numberLabel(lastGenerationCost)} creditos estimados.</p>}

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <button
                  type="button"
                  onClick={() => playing ? audioRef.current?.pause() : void audioRef.current?.play()}
                  disabled={!audioUrl}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white disabled:opacity-50"
                  aria-label={playing ? "Pausar audio" : "Tocar audio"}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                </button>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full bg-emerald-500 ${audioUrl ? "w-1/3" : "w-0"}`} />
                </div>
                {audioUrl && <a href={audioUrl} download="ozion-voice.mp3" className="rounded-full border border-zinc-700 p-2 text-zinc-400 hover:text-emerald-300"><Download className="h-4 w-4" /></a>}
                <audio ref={audioRef} src={audioUrl ?? undefined} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
              </div>

              <button
                type="button"
                onClick={() => void generate()}
                disabled={generating || !text.trim() || !selected}
                className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                {generating ? "Gerando..." : "Gerar audio"}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Biblioteca de vozes</h2>
                <p className="mt-1 text-sm text-zinc-500">As clonadas ficam no topo. As nativas e configuradas aparecem logo abaixo.</p>
              </div>
              <label className="relative block w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar vozes..." className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-white" />
              </label>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Clonadas</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{clonedVoices.length} vozes prontas para teste</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">{voices.filter((voice) => voice.is_favorite).length} favoritas</span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {clonedVoices.map((voice) => (
                  <button key={voice.id} onClick={() => setSelectedId(voice.id)} className={`rounded-2xl border p-4 text-left transition ${selected?.id === voice.id ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                          <Volume2 className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-white">{voice.name}</p>
                          <p className="text-xs text-zinc-500">{voice.provider}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <span onClick={(event) => { event.stopPropagation(); void toggleFavorite(voice); }} className={voice.is_favorite ? "text-amber-400" : "text-zinc-600"}>
                          <Star className="h-4 w-4" fill={voice.is_favorite ? "currentColor" : "none"} />
                        </span>
                        <span onClick={(event) => { event.stopPropagation(); setDetailsVoice(voice); }} className="text-zinc-600 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1">{voice.language || "pt-BR"}</span>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1">{voice.style || "cloned"}</span>
                    </div>
                  </button>
                ))}
                {!clonedVoices.length && <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">Nenhuma voz clonada encontrada nessa busca.</div>}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Nativas e configuradas</p>
                <h3 className="mt-1 text-lg font-bold text-white">{nativeVoices.length} vozes abaixo</h3>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {nativeVoices.map((voice) => (
                  <button key={voice.id} onClick={() => setSelectedId(voice.id)} className={`rounded-2xl border p-4 text-left transition ${selected?.id === voice.id ? "border-emerald-500/50 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                          <Mic className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-white">{voice.name}</p>
                          <p className="text-xs text-zinc-500">{voice.provider}</p>
                        </div>
                      </div>
                      <span onClick={(event) => { event.stopPropagation(); setDetailsVoice(voice); }} className="text-zinc-600 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1">{voice.language || "pt-BR"}</span>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1">{voice.style || "nativa"}</span>
                    </div>
                  </button>
                ))}
                {!nativeVoices.length && <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">Nenhuma voz nativa ou configurada por aqui ainda.</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {showCloneModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <form onSubmit={cloneVoice} className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-start justify-between border-b border-zinc-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Clonar voz na ElevenLabs</h2>
              <p className="mt-1 text-sm text-zinc-500">Envie uma ou mais amostras limpas da voz. Depois ela aparece aqui como voz clonada.</p>
            </div>
            <button type="button" onClick={() => setShowCloneModal(false)}><X className="h-5 w-5 text-zinc-500" /></button>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-2 block text-xs text-zinc-500">Nome da voz</span>
              <input required value={cloneForm.name} onChange={(event) => setCloneForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex: Safira Laila" className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs text-zinc-500">Descrição opcional</span>
              <textarea value={cloneForm.description} onChange={(event) => setCloneForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Ex: voz feminina, calma, atendimento humanizado" className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-white" />
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center hover:border-emerald-500/50">
              <UploadCloud className="mb-3 h-8 w-8 text-emerald-400" />
              <span className="text-sm font-medium text-white">Selecionar áudios de amostra</span>
              <span className="mt-1 text-xs text-zinc-500">MP3, WAV, M4A ou outro áudio aceito pela ElevenLabs</span>
              <input
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(event) => setCloneFiles(Array.from(event.target.files ?? []))}
              />
            </label>
            {!!cloneFiles.length && <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
              <p className="mb-2 font-medium text-zinc-300">{cloneFiles.length} arquivo(s) selecionado(s)</p>
              {cloneFiles.map((file) => <p key={`${file.name}-${file.size}`} className="truncate">{file.name}</p>)}
            </div>}
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/10 p-3 text-xs text-amber-100">
              Melhor resultado: áudio sem música, sem ruído, só a pessoa falando. Quanto mais limpo, mais natural fica.
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-800 p-4">
            <button type="button" onClick={() => setShowCloneModal(false)} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300">Cancelar</button>
            <button disabled={cloneSaving || !cloneFiles.length} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white disabled:opacity-50">{cloneSaving && <Loader2 className="h-4 w-4 animate-spin" />}{cloneSaving ? "Clonando..." : "Clonar voz"}</button>
          </div>
        </form>
      </div>}

      {detailsVoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-start justify-between border-b border-zinc-800 p-5">
            <div>
              <h2 className="font-semibold text-white">Detalhes da voz</h2>
              <p className="mt-1 text-sm text-zinc-500">Confira antes de excluir da ElevenLabs e do Ozion.</p>
            </div>
            <button type="button" onClick={() => setDetailsVoice(null)}><X className="h-5 w-5 text-zinc-500" /></button>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800"><Volume2 className="h-5 w-5 text-emerald-400" /></span>
              <div>
                <p className="font-medium text-white">{detailsVoice.name}</p>
                <p className="text-xs capitalize text-zinc-500">{detailsVoice.provider} • {detailsVoice.style || "cloned"}</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Voice ID</p><p className="mt-1 break-all text-zinc-200">{detailsVoice.voice_id || "—"}</p></div>
              <div className="rounded-lg border border-zinc-800 p-3"><p className="text-xs text-zinc-500">Tipo</p><p className="mt-1 text-zinc-200">{detailsVoice.is_cloned ? "Voz clonada" : "Voz cadastrada"}</p></div>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
              Excluir remove essa voz da sua lista e também tenta apagar a voz clonada dentro da ElevenLabs. Essa ação não dá para desfazer.
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-zinc-800 p-4">
            <button type="button" onClick={() => setDetailsVoice(null)} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300">Cancelar</button>
            <button onClick={() => void removeVoice(detailsVoice)} disabled={deletingVoice} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white disabled:opacity-50">{deletingVoice && <Loader2 className="h-4 w-4 animate-spin" />}{deletingVoice ? "Excluindo..." : "Excluir voz"}</button>
          </div>
        </div>
      </div>}

      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><form onSubmit={saveVoice} className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"><div className="flex justify-between border-b border-zinc-800 p-5"><h2 className="font-semibold text-white">Nova configuração de voz</h2><button type="button" onClick={() => setShowModal(false)}><X className="h-5 w-5 text-zinc-500" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">{(["name", "voice_id", "language", "gender", "style"] as const).map((key) => <label key={key}><span className="mb-2 block text-xs capitalize text-zinc-500">{key.replace("_", " ")}</span><input required={key === "name" || key === "voice_id"} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white" /></label>)}<label><span className="mb-2 block text-xs text-zinc-500">Provedor</span><select value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as Voice["provider"] }))} className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white"><option value="openai">OpenAI</option><option value="elevenlabs">ElevenLabs</option><option value="cartesia">Cartesia</option></select></label></div><div className="flex justify-end gap-2 border-t border-zinc-800 p-4"><button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300">Cancelar</button><button disabled={saving} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button></div></form></div>}
    </div>
  );
}
