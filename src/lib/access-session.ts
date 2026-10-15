import type { AccessProfile } from "@/queries/passcode-access";

const ACCESS_PROFILE_KEY = "unime.access-profile.v2";
const LEGACY_ACCESS_PROFILE_KEY = "unime.access-profile.v1";
let activeAccessProfile: AccessProfile | null = null;

function isAccessProfile(value: unknown): value is AccessProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<AccessProfile>;
  return profile.accessLevel === "Nationwide" || profile.accessLevel === "AMM" || profile.accessLevel === "Supervisor";
}

function read(storage: Storage): AccessProfile | null {
  const raw = storage.getItem(ACCESS_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAccessProfile(parsed) ? parsed : null;
  } catch {
    storage.removeItem(ACCESS_PROFILE_KEY);
    return null;
  }
}

export function restoreAccessProfile(): AccessProfile | null {
  activeAccessProfile = read(window.sessionStorage) ?? read(window.localStorage);
  return activeAccessProfile;
}

export function setAccessProfile(profile: AccessProfile, remember: boolean): void {
  activeAccessProfile = profile;
  window.sessionStorage.removeItem(LEGACY_ACCESS_PROFILE_KEY);
  window.localStorage.removeItem(LEGACY_ACCESS_PROFILE_KEY);
  const serialized = JSON.stringify(profile);
  window.sessionStorage.setItem(ACCESS_PROFILE_KEY, serialized);
  if (remember) window.localStorage.setItem(ACCESS_PROFILE_KEY, serialized);
  else window.localStorage.removeItem(ACCESS_PROFILE_KEY);
}

export function clearAccessProfile(): void {
  activeAccessProfile = null;
  window.sessionStorage.removeItem(ACCESS_PROFILE_KEY);
  window.localStorage.removeItem(ACCESS_PROFILE_KEY);
  window.sessionStorage.removeItem(LEGACY_ACCESS_PROFILE_KEY);
  window.localStorage.removeItem(LEGACY_ACCESS_PROFILE_KEY);
}

export function getAccessProfile(): AccessProfile | null {
  return activeAccessProfile;
}
