// Persistencia mock en localStorage, sin versionar (igual que reference/templates/app.jsx)

const USER_KEY = "av_user";

export type StoredUser = { name: string };

// Cache + suscripción para exponer av_user como un external store
// (useSyncExternalStore), evitando leer localStorage directamente en un
// efecto de render (lo que dispara cascading renders).
let cachedRaw: string | null = null;
let cachedUser: StoredUser | null = null;
const userListeners = new Set<() => void>();

function readUserFromStorage(): StoredUser | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;
  try {
    cachedUser = raw ? JSON.parse(raw) : null;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

export function subscribeUser(callback: () => void): () => void {
  userListeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    userListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getUserSnapshot(): StoredUser | null {
  return readUserFromStorage();
}

export function getServerUserSnapshot(): StoredUser | null {
  return null;
}

export function setStoredUser(user: StoredUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  } catch {
    // localStorage no disponible (navegación privada, etc.): la sesión no persiste.
  }
  cachedRaw = null; // fuerza a releer en la próxima snapshot
  userListeners.forEach((l) => l());
}

export function clearStoredUser(): void {
  setStoredUser(null);
}
