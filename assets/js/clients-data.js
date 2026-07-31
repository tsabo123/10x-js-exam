import { getClients, saveClients } from "./storage.js";
import { STATUSES } from "./ui.js";

const API_URL = "https://dummyjson.com/users?limit=30";
// Array of available pipeline statuses for tracking client progression
const CLIENT_STATUSES = [
  "new",       // Newly added leads
  "contacted", // Initial outreach initiated
  "qualified", // Lead meets criteria and requirements
  "won",       // Deal closed successfully
  "lost"       // Deal was lost or closed without success
];



// Time duration constants in milliseconds used for date calculations
const ONE_DAY = 86400000;  // 24 hours (24 * 60 * 60 * 1000 ms)
const HALF_DAY = 43200000; // 12 hours (12 * 60 * 60 * 1000 ms)


// Local seed dataset containing default client records: [Full Name, City, Company]
// Used as fallback data to generate mock clients when the external API is unavailable
const apiNames = [
  ["Nino Beridze", "Tbilisi", "Redberry"],
  ["Giorgi Maisuradze", "Batumi", "Bank of Georgia"],
  ["Mariam Kapanadze", "Kutaisi", "TBC Leasing"],
  ["Levan Dolidze", "Tbilisi", "Caucasus Retail"],
  ["Ana Japaridze", "Rustavi", "Alta Software"],
  ["Sandro Gelashvili", "Telavi", "Mziuri Foods"],
  ["Tamar Lomidze", "Gori", "Nova Logistics"],
  ["Dato Abashidze", "Zugdidi", "Green Energy"],
  ["Elene Chikovani", "Tbilisi", "IdeaHub"],
  ["Irakli Tsereteli", "Batumi", "SeaLine Tours"],
  ["Maka Gvazava", "Poti", "PortPro"],
  ["Vakho Nadiradze", "Tbilisi", "Urban Build"]
  
];
// Assigns a status to each client in a cycle (repeats when it reaches the end)
// Example (with 5 statuses):
// Client 0: 0 % 5 = 0 -> Gets 1st status
// Client 1: 1 % 5 = 1 -> Gets 2nd status
// Client 2: 2 % 5 = 2 -> Gets 3rd status
// Client 3: 3 % 5 = 3 -> Gets 4th status
// Client 4: 4 % 5 = 4 -> Gets 5th status
// Client 5: 5 % 5 = 0 -> Loops back to 1st status!
function getStatus(index) {
  return STATUSES[index % STATUSES.length];
}


// Creates a structured client object with default values, a unique ID, and a calculated creation date
function createClient(data, index, timeStep = HALF_DAY) {
  return {
    id: crypto.randomUUID(), // Generates a unique ID (e.g., "123e4567-e89b...")
    ...data,                 // Copies properties from the passed data (name, email, city, etc.)
    status: getStatus(index), // Assigns a status from the status list
    value: 1800 + index * 700, // Calculates a mock deal value based on the index
    createdAt: new Date(     // Sets a past creation date, spaced out by the timeStep
      Date.now() - index * timeStep
    ).toISOString(),
    notes: [],               // Initializes an empty array for client notes
    reminders: []            // Initializes an empty array for client reminders
  };
}


// Generates the initial list of mock clients using the 'apiNames' fallback data
function buildSeedClients() {
  
  // Loops through each item in apiNames, extracting name, city, and company
  return apiNames.map(([name, city, company], index) =>
    createClient(
      {
        name,
        // Formats the email by converting the name to lowercase and replacing spaces with dots (e.g., nino.beridze@example.com)
        email: `${name
          .toLowerCase()
          .replaceAll(" ", ".")}@example.com`,
        // Generates a mock Georgian phone number, padding numbers with zeros to keep the format consistent
        // String(120 + index).padStart(3, "0") ensures the middle section is always 3 digits (e.g., 120, 121)
       // String(300 + index).padStart(3, "0") ensures the last section is always 3 digits (e.g., 300, 301)
        phone: `+995 555 ${String(120 + index).padStart(3, "0")} ${String(300 + index).padStart(3, "0")}`,
        company,
        city
      },
      index,
      ONE_DAY // Spaces out each client's creation date by one day
    )
  );
}

// Transforms (maps) a single user object from the external API into our app's client format
function mapApiUser(user, index) {
  return createClient(
    {
      name: `${user.firstName} ${user.lastName}`, // Combines first and last name into full name
      email: user.email.toLowerCase(),             // Converts the email to lowercase for consistency
      phone: user.phone,                          // Keeps the original phone number from the API
      company: user.company.name,                 // Extracts the company name
      city: user.address.city                     // Extracts the city from the user's address
    },
    index
  );
}


