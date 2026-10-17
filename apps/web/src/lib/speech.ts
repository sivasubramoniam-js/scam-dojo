/**
 * Web Speech API utilities for Train voice-call simulation.
 * Supports text-to-speech (SpeechSynthesis) and speech-to-text (SpeechRecognition).
 */

export interface SpeechController {
  speak: (text: string, onEnd?: () => void, pitch?: number) => void;
  stop: () => void;
  resume: () => void;
  isAvailable: boolean;
}

export function createSpeechSynthesizer(lang: string = "en-IN"): SpeechController {
  const isAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  let cachedVoices: SpeechSynthesisVoice[] = [];
  if (isAvailable) {
    cachedVoices = window.speechSynthesis.getVoices();
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        cachedVoices = window.speechSynthesis.getVoices();
      });
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        cachedVoices = window.speechSynthesis.getVoices();
      };
    }
  }

  const stop = () => {
    if (isAvailable) {
      window.speechSynthesis.cancel();
    }
  };

  const resume = () => {
    if (isAvailable && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  // Keep a reference to prevent Chrome garbage collection of active utterance
  let activeUtterance: SpeechSynthesisUtterance | null = null;

  const speak = (text: string, onEnd?: () => void, pitch: number = 0.9) => {
    if (!isAvailable) {
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {}

    // Clean text of markdown artifacts, asterisks, brackets
    const cleanText = text
      .replace(/[*_#`~[\]()]/g, "")
      .replace(/https?:\/\/\S+/g, "link attached")
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.02; // Authoritative, stern scammer cadence
    utterance.pitch = pitch; // Slightly deeper, rough tone (e.g. 0.85 - 0.9)

    // Pick best available voice
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("hi-IN")) ||
      voices.find((v) => v.lang.toLowerCase().includes("male") && v.lang.startsWith("en")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;

    if (voice) {
      utterance.voice = voice;
    }

    activeUtterance = utterance;

    utterance.onend = () => {
      activeUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  return { speak, stop, resume, isAvailable };
}

export interface VoiceRecognizer {
  start: (onResult: (text: string) => void, onError?: (err: string) => void) => void;
  stop: () => void;
  isAvailable: boolean;
}

export function createVoiceRecognizer(lang: string = "en-IN"): VoiceRecognizer {
  const SpeechRec =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  let activeInstance: any = null;

  return {
    isAvailable: Boolean(SpeechRec),
    start: (onResult, onError) => {
      if (!SpeechRec) {
        onError?.("Voice input is not supported in this browser.");
        return;
      }

      try {
        if (activeInstance) {
          try {
            activeInstance.abort();
          } catch {}
          activeInstance = null;
        }

        const recognition = new SpeechRec();
        activeInstance = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = lang;

        let hasFired = false;

        recognition.onresult = (event: any) => {
          if (hasFired) return;
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript && transcript.trim()) {
            hasFired = true;
            try {
              recognition.abort();
            } catch {}
            activeInstance = null;
            onResult(transcript.trim());
          }
        };

        recognition.onerror = (e: any) => {
          if (hasFired) return;
          activeInstance = null;
          onError?.(e.error || "Speech recognition error");
        };

        recognition.onend = () => {
          activeInstance = null;
        };

        recognition.start();
      } catch (err: any) {
        activeInstance = null;
        onError?.(err.message || "Failed to start microphone");
      }
    },
    stop: () => {
      if (activeInstance) {
        try {
          activeInstance.abort();
        } catch {}
        activeInstance = null;
      }
    },
  };
}
