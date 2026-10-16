/**
 * Gemini Multimodal Live API Client for Scam Dojo.
 * Supports real-time bidirectional streaming of 16kHz PCM audio, 24kHz playback,
 * webcam video frame injection (JPEG), and live transcription.
 */

export interface GeminiLiveOptions {
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onTranscript?: (text: string, role: "scammer" | "user") => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (err: string) => void;
  onReady?: () => void;
  onConnected?: (model: string) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private scheduledEndTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isSpeaking = false;
  private checkSpeakingInterval: any = null;

  // Mic capture
  private micStream: MediaStream | null = null;
  private micAudioCtx: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;

  // Video frame capture
  private videoInterval: any = null;
  private videoTarget: HTMLVideoElement | null = null;

  private options: GeminiLiveOptions;
  public status: "disconnected" | "connecting" | "connected" | "ready" = "disconnected";

  constructor(options: GeminiLiveOptions = {}) {
    this.options = options;
  }

  /**
   * Connect to the FastAPI Gemini Live WebSocket gateway.
   */
  public async connect(sessionId: string): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = "connecting";
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const host =
      process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ||
      (typeof window !== "undefined" ? `${protocol}//${window.location.hostname}:8080` : "ws://localhost:8080");

    const wsUrl = `${host}/v1/train/live/ws/${sessionId}`;

    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(wsUrl);
        this.ws = socket;

        socket.onopen = () => {
          this.status = "connected";
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleServerMessage(msg);
            if (msg.type === "ready") {
              this.status = "ready";
              this.options.onReady?.();
              resolve();
            }
          } catch (e: any) {
            console.error("[GeminiLive] Message parsing error:", e);
          }
        };

        socket.onerror = (err) => {
          console.warn("[GeminiLive] WebSocket error:", err);
          this.options.onError?.("Live WebSocket connection error");
          reject(err);
        };

        socket.onclose = () => {
          this.status = "disconnected";
          this.stopAudioPlayback();
          this.stopAudioCapture();
          this.stopVideoCapture();
        };

        // Safety fallback timeout to resolve if ready arrives
        setTimeout(() => {
          if (this.status === "connected") {
            resolve();
          }
        }, 3000);
      } catch (err: any) {
        this.status = "disconnected";
        reject(err);
      }
    });
  }

  private handleServerMessage(msg: any): void {
    switch (msg.type) {
      case "connected":
        this.options.onConnected?.(msg.model || "gemini-3.8-live");
        break;

      case "ready":
        this.options.onReady?.();
        break;

      case "audio":
        if (msg.data) {
          this.playPcmChunk(msg.data, msg.rate || 24000);
        }
        break;

      case "transcript":
        if (msg.text) {
          this.options.onTranscript?.(msg.text, msg.role || "scammer");
        }
        break;

      case "user_transcript":
        if (msg.text) {
          this.options.onTranscript?.(msg.text, "user");
        }
        break;

      case "interrupted":
        this.stopAudioPlayback();
        this.options.onInterrupted?.();
        break;

      case "turn_complete":
        this.options.onTurnComplete?.();
        break;

      case "fallback_mode":
        console.warn("[GeminiLive] Gateway fallback:", msg.message);
        break;
    }
  }

  /**
   * Initializes or returns the 24kHz audio playback context.
   */
  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.startSpeakingMonitor();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Periodically monitors whether audio is actively playing to toggle isSpeaking.
   */
  private startSpeakingMonitor(): void {
    if (this.checkSpeakingInterval) return;
    this.checkSpeakingInterval = setInterval(() => {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const speaking = this.scheduledEndTime > now;
      if (speaking !== this.isSpeaking) {
        this.isSpeaking = speaking;
        this.options.onSpeakingChange?.(speaking);
      }
    }, 80);
  }

  /**
   * Play incoming base64-encoded 24kHz 16-bit mono PCM chunk without gap stutter.
   */
  private playPcmChunk(base64Data: string, sampleRate = 24000): void {
    try {
      const ctx = this.getAudioContext();
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, float32Array.length, sampleRate);
      buffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, this.scheduledEndTime);
      source.start(startTime);
      this.scheduledEndTime = startTime + buffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
      };
    } catch (e) {
      console.error("[GeminiLive] Audio decode/playback error:", e);
    }
  }

  /**
   * Stop all currently scheduled and playing audio buffers immediately (e.g. on interruption).
   */
  public stopAudioPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {}
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.scheduledEndTime = this.audioCtx.currentTime;
    }
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.options.onSpeakingChange?.(false);
    }
  }

  /**
   * Start microphone streaming to Gemini Live (PCM 16kHz mono).
   */
  public async startAudioCapture(): Promise<void> {
    if (this.isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.micStream = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const micCtx = new AudioContextClass();
      this.micAudioCtx = micCtx;

      const source = micCtx.createMediaStreamSource(stream);
      // Use 4096 buffer size for stable chunking
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      this.processorNode = processor;

      processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Resample/convert to 16kHz 16-bit PCM
        const pcm16 = this.downsampleTo16k(inputData, e.inputBuffer.sampleRate);
        const uint8 = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
        const b64 = this.uint8ArrayToBase64(uint8);

        this.ws.send(JSON.stringify({ type: "audio", data: b64 }));
      };

      source.connect(processor);
      processor.connect(micCtx.destination);
      this.isRecording = true;
    } catch (err: any) {
      this.options.onError?.(`Microphone access error: ${err.message}`);
    }
  }

  /**
   * Stop microphone audio capture.
   */
  public stopAudioCapture(): void {
    this.isRecording = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "audio_end" }));
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.micAudioCtx) {
      this.micAudioCtx.close();
      this.micAudioCtx = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
  }

  /**
   * Start streaming video frames from the user's webcam video element at ~1-2 FPS.
   */
  public startVideoCapture(videoEl: HTMLVideoElement, fps = 1.5): void {
    this.videoTarget = videoEl;
    if (this.videoInterval) clearInterval(this.videoInterval);

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    this.videoInterval = setInterval(() => {
      if (
        !this.videoTarget ||
        this.videoTarget.readyState < 2 ||
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN ||
        !ctx
      ) {
        return;
      }

      try {
        ctx.drawImage(this.videoTarget, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        this.ws.send(JSON.stringify({ type: "video", data: dataUrl }));
      } catch (e) {
        console.debug("[GeminiLive] Video frame grab skipped:", e);
      }
    }, 1000 / fps);
  }

  /**
   * Stop streaming video frames.
   */
  public stopVideoCapture(): void {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
    this.videoTarget = null;
  }

  /**
   * Send text prompt / verbal counter to Gemini Live.
   */
  public sendText(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  /**
   * Disconnect and clean up all resources.
   */
  public disconnect(): void {
    this.stopAudioPlayback();
    this.stopAudioCapture();
    this.stopVideoCapture();
    if (this.checkSpeakingInterval) {
      clearInterval(this.checkSpeakingInterval);
      this.checkSpeakingInterval = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = "disconnected";
  }

  private downsampleTo16k(buffer: Float32Array, inputSampleRate: number): Int16Array {
    if (inputSampleRate === 16000) {
      const output = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const compression = inputSampleRate / 16000;
    const length = Math.floor(buffer.length / compression);
    const result = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(i * compression);
      const s = Math.max(-1, Math.min(1, buffer[idx]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