/**
 * Sends an HTTP request, checks for errors, and safely parses the JSON response.
 * 
 * @param {string} url - The endpoint URL to request data from
 * @param {Object} [options] - Fetch configuration options (method, headers, body, etc.)
 * @returns {Promise<Object>} Parsed JSON response object or an empty object if no body exists
 */
async function requestJson(url, options) {
  // 1. Send the HTTP request using the Fetch API
  const response = await fetch(url, options);

  // 2. Check if the HTTP status code is in the successful range (200-299)
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  // 3. Read the response body as plain text
  const text = await response.text();
  
  // 4. Safely parse JSON if text exists; otherwise return an empty object {}
  return text ? JSON.parse(text) : {};
}

/**
 * Fetches user data from the external API and maps each user to our application's client structure.
 * 
 * @returns {Promise<Array<Object>>} Array of formatted client objects
 */
async function fetchClientsFromApi() {
  // Fetch users list from API
  const response = await requestJson(API_URL);

  // Transform each API user object using mapApiUser and return the array
  return response.users.map(mapApiUser);
}
/**
 * Loads the list of clients using a 3-tier fallback strategy:
 * 1. Returns cached clients from LocalStorage if available.
 * 2. Fetches fresh data from the external API if cache is empty.
 * 3. Generates seed fallback data if the API is unreachable.
 */

export async function loadClients() {
  // 1. Check if clients are already stored in LocalStorage
  const cachedClients = getClients();

  if (cachedClients && cachedClients.length) {
    return cachedClients;
  }
// 2. Try fetching client data from the external API
  try {
    const clients = await fetchClientsFromApi();
    saveClients(clients);
    return clients;
  } catch {
    // 3. Fallback: Generate and save mock seed data if the API request fails
    const fallbackClients = buildSeedClients();
    saveClients(fallbackClients);
    return fallbackClients;
  }
}


/**
 * Updates an existing client or adds a new one to LocalStorage.
 * 
 * @param {Object} client - The client object to save/update
 * @returns {Array<Object>} The updated list of all clients
 */
function updateLocalClients(client) {
  // 1. Get the current list of clients from LocalStorage (or fall back to an empty array)
  const clients = getClients() || [];

  // 2. Check if the client already exists in the list by matching IDs
  const exists = clients.some(
    item => item.id === client.id
  );

  // 3. If exists, replace the old client data; if new, add it to the beginning of the list
  const updatedClients = exists
    ? clients.map(item =>
        item.id === client.id
          ? client
          : item
      )
    : [client, ...clients];

  // 4. Persist the updated array to LocalStorage and return it
  saveClients(updatedClients);

  return updatedClients;
}


/**
 * Saves or updates a client. Tries sending data to the server API first (POST/PUT),
 * and falls back to LocalStorage if the server is offline or returns an error.
 * 
 * @param {Object} client - The client object to save or update
 * @param {boolean} [isEdit=false] - True to update an existing client (PUT), false to create a new one (POST)
 * @returns {Promise<Array<Object>>} The updated list of local clients
 */
export async function upsertClient(client, isEdit = false) {

  try {
    // Attempt to send client data to the API:
    // If editing: PUT request to API_URL/{clientId}
    // If creating: POST request to API_URL
    await requestJson(
      `${API_URL}${isEdit ? `/${encodeURIComponent(client.id)}` : ""}`,
      {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(client) // Converts JavaScript object to JSON string
      }
    );
  } catch (error) {
    // Fallback: If API request fails, log a message and proceed to update local storage
    console.log("API unavailable, saving locally");
  }

  // Always sync and return the latest state in LocalStorage
  return updateLocalClients(client);
}



/**
 * Deletes a client by ID.
 * Attempts to remove the client from the API first, then updates LocalStorage.
 * 
 * @param {string|number} id - The ID of the client to remove
 * @returns {Promise<Array<Object>>} The updated list of clients after deletion
 */
export async function removeClient(id) {

  try {
    // Attempt to delete client from the server API
    await requestJson(
      `${API_URL}/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  } catch (error) {
    // Log warning if the API is offline, but proceed to update local state
    console.warn("API unavailable, saving locally", error);
  }

  // Get current list from LocalStorage
  const clients = getClients() || [];

  // Filter out the client with the matching ID
  const updatedClients = clients.filter(
    item => item.id !== id
  );

  // Persist the updated array to LocalStorage and return it
  saveClients(updatedClients);

  return updatedClients;
}