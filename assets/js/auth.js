import { getSession, getUsers } from "./storage.js";


function redirectToLogin() {
  window.location.replace("index.html");
}


function findUserBySession(session) {
  const users = getUsers() || [];
if (!users) return [] ;
console.log(users);
  return users.find(
    user => user.id === session.userId
  );
}

export function requireAuth() {
  const session = getSession();

  if (!session) {
    redirectToLogin();
    return null;
  }

  const user = findUserBySession(session);

  if (!user) {
    redirectToLogin();
    return null;
  }

  return user;
}


export function isEmail(value) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

}


export function passwordScore(password = "") {

  const rules = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];

  return rules.filter(Boolean).length;

}


export function passwordLabel(password) {

  const score = passwordScore(password);


  const labels = {
    0: "weak",
    1: "weak",
    2: "medium",
    3: "medium",
    4: "strong"
  };


  return labels[score] || "weak";

}