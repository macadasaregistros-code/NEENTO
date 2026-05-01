"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  romanizeJapaneseTranscript,
  sanitizeRomajiTranscript,
  type SpeechAlternative,
} from "@/lib/oral";

interface BrowserSpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  abort: () => void;
  start: () => void;
  stop: () => void;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type BrowserAudioContextConstructor = new () => AudioContext;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitAudioContext?: BrowserAudioContextConstructor;
  }
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.AudioContext ?? window.webkitAudioContext;
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [alternatives, setAlternatives] = useState<SpeechAlternative[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);

  const stopAudioMeter = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current?.state !== "closed") {
      void audioContextRef.current?.close();
    }

    audioContextRef.current = null;
    setAudioLevel(0);
  }, []);

  const startAudioMeter = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    stopAudioMeter();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextConstructor = getAudioContextConstructor();

      if (!AudioContextConstructor) {
        mediaStreamRef.current = stream;
        return;
      }

      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      const samples = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;

      const tick = () => {
        analyser.getByteTimeDomainData(samples);

        let sum = 0;

        samples.forEach((sample) => {
          const centered = (sample - 128) / 128;
          sum += centered * centered;
        });

        const rms = Math.sqrt(sum / samples.length);
        const nextLevel = Math.min(1, rms * 5);

        setAudioLevel((currentLevel) => currentLevel * 0.55 + nextLevel * 0.45);
        animationFrameRef.current = window.requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setAudioLevel(0);
    }
  }, [stopAudioMeter]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      recognitionRef.current?.abort();
      stopAudioMeter();
    };
  }, [stopAudioMeter]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopAudioMeter();
    setIsListening(false);
  }, [stopAudioMeter]);

  const startListening = useCallback((lang = "ja-JP") => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionConstructor) {
      setError("El navegador no soporta reconocimiento de voz.");
      setIsSupported(false);
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionConstructor();

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
      void startAudioMeter();
    };
    recognition.onend = () => {
      setIsListening(false);
      stopAudioMeter();
    };
    recognition.onerror = (event) => {
      setError(`No se pudo escuchar: ${event.error}`);
      setIsListening(false);
      stopAudioMeter();
    };
    recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      const nextAlternatives = latestResult
        ? Array.from(latestResult).map((alternative) => ({
            confidence: alternative.confidence,
            transcript: alternative.transcript,
          }))
        : [];
      const nextTranscript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      setRawTranscript(nextTranscript);
      setTranscript(
        lang.startsWith("ja")
          ? romanizeJapaneseTranscript(nextTranscript)
          : sanitizeRomajiTranscript(nextTranscript),
      );
      setAlternatives(nextAlternatives);
      setConfidence(nextAlternatives[0]?.confidence ?? 0);
      setIsFinal(Boolean(latestResult?.isFinal));
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setRawTranscript("");
    setAlternatives([]);
    setConfidence(0);
    setIsFinal(false);
    recognition.start();
  }, [startAudioMeter, stopAudioMeter]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setRawTranscript("");
    setAlternatives([]);
    setConfidence(0);
    setError(null);
    setIsFinal(false);
  }, []);

  return {
    alternatives,
    audioLevel,
    confidence,
    error,
    isFinal,
    isListening,
    isSupported,
    rawTranscript,
    resetTranscript,
    startListening,
    stopListening,
    transcript,
  };
}
