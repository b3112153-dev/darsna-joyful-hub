export const REQUEST_TIMEOUT_MS = 15000;

export async function withTimeout<T>(promise: PromiseLike<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(t("تعذر الاتصال؛ حاول مرة ثانية."))), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function readData<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const result = await withTimeout(request);
  if (result.error) throw result.error;
  return result.data;
}

export function identityChanged(previous: string | null | undefined, next: string | null) {
  return previous !== undefined && previous !== next;
}