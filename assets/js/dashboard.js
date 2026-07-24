import { requireAuth } from "./auth.js";
import { loadClients } from "./clients-data.js";
import { money, setupClock, setupShell, STATUSES, titleCase } from "./ui.js";

const user = requireAuth();

setupShell();
setupClock();

let clients = [];

if (user) {
  clients = await loadClients();

  document.getElementById("welcomeTitle").textContent =
    `Welcome, ${user.fullName.split(" ")[0]}`;


  const totalValue = clients.reduce(
    (sum, client) => sum + Number(client.value || 0),
    0
  );


  const wonValue = clients
    .filter((client) => client.status === "won")
    .reduce((sum, client) => sum + Number(client.value || 0), 0);


  const stats = [
    ["Total clients", clients.length],
    [
      "Open deals",
      clients.filter(
        (client) => !["won", "lost"].includes(client.status)
      ).length
    ],
    ["Won revenue", money(wonValue)],
    ["Pipeline value", money(totalValue)]
  ];


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



const maxCount = Math.max(
  ...STATUSES.map(
    (status) =>
      clients.filter((client) => client.status === status).length
  ),
  1
);


document.getElementById("pipelineBars").innerHTML =
  STATUSES.map((status) => {

    const count = clients.filter(
      (client) => client.status === status
    ).length;


    const width = Math.max(
      (count / maxCount) * 100,
      count ? 12 : 0
    );


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



document.getElementById("recentClients").innerHTML =
  clients
    .slice()
    .sort(
      (a,b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0,5)
    .map(
      (client)=>
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