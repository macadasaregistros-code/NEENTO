"use client";

import { ArrowLeft, Check, Loader2, Mic, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { CardSourceBadge, getCardSurfaceClass } from "@/components/CardSourceBadge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useJjuAudioRecords } from "@/hooks/useJjuAudioRecords";
import { useLearningMode } from "@/hooks/useLearningMode";
import { useStudyProgress } from "@/hooks/useStudyProgress";
import { uploadJjuCardAudio } from "@/lib/jju-audio";
import { getSideContent } from "@/lib/learning";
import type { VocabularyCard } from "@/types/card";

const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

interface DraftAudio {
  blob: Blob;
  cardId: string;
  url: string;
}

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  return MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export default function JjuAudiosPage() {
  const { mode } = useLearningMode();
  const { isLoading: isProfileLoading, isOwner } = useCurrentUser();
  const { cards } = useStudyProgress();
  const { isLoading: isAudioLoading, recordsByCardId, refresh } = useJjuAudioRecords();
  const chunksRef = useRef<BlobPart[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [draftAudio, setDraftAudio] = useState<DraftAudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const isJju = mode === "ko_es";

  const jjuCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          card.learningMode === "ko_es" &&
          card.starterGroup === "jju" &&
          card.learningLanguage === "es",
      ),
    [cards],
  );
  const pendingCards = useMemo(
    () => jjuCards.filter((card) => !recordsByCardId.has(card.id)),
    [jjuCards, recordsByCardId],
  );
  const completedCards = useMemo(
    () => jjuCards.filter((card) => recordsByCardId.has(card.id)),
    [jjuCards, recordsByCardId],
  );
  const visibleCards = showCompleted ? completedCards : pendingCards;

  useEffect(
    () => () => {
      if (draftAudio?.url) {
        URL.revokeObjectURL(draftAudio.url);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [draftAudio?.url],
  );

  async function startRecording(cardId: string) {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("El navegador no tiene microfono disponible.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Este navegador no permite grabar audio.");
      return;
    }

    try {
      if (draftAudio?.url) {
        URL.revokeObjectURL(draftAudio.url);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setDraftAudio(null);
      setActiveCardId(cardId);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setDraftAudio({ blob, cardId, url });
        setActiveCardId(null);
      };

      recorder.start();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo iniciar la grabacion.",
      );
      setActiveCardId(null);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function playDraft() {
    if (!draftAudio) {
      return;
    }

    void new Audio(draftAudio.url).play();
  }

  function discardDraft() {
    if (draftAudio?.url) {
      URL.revokeObjectURL(draftAudio.url);
    }

    setDraftAudio(null);
    setError(null);
  }

  async function confirmAudio(card: VocabularyCard) {
    if (!draftAudio || draftAudio.cardId !== card.id) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await uploadJjuCardAudio(card.id, draftAudio.blob);
      discardDraft();
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo subir el audio.");
    } finally {
      setIsUploading(false);
    }
  }

  if (!isJju) {
    return (
      <PageMessage
        title="Audios solo para Jju"
        description="Cambia al modo Jju desde Home para administrar estos audios."
      />
    );
  }

  if (isProfileLoading || isAudioLoading) {
    return (
      <PageMessage
        title="Cargando audios"
        description="Estamos revisando permisos y tarjetas."
        isLoading
      />
    );
  }

  if (!isOwner) {
    return (
      <PageMessage
        title="Solo owner"
        description="Esta seccion solo esta disponible para el usuario owner."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a estadisticas"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/stats"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
            Jju owner
          </p>
          <h1 className="text-2xl font-black text-ink">Audios para Jju</h1>
        </div>
      </header>

      <section className="rounded-lg bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-500">Pendientes</p>
            <p className="text-4xl font-black leading-none text-ink">{pendingCards.length}</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-4 py-3 text-right ring-1 ring-sky-100">
            <p className="text-sm font-bold text-sky-700">Grabados</p>
            <p className="text-2xl font-black text-sky-950">{completedCards.length}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ToggleButton
            active={!showCompleted}
            label="Sin audio"
            onClick={() => setShowCompleted(false)}
          />
          <ToggleButton
            active={showCompleted}
            label="Grabados"
            onClick={() => setShowCompleted(true)}
          />
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        {visibleCards.length > 0 ? (
          visibleCards.map((card) => {
            const learningContent = getSideContent(card, "learning");
            const supportContent = getSideContent(card, "support");
            const isActive = activeCardId === card.id;
            const hasDraft = draftAudio?.cardId === card.id;

            return (
              <article
                className={`rounded-lg border p-4 shadow-sm ${getCardSurfaceClass(card)}`}
                key={card.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-ink">
                      {learningContent.text}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-500">
                      {supportContent.text}
                    </p>
                    {supportContent.reading ? (
                      <p className="mt-1 truncate text-xs font-bold text-slate-400">
                        {supportContent.reading}
                      </p>
                    ) : null}
                  </div>
                  <CardSourceBadge card={card} />
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
                  <button
                    className={`flex h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-lg transition active:scale-[0.98] ${
                      isActive ? "bg-slate-900 shadow-slate-200" : "bg-sky-600 shadow-sky-100"
                    }`}
                    disabled={Boolean(activeCardId && !isActive) || isUploading}
                    onClick={() => (isActive ? stopRecording() : void startRecording(card.id))}
                    type="button"
                  >
                    {isActive ? (
                      <>
                        <Square aria-hidden="true" size={18} />
                        Detener
                      </>
                    ) : (
                      <>
                        <Mic aria-hidden="true" size={18} />
                        Grabar
                      </>
                    )}
                  </button>

                  {recordsByCardId.has(card.id) && !hasDraft ? (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm ring-1 ring-white">
                      <Volume2 aria-hidden="true" size={20} />
                    </span>
                  ) : null}
                </div>

                {hasDraft ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      className="flex h-11 items-center justify-center gap-1 rounded-lg bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 transition active:scale-[0.98]"
                      onClick={playDraft}
                      type="button"
                    >
                      <Play aria-hidden="true" size={16} />
                      Oir
                    </button>
                    <button
                      className="flex h-11 items-center justify-center gap-1 rounded-lg bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 transition active:scale-[0.98]"
                      onClick={discardDraft}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={16} />
                      Repetir
                    </button>
                    <button
                      className="flex h-11 items-center justify-center gap-1 rounded-lg bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 transition active:scale-[0.98] disabled:opacity-70"
                      disabled={isUploading}
                      onClick={() => void confirmAudio(card)}
                      type="button"
                    >
                      {isUploading ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                      ) : (
                        <Check aria-hidden="true" size={16} />
                      )}
                      OK
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="rounded-lg bg-white p-4 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-100">
            {showCompleted
              ? "Todavia no hay audios grabados."
              : "Todas las tarjetas Jju ya tienen audio."}
          </p>
        )}
      </section>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-11 rounded-lg text-sm font-black transition active:scale-[0.98] ${
        active ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PageMessage({
  description,
  isLoading = false,
  title,
}: {
  description: string;
  isLoading?: boolean;
  title: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center justify-between pt-2">
        <Link
          aria-label="Volver a estadisticas"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ink shadow-sm ring-1 ring-slate-200"
          href="/stats"
        >
          <ArrowLeft aria-hidden="true" size={21} />
        </Link>
      </header>
      <section className="rounded-lg bg-white p-5 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          {isLoading ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={24} />
          ) : (
            <Volume2 aria-hidden="true" size={24} />
          )}
        </div>
        <h1 className="mt-4 text-2xl font-black text-ink">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </section>
    </div>
  );
}
