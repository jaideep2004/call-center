import { showToast } from "./use-toast";

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok && options?.method && options.method !== "GET") {
      const body = await res.json().catch(() => ({}));
      showToast(body.message || `Request failed (${res.status})`, "error");
    } else if (res.ok && options?.method && options.method !== "GET") {
      const body = await res.clone().json().catch(() => ({}));
      if (body.message && body.message !== "Success") {
        showToast(body.message, "success");
      }
    }
    return res;
  } catch {
    showToast("Network error. Please try again.", "error");
    throw new Error("Network error");
  }
}
