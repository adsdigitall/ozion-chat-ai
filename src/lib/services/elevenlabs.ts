export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    };
  }

  async getVoices() {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status}${detail ? ` - ${detail.slice(0, 300)}` : ""}`);
    }
    const data = await response.json();
    return Array.isArray(data.voices) ? data.voices : [];
  }

  async getSubscription() {
    const response = await fetch(`${this.baseUrl}/user/subscription`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status}${detail ? ` - ${detail.slice(0, 300)}` : ""}`);
    }
    return response.json() as Promise<{
      character_count?: number;
      character_limit?: number;
      next_character_count_reset_unix?: number;
      tier?: string;
    }>;
  }

  async generateSpeech(voiceId: string, text: string, options?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
    use_speaker_boost?: boolean;
    model_id?: string;
    output_format?: string;
  }) {
    const outputFormat = options?.output_format || 'mp3_44100_128';
    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}?output_format=${encodeURIComponent(outputFormat)}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        text,
        model_id: options?.model_id || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options?.stability ?? 0.5,
          similarity_boost: options?.similarity_boost ?? 0.75,
          style: options?.style ?? 0,
          speed: options?.speed ?? 1,
          use_speaker_boost: options?.use_speaker_boost ?? true,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status}${detail ? ` - ${detail.slice(0, 300)}` : ""}`);
    }

    return response.blob();
  }

  async cloneVoice(name: string, audioFiles: Blob[], description?: string) {
    const formData = new FormData();
    formData.append('name', name);
    if (description) formData.append('description', description);
    audioFiles.forEach((file, i) => {
      formData.append('files', file, `sample_${i}.mp3`);
    });

    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${response.status}${data?.detail ? ` - ${JSON.stringify(data.detail).slice(0, 300)}` : ""}`);
    }
    return data as { voice_id?: string; name?: string };
  }

  async deleteVoice(voiceId: string) {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok && response.status !== 404) {
      const detail = await response.text();
      throw new Error(`ElevenLabs API Error: ${response.status}${detail ? ` - ${detail.slice(0, 300)}` : ""}`);
    }
    return response.ok || response.status === 404;
  }

  async getVoice(voiceId: string) {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: this.getHeaders(),
      });
      return { status: response.ok ? 'online' : 'error', latency: Date.now() - start };
    } catch {
      return { status: 'error', latency: Date.now() - start };
    }
  }
}
