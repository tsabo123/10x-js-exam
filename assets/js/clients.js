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

// Handle client form submission (Add or Edit client)

document.getElementById("clientForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const ids = ["clientName", "clientEmail", "clientPhone", "clientCompany", "clientCity", "clientValue"];
  clearErrors(ids);
// Get and clean input values from the form
 const name = document.getElementById("clientName").value.trim();
  const email = document.getElementById("clientEmail").value.trim();
  const phone = document.getElementById("clientPhone").value.trim();
  const company = document.getElementById("clientCompany").value.trim();
  const city = document.getElementById("clientCity").value.trim();
  const value = Number(document.getElementById("clientValue").value);
  let valid = true;
  // Form validations
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
  // Stop if any validation fails
  if (!valid) return;
// Get existing ID for edit, or generate a new UUID for add
  const id = document.getElementById("clientId").value || crypto.randomUUID();
  const previous = clients.find((client) => client.id === id);
  // Create the final client object
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
 // Save client to API and localStorage
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
// Handle note form submission (Add a comment/note to a client)
document.getElementById("noteForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const noteText = document.getElementById("noteText");
  const text = noteText.value.trim();
// Stop if note text is empty or no client is selected
  if (!text || !selectedClientId) return; 
  // Add the new note to the top of the selected client's notes list
  clients = clients.map((client) =>
    client.id === selectedClientId
      ? { ...client, notes: [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }, ...client.notes] }
      : client
  );
  // Save updated clients list, clear input, and refresh view
  saveClients(clients);
  noteText.value = "";
  renderDetails(selectedClientId);
  toast("Note added.");
});

// Handle reminder form submission (Add a dynamic reminder timer)
document.getElementById("reminderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  // Get input elements and their values
  const textInput = document.getElementById("reminderText");
  const timeInput = document.getElementById("reminderTime");
  const text = textInput.value.trim();
  const dueAt = new Date(timeInput.value).getTime();

  // // Validation: Check if inputs are valid and the selected time is in the future შემოწმება: დრო მითითებული უნდა იყოს და იყოს მომავალში
  if (!text || !selectedClientId || Number.isNaN(dueAt) || dueAt <= Date.now()) {
    toast("Choose a future reminder time.");
    return;
  }

  // Create a new reminder object with a unique ID
  const reminder = { id: crypto.randomUUID(), text, dueAt, done: false };

  // // Attach the reminder to the selected client and save to localStorage კლიენტთან შეხსენების მიბმა და შენახვა
  clients = clients.map((client) =>
    client.id === selectedClientId ? { ...client, reminders: [reminder, ...(client.reminders || [])] } : client
  );
  saveClients(clients);

  //  // Start the timer for the specified reminder time ტაიმერის ჩართვა მითითებულ დროზე
  scheduleReminder(selectedClientId, reminder);
    // Clear the input fields and refresh the details view
  textInput.value = "";
  timeInput.value = "";
  renderDetails(selectedClientId);
   // Show a success notification
  toast("Reminder scheduled for the specified time!");
});
// Handle start/end call button clicks (Click Event)
document.getElementById("callToggle").addEventListener("click", () => { 
  
  // If a call is already active, end the call
  if (callInterval) { 
    clearInterval(callInterval); // Stop the interval timer
    callInterval = null;         // Reset interval variable to null
    document.getElementById("callToggle").textContent = "Start call"; // Change button text back
    
    // Find the client we are currently talking to
    const client = clients.find((item) => item.id === selectedClientId); 
    
    // If the client exists and the call lasted more than 0 seconds
    if (client && callSeconds > 0) { 
      // Add call duration note to the top (unshift) of the client's notes array
      client.notes.unshift({ 
        id: crypto.randomUUID(), // Generate a unique ID for the note
        text: `Call duration ${formatTimer(callSeconds)}`, // Format seconds to 00:00
        createdAt: new Date().toISOString() // Save the exact end time of the call
      }); 
      saveClients(clients); // Save updated clients array to localStorage
      renderDetails(selectedClientId); // Refresh the UI panel to show the new note instantly
    } 
    
    callSeconds = 0; // Reset seconds counter to zero
    document.getElementById("callTimer").textContent = "00:00"; // Reset visual timer on screen
    return; // Exit the function so the start call logic below does not run
  } 

  // --- If no call is active, start a new call ---
  callSeconds = 0; // Ensure the timer starts exactly from zero
  document.getElementById("callToggle").textContent = "End call"; // Change button text to "End call"
  
  // Start the interval timer to tick every 1 second (1000ms)
  callInterval = setInterval(() => { 
    callSeconds += 1; // Increase duration by 1 second
    document.getElementById("callTimer").textContent = formatTimer(callSeconds); // Update timer text on screen
  }, 2000); 
});

