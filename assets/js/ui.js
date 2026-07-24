import { clearSession, KEYS } from "./storage.js";

export const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

export function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function showFieldError(id, message) {
  const input = document.getElementById(id);
  const error = document.querySelector(`[data-error-for="${id}"]`);
  if (error) error.textContent = message || "";
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

export function clearErrors(ids) {
  ids.forEach((id) => showFieldError(id, ""));
}

export function toast(message) {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  host.append(item);
  setTimeout(() => item.remove(), 3000);
}

export function applyTheme() {
  const theme = localStorage.getItem(KEYS.theme) || "light";
  document.documentElement.dataset.theme = theme;
}

export function setupShell() {
  applyTheme();
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEYS.theme, current);
    applyTheme();
  });
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });
}

export function setupClock(elementId = "liveClock") {
  const clock = document.getElementById(elementId);
  if (!clock) return;
  const render = () => {
    clock.textContent = new Date().toLocaleTimeString();
  };
  render();
  setInterval(render, 1000);
}
