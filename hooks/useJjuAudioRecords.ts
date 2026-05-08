"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJjuAudioRecords, type JjuCardAudioRecord } from "@/lib/jju-audio";

export function useJjuAudioRecords() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<JjuCardAudioRecord[]>([]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const nextRecords = await fetchJjuAudioRecords();

    setRecords(nextRecords);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordsByCardId = useMemo(
    () => new Map(records.map((record) => [record.cardId, record])),
    [records],
  );

  return {
    isLoading,
    records,
    recordsByCardId,
    refresh,
  };
}
