import { getClients, saveClients } from "./storage.js";
import { STATUSES } from "./ui.js";

const API_URL = "https://jsonplaceholder.typicode.com/users";

const CLIENT_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost"
];

const ONE_DAY = 86400000;
const HALF_DAY = 43200000;


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


function getStatus(index) {
  return STATUSES[index % STATUSES.length];
}


function createClient(data, index, timeStep = HALF_DAY) {
  return {
    id: crypto.randomUUID(),
    ...data,
    status: getStatus(index),
    value: 1800 + index * 700,
    createdAt: new Date(
      Date.now() - index * timeStep
    ).toISOString(),
    notes: [],
    reminders: []
  };
}


function buildSeedClients() {

  return apiNames.map(([name, city, company], index) =>
    createClient(
      {
        name,
        email: `${name
          .toLowerCase()
          .replaceAll(" ", ".")}@example.com`,
        phone: `+995 555 ${String(120 + index).padStart(3, "0")} ${String(300 + index).padStart(3, "0")}`,
        company,
        city
      },
      index,
      ONE_DAY
    )
  );
}


function mapApiUser(user, index) {

  return createClient(
    {
      name: user.name,
      email: user.email.toLowerCase(),
      phone: user.phone,
      company: user.company.name,
      city: user.address.city
    },
    index
  );

}


async function requestJson(url) {

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  const text = await response.text();

  return text ? JSON.parse(text) : {};

}


async function fetchClientsFromApi() {

  const response = await requestJson(API_URL);

  return response.map(mapApiUser);

}


export async function loadClients() {

  try {
    const clients = await fetchClientsFromApi();

    saveClients(clients);

    return clients;

  } catch {

    const cachedClients = getClients();

    if (cachedClients) {
      return cachedClients;
    }

    const fallbackClients = buildSeedClients();

    saveClients(fallbackClients);

    return fallbackClients;
  }

}


function updateLocalClients(client) {

  const clients = getClients() || [];

  const exists = clients.some(
    item => item.id === client.id
  );


  const updatedClients = exists
    ? clients.map(item =>
        item.id === client.id
          ? client
          : item
      )
    : [client, ...clients];


  saveClients(updatedClients);

  return updatedClients;
}



export async function upsertClient(client, isEdit = false) {

  try {
    await requestJson(
      `${API_URL}${isEdit ? `/${encodeURIComponent(client.id)}` : ""}`,
      {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(client)
      }
    );
  } catch (error) {
    console.log("API unavailable, saving locally");
  }

  return updateLocalClients(client);
}



export async function removeClient(id) {

  try {
    await requestJson(
      `${API_URL}/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  } catch (error) {
     console.warn("API unavailable, saving locally", error);
  }


  const clients = getClients() || [];

  const updatedClients = clients.filter(
    item => item.id !== id
  );


  saveClients(updatedClients);

  return updatedClients;

}