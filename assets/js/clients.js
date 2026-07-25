import { requireAuth, isEmail } from "./auth.js";
import { loadClients, removeClient, upsertClient } from "./clients-data.js";
import { getClients, saveClients } from "./storage.js";
import { clearErrors, money, setupShell, showFieldError, STATUSES, titleCase, toast } from "./ui.js";

const user = requireAuth();
setupShell();

let clients = [];
let selectedClientId = null;
let callInterval = null;
let callSeconds = 0;
const reminderTimers = new Map();

const table = document.getElementById("clientsTable");
const state = document.getElementById("clientState");
const modal = document.getElementById("clientModal");
const detailsModal = document.getElementById("detailsModal");

if (user) {
  clients = await loadClients();
  scheduleSavedReminders();
  renderChips();
  renderClients();
}

document.getElementById("searchInput").addEventListener("input", renderClients);
document.getElementById("statusFilter").addEventListener("change", renderClients);
document.getElementById("sortSelect").addEventListener("change", renderClients);
document.getElementById("openClientModal").addEventListener("click", () => openClientForm());
document.getElementById("closeClientModal").addEventListener("click", () => modal.close());
document.getElementById("cancelClientForm").addEventListener("click", () => modal.close());
document.getElementById("closeDetailsModal").addEventListener("click", () => closeDetails());
document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);

document.getElementById("clientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const ids = ["clientName", "clientEmail", "clientPhone", "clientCompany", "clientCity", "clientValue"];
  clearErrors(ids);

 const name = document.getElementById("clientName").value.trim();
  const email = document.getElementById("clientEmail").value.trim();
  const phone = document.getElementById("clientPhone").value.trim();
  const company = document.getElementById("clientCompany").value.trim();
  const city = document.getElementById("clientCity").value.trim();
  const value = Number(document.getElementById("clientValue").value);
  let valid = true;
  if (name.length < 2) {
    showFieldError("clientName", "Name is required.");
    valid = false;
  }
  if (!isEmail(email)) {
  showFieldError("clientEmail", "Valid email is required.");
  valid = false;
  }
  if (phone.length < 5) {
    showFieldError("clientPhone", "Phone is required.");
    valid = false;
  }
  if (company.length < 2) {
    showFieldError("clientCompany", "Company is required.");
    valid = false;
  }
  if (city.length < 2) {
    showFieldError("clientCity", "City is required.");
    valid = false;
  }
  if (Number.isNaN(value) || value < 0) {
    showFieldError("clientValue", "Value must be zero or higher.");
    valid = false;
  }
  if (!valid) return;

  const id = document.getElementById("clientId").value || crypto.randomUUID();
  const previous = clients.find((client) => client.id === id);
  const client = {
  id,
  name,
  email,
  phone,
  company,
  city,
  value,
  status: document.getElementById("clientStatus").value,
  createdAt: previous?.createdAt || new Date().toISOString(),
  notes: previous?.notes || [],
  reminders: previous?.reminders || []
};

  try {
    clients = await upsertClient(client, Boolean(previous));
    modal.close();
    renderClients();
    toast(previous ? "Client updated." : "Client added.");
  } catch {
    clients = upsertClientLocal(client);
    modal.close();
    renderClients();
    toast(previous ? "API failed. Client updated locally." : "API failed. Client added locally.");
  }
});

document.getElementById("noteForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const noteText = document.getElementById("noteText");
  const text = noteText.value.trim();
  if (!text || !selectedClientId) return;
  clients = clients.map((client) =>
    client.id === selectedClientId
      ? { ...client, notes: [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }, ...client.notes] }
      : client
  );
  saveClients(clients);
  noteText.value = "";
  renderDetails(selectedClientId);
  toast("Note added.");
});

document.getElementById("reminderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const textInput = document.getElementById("reminderText");
  const timeInput = document.getElementById("reminderTime");
  const text = textInput.value.trim();
  const dueAt = new Date(timeInput.value).getTime();
  if (!text || !selectedClientId || Number.isNaN(dueAt) || dueAt <= Date.now()) {
    toast("Choose a future reminder time.");
    return;
  }
  const reminder = { id: crypto.randomUUID(), text, dueAt, done: false };
  clients = clients.map((client) =>
    client.id === selectedClientId ? { ...client, reminders: [reminder, ...(client.reminders || [])] } : client
  );
  saveClients(clients);
  scheduleReminder(selectedClientId, reminder);
  textInput.value = "";
  timeInput.value = "";
  renderDetails(selectedClientId);
  toast("Reminder scheduled.");
});

document.getElementById("callToggle").addEventListener("click", () => {
  if (callInterval) {
    clearInterval(callInterval);
    callInterval = null;
    document.getElementById("callToggle").textContent = "Start call";
    const client = clients.find((item) => item.id === selectedClientId);
    if (client && callSeconds > 0) {
      client.notes.unshift({ id: crypto.randomUUID(), text: `Call duration ${formatTimer(callSeconds)}`, createdAt: new Date().toISOString() });
      saveClients(clients);
      renderDetails(selectedClientId);
    }
    callSeconds = 0;
    document.getElementById("callTimer").textContent = "00:00";
    return;
  }
  callSeconds = 0;
  document.getElementById("callToggle").textContent = "End call";
  callInterval = setInterval(() => {
    callSeconds += 1;
    document.getElementById("callTimer").textContent = formatTimer(callSeconds);
  }, 1000);
});

function getVisibleClients() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const sort = document.getElementById("sortSelect").value;
  let visible = clients.filter((client) => {
    const haystack = [client.name, client.email, client.company, client.city].join(" ").toLowerCase();
    return haystack.includes(query) && (status === "all" || client.status === status);
  });

  if (sort === "name") visible = visible.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "value") visible = visible.sort((a, b) => b.value - a.value);
  if (sort === "newest") visible = visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return visible;
}