// Define a function to filter and sort the clients array based on UI inputs
function getVisibleClients() {
  // Get the search input value, remove extra whitespace, and convert to lowercase
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  // Get the selected status filter value from the dropdown
  const status = document.getElementById("statusFilter").value;
  // Get the selected sorting option from the dropdown
  const sort = document.getElementById("sortSelect").value;
  // Filter the clients array based on search query and status match
  let visible = clients.filter((client) => {
    // Combine relevant client fields into a single space-separated lowercase string
    const haystack = [client.name, client.email, client.company, client.city].join(" ").toLowerCase();
    // Return true if the query is in haystack AND status matches (or status is "all")
    return haystack.includes(query) && (status === "all" || client.status === status);
  });
   // Sort alphabetically by client name if "name" is selected
  if (sort === "name") visible = visible.sort((a, b) => a.name.localeCompare(b.name));
  // Sort descending by numeric value if "value" is selected
  if (sort === "value") visible = visible.sort((a, b) => b.value - a.value);
  // Sort descending by creation date (newest first) if "newest" is selected
  if (sort === "newest") visible = visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  // Return the processed array of visible clients
  return visible;
}

// Define a function to render the clients into the UI table and update the state message
function renderClients() {
  // Retrieve the filtered and sorted list of clients using the helper function
  const visible = getVisibleClients();
  // Log the array of visible clients to the browser console for debugging
  console.log(visible);
// Update the status element text depending on whether any clients match the filter criteria
  state.textContent = visible.length
    ? `${visible.length} client(s) shown`
    : "No clients match the current filters.";
// Generate HTML table rows for visible clients and inject them into the table element
  table.innerHTML = visible
  // Map each client object to a HTML table row string
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
// Attach an event listener to the table element to handle clicks (Event Delegation)
table.addEventListener("click", async (event) => {
  // Find the closest button element relative to the clicked element target
  const button = event.target.closest("button");
  // Exit early if the click did not happen on or inside a button
  if (!button) return;
  // Extract the client ID from the button's data attribute (data-id)
  const id = button.dataset.id;
  // Extract the action type from the button's data attribute (data-action)
  const action = button.dataset.action;
  // Handle delete action after asking for user confirmation
  if (action === "delete" && confirm("Delete this client?")) {
    try {
      // Attempt to delete the client via backend API and update the main clients array
      clients = await removeClient(id);
      // Clear any pending active timers or reminders related to this client
      clearReminderTimers(id);
      // Re-render the updated client table list
      renderClients();
      // Show a success notification message to the user
      toast("Client deleted.");
    } catch {
      clients = removeClientLocal(id); // Fallback: remove client from local state if the backend API call fails
      clearReminderTimers(id); // Clear any pending active timers or reminders for this client
      renderClients(); // Re-render the updated client table list
      toast("API failed. Client deleted locally."); // Show a fallback notification indicating offline/local deletion
    }
  }
  if (action === "edit") openClientForm(clients.find((client) => client.id === id));
  if (action === "details") renderDetails(id);
  if (action === "cycle") cycleStatus(id);
});
// Define a function to render filter chip buttons and attach their event listeners
function renderChips() {
  // Generate HTML for "all" plus all custom statuses and inject into the container element
  document.getElementById("statusChips").innerHTML = ["all", ...STATUSES]
  // Map each status string to a chip button HTML element
    .map((status) => `<button class="chip ${status === "all" ? "active" : ""}" data-status="${status}">${titleCase(status)}</button>`)
    // Join the array of button strings into a single HTML string
    .join("");
    // Attach a click event listener to the chip container using event delegation
  document.getElementById("statusChips").addEventListener("click", (event) => {
    // Find the closest chip button element relative to the clicked target
    const button = event.target.closest(".chip");
    // Exit early if the click did not occur on or inside a chip button
    if (!button) return;
    // Remove the "active" CSS class from all existing chip buttons
    document.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
    // Add the "active" CSS class to the newly clicked chip button
    button.classList.add("active");
    // Sync the selected chip status value with the hidden or main status filter dropdown
    document.getElementById("statusFilter").value = button.dataset.status;
    // Re-render the clients list based on the new filter selection
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
