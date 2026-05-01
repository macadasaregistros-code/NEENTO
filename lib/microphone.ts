"use client";

let sharedMicrophoneStream: MediaStream | null = null;
let pendingMicrophoneStream: Promise<MediaStream> | null = null;
let hasPagehideListener = false;

function isStreamLive(stream: MediaStream | null): stream is MediaStream {
  return Boolean(
    stream?.getAudioTracks().some((track) => track.readyState === "live"),
  );
}

function registerPagehideCleanup() {
  if (hasPagehideListener || typeof window === "undefined") {
    return;
  }

  hasPagehideListener = true;
  window.addEventListener("pagehide", () => {
    releaseSharedMicrophoneStream();
  });
}

export async function getSharedMicrophoneStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not available.");
  }

  registerPagehideCleanup();

  if (isStreamLive(sharedMicrophoneStream)) {
    return sharedMicrophoneStream;
  }

  if (pendingMicrophoneStream) {
    return pendingMicrophoneStream;
  }

  pendingMicrophoneStream = navigator.mediaDevices
    .getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    .then((stream) => {
      sharedMicrophoneStream = stream;
      pendingMicrophoneStream = null;
      return stream;
    })
    .catch((error) => {
      pendingMicrophoneStream = null;
      throw error;
    });

  return pendingMicrophoneStream;
}

export function releaseSharedMicrophoneStream() {
  sharedMicrophoneStream?.getTracks().forEach((track) => track.stop());
  sharedMicrophoneStream = null;
  pendingMicrophoneStream = null;
}
