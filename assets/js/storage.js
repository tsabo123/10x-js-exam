export const KEYS = {
  users: "crm_users",
  session: "crm_session",
  clients: "crm_clients",
  theme: "crm_theme",
};

export function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const getUsers = () => readJson(KEYS.users, []);
export const saveUsers = (users) => writeJson(KEYS.users, users);

export function getSession() {
  const localSession = readJson(KEYS.session, null);
  if (localSession) return localSession;

  try {
    return JSON.parse(sessionStorage.getItem(KEYS.session));
  } catch {
    return null;
  }
}

export function saveSession(session, remember = true) {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  storage.setItem(KEYS.session, JSON.stringify(session));
  otherStorage.removeItem(KEYS.session);
}

export const clearSession = () => {
  localStorage.removeItem(KEYS.session);
  sessionStorage.removeItem(KEYS.session);
};

export const getClients = () => readJson(KEYS.clients, []);
export const saveClients = (clients) => writeJson(KEYS.clients, clients);

export function resetClientsData() {
  localStorage.removeItem(KEYS.clients);
}