/**
 * Web Speech API utilities for Train voice-call simulation.
 * Supports text-to-speech (SpeechSynthesis) and speech-to-text (SpeechRecognition).
 */

export interface SpeechController {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  isAvailable: boolean;
}

export function createSpeechSynthesizer(lang: string = "en-IN"): SpeechController {
  const isAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = () => {
    if (isAvailable) {
      window.speechSynthesis.cancel();
    }
  };

  const speak = (text: string, onEnd?: () => void) => {
    if (!isAvailable) {
      onEnd?.();
      return;
    }

    stop();

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
    utterance.rate = 1.05; // Slightly hurried scammer cadence
    utterance.pitch = 1.0;

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("hi-IN")) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = () => {
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  return { speak, stop, isAvailable };
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
          activeInstance.abort();
        }

        const recognition = new SpeechRec();
        activeInstance = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = lang;

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            onResult(transcript);
          }
        };

        recognition.onerror = (e: any) => {
          onError?.(e.error || "Speech recognition error");
        };

        recognition.start();
      } catch (err: any) {
        onError?.(err.message || "Failed to start microphone");
      }
    },
    stop: () => {
      if (activeInstance) {
        try {
          activeInstance.stop();
        } catch {}
        activeInstance = null;
      }
    },
  };
}
