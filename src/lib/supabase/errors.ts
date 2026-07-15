export const supabaseUnavailableMessage =
  "No se pudo conectar con Supabase. Revisa que el proyecto siga activo y que la URL este correcta.";

const defaultAuthTimeoutMs = 2500;

const networkErrorPatterns = [
  "failed to fetch",
  "fetch failed",
  "getaddrinfo",
  "enotfound",
  "name_not_resolved",
];

export function getSupabaseAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      networkErrorPatterns.some((pattern) =>
        normalizedMessage.includes(pattern),
      )
    ) {
      return supabaseUnavailableMessage;
    }

    return error.message;
  }

  return supabaseUnavailableMessage;
}

export async function withSupabaseAuthTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs = defaultAuthTimeoutMs,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(supabaseUnavailableMessage));
    }, timeoutMs);
  });

  try {
    return (await Promise.race([Promise.resolve(operation), timeout])) as T;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
