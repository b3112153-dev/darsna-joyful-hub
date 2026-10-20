const KEY = "dj-device-id";

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
    return id;
  } catch {
    return "no-storage";
  }
}

/** Simple, non-identifying browser fingerprint used only for device bans. */
export async function getFingerprint() {
  const parts = [
    navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.hardwareConcurrency ?? 0,
  ].join("|");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deviceIds() {
  return { _device_id: getDeviceId(), _fingerprint: await getFingerprint() };
}
