type HapticPattern = "light" | "success" | "warning";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 12,
  success: [16, 24, 16],
  warning: [28, 30, 28],
};

export function triggerHaptic(pattern: HapticPattern = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  navigator.vibrate(patterns[pattern]);
}
