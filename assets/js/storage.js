// Storage keys for localStorage and sessionStorage
export const KEYS = {
  users: "crm_users",
  session: "crm_session",
  clients: "crm_clients",
  theme: "crm_theme",
};

// Read and parse JSON from localStorage, return fallback on error
export function readJson(key, fallback) {
  try {
    // Return parsed data or fallback if null
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    // Return fallback if JSON parsing fails
    return fallback;
  }
}

// Convert value to JSON and save to localStorage
export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Get all users from storage
export const getUsers = () => readJson(KEYS.users, []);

// Save updated users list to storage
export const saveUsers = (users) => writeJson(KEYS.users, users);

// Get current session from localStorage or sessionStorage
export function getSession() {
  // Check local storage first
  const localSession = readJson(KEYS.session, null);
  
  // Return session if found in localStorage
  if (localSession) return localSession;

  // Check session storage if not in localStorage
  try {
    return JSON.parse(sessionStorage.getItem(KEYS.session));
  } catch {
    // Return null if session storage parsing fails
    return null;
  }
}

// Save user session in localStorage or sessionStorage
export function saveSession(session, remember = true) {
  // Choose main and secondary storage based on remember flag
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  // Save to selected storage
  storage.setItem(KEYS.session, JSON.stringify(session));

  // Remove from other storage to avoid duplication
  otherStorage.removeItem(KEYS.session);
}

// Clear user session from both storages
export const clearSession = () => {
  localStorage.removeItem(KEYS.session);
  sessionStorage.removeItem(KEYS.session);
};

// Get clients list from storage
export const getClients = () => readJson(KEYS.clients, []);

// Save clients list to storage
export const saveClients = (clients) => writeJson(KEYS.clients, clients);

// Reset demo clients data in storage
export function resetDemoData() {
  localStorage.removeItem(KEYS.clients);
}