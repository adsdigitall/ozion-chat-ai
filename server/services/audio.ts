// @ts-nocheck
import fs from 'fs';
import path from 'path';
import os from 'os';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// ─── Audio Download ────────────────────────────────────────────
export async function downloadAudio(url: string, filename?: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download audio: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const name = filename || `audio_${Date.now()}.ogg`;
  const tmpPath = path.join(os.tmpdir(), name);
  fs.writeFileSync(tmpPath, buf);
  return tmpPath;
}

// ─── Transcription (Groq Whisper) ─────────────────────────────
export async function transcribeAudio(audioPath: string, language = 'pt'): Promise<{
  text: string;
  duration: number;
  language: string;
}> {
  // Try Groq first (fastest, free tier)
  if (GROQ_API_KEY) {
    try {
      return await transcribeWithGroq(audioPath, language);
    } catch (e: any) {
      console.warn('Groq transcription failed, trying OpenAI:', e.message);
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    return await transcribeWithOpenAI(audioPath, language);
  }

  throw new Error('No transcription API configured (GROQ_API_KEY or OPENAI_API_KEY)');
}

async function transcribeWithGroq(audioPath: string, language: string): Promise<{
  text: string;
  duration: number;
  language: string;
}> {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(audioPath);
  const blob = new Blob([fileBuffer], { type: 'audio/ogg' });
  formData.append('file', blob, path.basename(audioPath));
  formData.append('model', 'whisper-large-v3');
  formData.append('language', language);
  formData.append('response_format', 'verbose_json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq transcription error: ${err}`);
  }

  const data = await res.json() as any;
  return {
    text: data.text || '',
    duration: data.duration || 0,
    language: data.language || language,
  };
}

async function transcribeWithOpenAI(audioPath: string, language: string): Promise<{
  text: string;
  duration: number;
  language: string;
}> {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(audioPath);
  const blob = new Blob([fileBuffer], { type: 'audio/ogg' });
  formData.append('file', blob, path.basename(audioPath));
  formData.append('model', 'whisper-1');
  formData.append('language', language);
  formData.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI transcription error: ${err}`);
  }

  const data = await res.json() as any;
  return {
    text: data.text || '',
    duration: data.duration || 0,
    language: data.language || language,
  };
}

// ─── Text-to-Speech (ElevenLabs) ─────────────────────────────
export async function generateSpeech(
  text: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
  options: {
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speed?: number;
  } = {}
): Promise<{ audioBuffer: Buffer; contentType: string }> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const {
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    speed = 1.0,
  } = options;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          speed,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error: ${err}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return { audioBuffer, contentType: 'audio/mpeg' };
}

// ─── Voice Cloning (ElevenLabs) ──────────────────────────────
export async function cloneVoice(
  name: string,
  audioFiles: Buffer[],
  description = ''
): Promise<{ voiceId: string; name: string }> {
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

  const formData = new FormData();
  formData.append('name', name);
  if (description) formData.append('description', description);
  formData.append('files', new Blob([audioFiles[0]], { type: 'audio/mpeg' }), `${name}.mp3`);

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs voice clone error: ${err}`);
  }

  const data = await res.json() as any;
  return { voiceId: data.voice_id, name: data.name };
}

export async function listVoices(): Promise<Array<{
  voiceId: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}>> {
  if (!ELEVENLABS_API_KEY) return [];

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    const data = await res.json() as any;
    return (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category || 'unknown',
      labels: v.labels || {},
    }));
  } catch {
    return [];
  }
}

// ─── Audio Format Conversion ───────────────────────────────────
export async function convertOggToMp3(oggPath: string): Promise<string> {
  const mp3Path = oggPath.replace('.ogg', '.mp3');
  // In production, use ffmpeg:
  // execSync(`ffmpeg -i ${oggPath} -acodec libmp3lame -ab 128k ${mp3Path}`);
  // For now, just copy the file
  fs.copyFileSync(oggPath, mp3Path);
  return mp3Path;
}

export async function convertToOpusOgg(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.\w+$/, '.opus.ogg');
  // In production, use ffmpeg for proper Opus encoding:
  // execSync(`ffmpeg -i ${inputPath} -c:a libopus -b:a 32k -ar 48000 -ac 1 ${outputPath}`);
  fs.copyFileSync(inputPath, outputPath);
  return outputPath;
}

// ─── Cleanup ───────────────────────────────────────────────────
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}
