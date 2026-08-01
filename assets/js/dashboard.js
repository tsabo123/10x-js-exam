// Import authentication, data loader, and UI helper functions
import { requireAuth } from "./auth.js";
import { loadClients } from "./clients-data.js";
import { money, setupClock, setupShell, STATUSES, titleCase } from "./ui.js";

// Check if the user is logged in (redirects to login page if not)
const user = requireAuth();

// Initialize sidebar navigation and header clock
setupShell();
setupClock();

// Array to store all client data
let clients = [];

// If user is authenticated, load data and render dashboard stats
if (user) {
  // Load client list from storage or API
  clients = await loadClients();

  // Show welcome message with the user's first name
  document.getElementById("welcomeTitle").textContent =
    `Welcome, ${user.fullName.split(" ")[0]}`;

  // Calculate total value of all deals in the pipeline
  const totalValue = clients.reduce(
    (sum, client) => sum + Number(client.value || 0),
    0
  );

  // Calculate total value of deals marked as "won"
  const wonValue = clients
    .filter((client) => client.status === "won")
    .reduce((sum, client) => sum + Number(client.value || 0), 0);

  // Prepare stats data array
  const stats = [
    ["Total clients", clients.length], // Total number of clients
    [
      "Open deals", // Active deals (excluding won and lost)
      clients.filter(
        (client) => !["won", "lost"].includes(client.status)
      ).length
    ],
    ["Won revenue", money(wonValue)], // Formatted won revenue
    ["Pipeline value", money(totalValue)] // Formatted total pipeline value
  ];

  // Render stat cards into HTML
  document.getElementById("statsGrid").innerHTML = stats
    .map(
      ([label, value]) =>
        `<article class="stat-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </article>`
    )
    .join("");
}

// Find maximum client count among all statuses for bar width calculation
const maxCount = Math.max(
  ...STATUSES.map(
    (status) =>
      clients.filter((client) => client.status === status).length
  ),
  1 // Minimum 1 to avoid division by zero
);

// Render visual progress bars for each pipeline status
document.getElementById("pipelineBars").innerHTML =
  STATUSES.map((status) => {
    // Count clients in this specific status
    const count = clients.filter(
      (client) => client.status === status
    ).length;

    // Calculate bar width percentage (minimum 12% if count > 0)
    const width = Math.max(
      (count / maxCount) * 100,
      count ? 12 : 0
    );

    // Return HTML row for each status
    return `
      <div class="bar-row">
        <strong>${titleCase(status)}</strong>

        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>

        <span>${count}</span>
      </div>
    `;

  }).join("");

// Render the top 5 most recently created clients
document.getElementById("recentClients").innerHTML =
  clients
    .slice() // Make a copy to avoid mutating original array
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt) // Sort by date (newest first)
    )
    .slice(0, 5) // Take only the first 5 clients
    .map(
      (client) =>
        `
        <article class="client-mini">
          <strong>${client.name}</strong>
          <p>
            ${client.company} · 
            ${titleCase(client.status)} · 
            ${money(client.value)}
          </p>
        </article>
        `
    )
    .join("");