function renderClients() {
  const visible = getVisibleClients();
  console.log(visible);

  state.textContent = visible.length
    ? `${visible.length} client(s) shown`
    : "No clients match the current filters.";

  table.innerHTML = visible
    .map(
      (client) => `<tr>
        <td>
          <strong>${client.name}</strong><br>
          <small>${client.email}</small>
        </td>
        <td>${client.company}</td>
        <td>
          <button class="status" data-action="cycle" data-id="${client.id}">
            ${titleCase(client.status)}
          </button>
        </td>
        <td>${money(client.value)}</td>
        <td>${client.city}</td>
        <td>
          <div class="row-actions">
            <button class="ghost-btn" data-action="details" data-id="${client.id}">
              Details
            </button>
            <button class="ghost-btn" data-action="edit" data-id="${client.id}">
              Edit
            </button>
            <button class="ghost-btn danger" data-action="delete" data-id="${client.id}">
              Delete
            </button>
          </div>
        </td>
      </tr>`
    )
    .join("");
}

table.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;
  if (action === "delete" && confirm("Delete this client?")) {
    try {
      clients = await removeClient(id);
      clearReminderTimers(id);
      renderClients();
      toast("Client deleted.");
    } catch {
      clients = removeClientLocal(id);
      clearReminderTimers(id);
      renderClients();
      toast("API failed. Client deleted locally.");
    }
  }
  if (action === "edit") openClientForm(clients.find((client) => client.id === id));
  if (action === "details") renderDetails(id);
  if (action === "cycle") cycleStatus(id);
});

function renderChips() {
  document.getElementById("statusChips").innerHTML = ["all", ...STATUSES]
    .map((status) => `<button class="chip ${status === "all" ? "active" : ""}" data-status="${status}">${titleCase(status)}</button>`)
    .join("");
  document.getElementById("statusChips").addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) return;
    document.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById("statusFilter").value = button.dataset.status;
    renderClients();
  });
}

function openClientForm(client = null) {
  document.getElementById("clientModalTitle").textContent = client ? "Edit client" : "Add client";
  document.getElementById("clientId").value = client?.id || "";
  document.getElementById("clientName").value = client?.name || "";
  document.getElementById("clientEmail").value = client?.email || "";
  document.getElementById("clientPhone").value = client?.phone || "";
  document.getElementById("clientCompany").value = client?.company || "";
  document.getElementById("clientCity").value = client?.city || "";
  document.getElementById("clientValue").value = client?.value || "";
  document.getElementById("clientStatus").value = client?.status || "new";
  modal.showModal();
}

function cycleStatus(id) {
  clients = clients.map((client) => {
    if (client.id !== id) return client;
    const nextStatus = STATUSES[(STATUSES.indexOf(client.status) + 1) % STATUSES.length];
    return { ...client, status: nextStatus };
  });
  saveClients(clients);
  renderClients();
}

function renderDetails(id) {
  selectedClientId = id;
  const client = clients.find((item) => item.id === id);
  if (!client) return;
  document.getElementById("detailsTitle").textContent = client.name;
  document.getElementById("detailsBody").innerHTML = `
    <div class="details-list">
      <div class="detail-card"><strong>${client.company}</strong><p>${client.email} · ${client.phone}</p><p>${client.city} · ${titleCase(client.status)} · ${money(client.value)}</p></div>
      ${(client.reminders || []).map((reminder) => `<div class="detail-card"><strong>Reminder</strong><p>${reminder.text}</p><small>${new Date(reminder.dueAt).toLocaleString()}</small></div>`).join("") || "<p>No reminders yet.</p>"}
      ${(client.notes || []).map((note) => `<div class="detail-card"><p>${note.text}</p><small>${new Date(note.createdAt).toLocaleString()}</small></div>`).join("") || "<p>No notes yet.</p>"}
    </div>
  `;
  detailsModal.showModal();
}

function closeDetails() {
  if (callInterval) clearInterval(callInterval);
  callInterval = null;
  selectedClientId = null;
  detailsModal.close();
}

function formatTimer(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function exportCsv() {
  const header = "Name,Email,Phone,Company,City,Status,Value";
  const rows = getVisibleClients().map((client) =>
    [client.name, client.email, client.phone, client.company, client.city, client.status, client.value].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "10x-crm-clients.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function upsertClientLocal(client) {
  const exists = clients.some((item) => item.id === client.id);
  const next = exists ? clients.map((item) => (item.id === client.id ? client : item)) : [client, ...clients];
  saveClients(next);
  return next;
}

function removeClientLocal(id) {
  const next = clients.filter((client) => client.id !== id);
  saveClients(next);
  return next;
}

function scheduleReminder(clientId, reminder) {
  const delay = reminder.dueAt - Date.now();
  if (delay <= 0) return;
  const timerId = setTimeout(() => {
    const client = (getClients() || []).find((item) => item.id === clientId);
    toast(`Reminder: ${client?.name || "Client"} - ${reminder.text}`);
  }, Math.min(delay, 2147483647));
  reminderTimers.set(`${clientId}:${reminder.id}`, timerId);
}

function scheduleSavedReminders() {
  clients.forEach((client) => {
    (client.reminders || []).forEach((reminder) => scheduleReminder(client.id, reminder));
  });
}

function clearReminderTimers(clientId) {
  reminderTimers.forEach((timerId, key) => {
    if (key.startsWith(`${clientId}:`)) {
      clearTimeout(timerId);
      reminderTimers.delete(key);
    }
  });
}
