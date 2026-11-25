"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { encodePcmToWav } from "@/lib/audio/wav-encoder";

export interface MicErrorInfo {
  code: string;
  message: string;
  canOpenNewTab?: boolean;
  localhostUrl?: string;
}

interface UseVoiceCaptureOptions {
  lang?: string;
  disabled?: boolean;
  onTranscript: (transcript: string, durationSeconds: number) => void;
}

export function useVoiceCapture({
  lang = "en-IN",
  disabled = false,
  onTranscript,
}: UseVoiceCaptureOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micError, setMicError] = useState<MicErrorInfo | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Web Speech API refs
  const recognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef("");
  const speechSubmittedRef = useRef(false);
  const preferWavFallbackRef = useRef(false);

  // WAV + silence detector refs
  const activeModeRef = useRef<"none" | "speech_api" | "wav_recorder">("none");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const lastVoiceAtRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);

  const cleanupWavResources = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    cleanupWavResources();
    activeModeRef.current = "none";
    setIsListening(false);
    setLiveTranscript("");
    speechTranscriptRef.current = "";
  }, [cleanupWavResources]);

  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  const finishWavRecording = useCallback(
    async (cancelled = false) => {
      if (activeModeRef.current !== "wav_recorder") return;

      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const recordedChunks = chunksRef.current;
      chunksRef.current = [];
      const hadSpeech = hasSpokenRef.current;
      const elapsedSecs = startedAtRef.current
        ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        : 1;

      cleanupWavResources();
      activeModeRef.current = "none";
      setIsListening(false);
      setLiveTranscript("");

      if (cancelled || recordedChunks.length === 0 || !hadSpeech) {
        if (!cancelled && !hadSpeech) {
          setMicError({
            code: "no-speech",
            message: "No speech heard. Tap and speak clearly.",
          });
        }
        return;
      }

      try {
        setIsTranscribing(true);
        const wavBlob = encodePcmToWav(recordedChunks, sampleRate, 16000);
        const formData = new FormData();
        formData.append("audio", wavBlob, "speech.wav");
        formData.append("lang", lang);

        const res = await fetch("/api/tutor/transcribe", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const text = (data?.transcript ?? "").trim();
          if (text) {
            onTranscriptRef.current(text, elapsedSecs);
          } else {
            setMicError({
              code: "no-speech",
              message: "Could not hear clear words. Try speaking closer to the mic.",
            });
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setMicError({
            code: "transcribe-failed",
            message:
              errData?.error ||
              "Could not recognize speech. Please speak clearly or type below.",
          });
        }
      } catch {
        setMicError({
          code: "network",
          message: "Transcription failed. Please try again or type below.",
        });
      } finally {
        setIsTranscribing(false);
      }
    },
    [cleanupWavResources, lang]
  );

  const startWavRecording = useCallback(
    async (existingStream?: MediaStream) => {
      try {
        const stream =
          existingStream ||
          (await navigator.mediaDevices.getUserMedia({ audio: true }));

        mediaStreamRef.current = stream;
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;

        chunksRef.current = [];
        startedAtRef.current = Date.now();
        lastVoiceAtRef.current = Date.now();
        hasSpokenRef.current = false;

        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          chunksRef.current.push(new Float32Array(inputData));

          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          if (rms > 0.015) {
            hasSpokenRef.current = true;
            lastVoiceAtRef.current = Date.now();
          }
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioCtx.destination);
        processorRef.current = processor;

        activeModeRef.current = "wav_recorder";
        setIsListening(true);

        silenceTimerRef.current = setInterval(() => {
          const now = Date.now();
          if (
            hasSpokenRef.current &&
            now - lastVoiceAtRef.current >= 1400
          ) {
            void finishWavRecording(false);
          } else if (
            !hasSpokenRef.current &&
            now - startedAtRef.current >= 7000
          ) {
            void finishWavRecording(false);
          } else if (now - startedAtRef.current >= 20000) {
            void finishWavRecording(false);
          }
        }, 150);
      } catch {
        cleanupWavResources();
        setIsListening(false);
        setMicError({
          code: "mic-error",
          message: "Microphone unavailable. Please allow mic access or type below.",
        });
      }
    },
    [cleanupWavResources, finishWavRecording]
  );

  const startListening = useCallback(async () => {
    if (disabled || isListening || isTranscribing) return;
    setMicError(null);

    if (typeof window === "undefined") return;

    if (!window.isSecureContext) {
      const localhostUrl = window.location.href.replace(
        window.location.hostname,
        "localhost"
      );
      setMicError({
        code: "insecure-context",
        message: "Browser blocks microphone on IP URLs. Use localhost instead.",
        localhostUrl,
      });
      return;
    }

    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError({
        code: "unsupported",
        message: inIframe
          ? "Embedded preview blocks microphone. Open in Chrome or Edge."
          : "Microphone API unavailable in this browser.",
        canOpenNewTab: inIframe,
      });
      return;
    }

    let verifiedStream: MediaStream;
    try {
      verifiedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const errName = err?.name || "";
      if (
        errName === "NotAllowedError" ||
        errName === "PermissionDeniedError" ||
        errName === "SecurityError"
      ) {
        setMicError({
          code: "not-allowed",
          message: inIframe
            ? "Embedded preview blocked microphone. Open in a browser tab."
            : "Microphone blocked in browser. Click the lock/mic icon in the address bar → Allow Microphone.",
          canOpenNewTab: inIframe,
        });
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setMicError({
          code: "not-found",
          message: "No microphone detected on this device.",
        });
      } else {
        setMicError({
          code: "mic-error",
          message: "Could not access microphone. Check device settings or type below.",
        });
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || preferWavFallbackRef.current) {
      await startWavRecording(verifiedStream);
      return;
    }

    // Free probe stream before starting Web Speech API so Windows doesn't hold the device lock
    verifiedStream.getTracks().forEach((track) => track.stop());

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      let accumulatedFinal = "";
      speechTranscriptRef.current = "";
      speechSubmittedRef.current = false;
      startedAtRef.current = Date.now();

      recognition.onstart = () => {
        activeModeRef.current = "speech_api";
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript ?? "";
          if (event.results[i].isFinal) {
            accumulatedFinal += piece + " ";
          } else {
            interim += piece;
          }
        }
        const combined = (accumulatedFinal + interim).trim();
        speechTranscriptRef.current = combined;
        setLiveTranscript(combined);
      };

      recognition.onerror = (event: any) => {
        if (
          event.error === "service-not-allowed" ||
          event.error === "network"
        ) {
          // Browser blocked cloud speech service (e.g. Brave/Edge/firewall) -> switch seamlessly to WAV recorder!
          preferWavFallbackRef.current = true;
          try {
            recognition.onend = null;
            recognition.stop();
          } catch {
            // Ignore
          }
          recognitionRef.current = null;
          activeModeRef.current = "none";
          void startWavRecording();
          return;
        }

        if (event.error === "not-allowed") {
          setMicError({
            code: "not-allowed",
            message: inIframe
              ? "Embedded preview blocked microphone. Open in a browser tab."
              : "Speech permission blocked. Click the lock/mic icon in the address bar → Allow Microphone.",
            canOpenNewTab: inIframe,
          });
        } else if (event.error === "no-speech") {
          setMicError({
            code: "no-speech",
            message: "No speech heard. Tap and speak clearly.",
          });
        } else if (event.error !== "aborted") {
          setMicError({
            code: "speech-error",
            message: "Could not capture audio. Please try again.",
          });
        }
        setIsListening(false);
        activeModeRef.current = "none";
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (activeModeRef.current === "speech_api") {
          activeModeRef.current = "none";
        }
        setIsListening(false);
        const textToSend = speechTranscriptRef.current.trim();
        setLiveTranscript("");
        speechTranscriptRef.current = "";

        const elapsedSecs = startedAtRef.current
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          : 1;

        if (textToSend && !speechSubmittedRef.current) {
          speechSubmittedRef.current = true;
          onTranscriptRef.current(textToSend, elapsedSecs);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      preferWavFallbackRef.current = true;
      await startWavRecording();
    }
  }, [disabled, isListening, isTranscribing, lang, startWavRecording]);

  const stopListening = useCallback(() => {
    if (activeModeRef.current === "wav_recorder") {
      void finishWavRecording(false);
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
  }, [finishWavRecording]);

  const toggleListening = useCallback(() => {
    if (disabled || isTranscribing) return;
    if (isListening) {
      stopListening();
    } else {
      void startListening();
    }
  }, [disabled, isListening, isTranscribing, startListening, stopListening]);

  const clearError = useCallback(() => setMicError(null), []);

  return {
    isListening,
    isTranscribing,
    liveTranscript,
    micError,
    startListening,
    stopListening,
    toggleListening,
    clearError,
    cancelAll: cleanupAll,
  };
}
