// Import storage tools for session clearing and keys
import { clearSession, KEYS } from "./storage.js";

// Array of allowed client statuses
export const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

// Capitalize first letter of a string
export function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Format number as USD currency string
export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

// Display error message for a specific input field
export function showFieldError(id, message) {
  const input = document.getElementById(id);
  const error = document.querySelector(`[data-error-for="${id}"]`);

  // Set error message text if element exists
  if (error) error.textContent = message || "";

  // Update input accessibility attribute if input exists
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

// Clear error messages for given array of input IDs
export function clearErrors(ids) {
  ids.forEach((id) => showFieldError(id, ""));
}

// Show temporal toast notification message
export function toast(message) {
  const host = document.getElementById("toastHost");

  // Stop if toast container is missing
  if (!host) return;

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  host.append(item);

  // Remove toast notification after 3 seconds
  setTimeout(() => item.remove(), 3000);
}

// Apply dark or light theme to the root element
export function applyTheme() {
  const theme = localStorage.getItem(KEYS.theme) || "light";
  document.documentElement.dataset.theme = theme;
}

// Setup theme switcher and logout button event handlers
export function setupShell() {
  applyTheme();

  // Add theme toggle click event listener if button exists
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEYS.theme, current);
    applyTheme();
  });

  // Add logout button click event listener if button exists
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });
}

// Setup real-time live clock updater
export function setupClock(elementId = "liveClock") {
  const clock = document.getElementById(elementId);

  // Stop if clock element does not exist
  if (!clock) return;

  // Render current time string
  const render = () => {
    clock.textContent = new Date().toLocaleTimeString();
  };

  render();

  // Update time every second
  setInterval(render, 1000);
}