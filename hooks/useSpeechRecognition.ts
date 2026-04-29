"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { sanitizeRomajiTranscript, type SpeechAlternative } from "@/lib/oral";

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

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const [alternatives, setAlternatives] = useState<SpeechAlternative[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

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
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      setError(`No se pudo escuchar: ${event.error}`);
      setIsListening(false);
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
      setTranscript(sanitizeRomajiTranscript(nextTranscript));
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
  }, []);

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
