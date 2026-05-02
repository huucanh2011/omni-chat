import type { Platform } from "./types";

export const platformOptions = [
  { value: "telegram", label: "Telegram" },
  { value: "zalo", label: "Zalo" },
  { value: "teams", label: "Teams" }
] as const;

export const defaultServiceUrl: Record<Platform, string> = {
  telegram: "https://web.telegram.org/",
  zalo: "https://chat.zalo.me/",
  teams: "https://teams.microsoft.com/v2/"
};

export function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeServiceUrl(platform: Platform, url: string): string {
  const raw = url.trim();
  if (!raw) return defaultServiceUrl[platform];
  if (platform !== "teams") return raw;
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("teams.microsoft.com")) return raw;
    if (parsed.pathname.startsWith("/v2")) return parsed.toString();
    return defaultServiceUrl.teams;
  } catch {
    return defaultServiceUrl.teams;
  }
}

export function shortName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

export function platformChip(platform: Platform): string {
  if (platform === "telegram") return "TG";
  if (platform === "zalo") return "ZA";
  return "TM";
}
