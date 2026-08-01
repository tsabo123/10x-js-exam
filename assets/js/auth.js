import { getSession, getUsers } from "./storage.js";


function redirectToLogin() {
  window.location.replace("index.html");
}


function findUserBySession(session) {
  const users = getUsers() || []; // Get all users, or use an empty list if none exist
if (!users) return [] ; 
console.log(users); // Print users to the console for testing
// Find and return the user that matches the session's userId
  return users.find(
    user => user.id === session.userId
  );
}

/**
 * Checks if the user is logged in and valid.
 * Redirects to the login page if authentication fails.
 * @returns {Object|null} The user object if authenticated, or null.
 */

export function requireAuth() {
  // Get the current user session
  const session = getSession();
// If there is no session, send the user to the login page
  if (!session) {
    redirectToLogin(); 
    return null;
  }
// Find the user details using the session
  const user = findUserBySession(session);
// If the user does not exist, send them to the login page
  if (!user) {
    redirectToLogin();
    return null;
  }
// Return the authenticated user
  return user;
}
/**
 * Checks if a given value is a valid email address.
 * @param {string} value - The input text to check.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
export function isEmail(value) {
 // Check if the input text matches a simple email pattern (e.g., name@domain.com)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);// regex for email validation

}
/**
 * Calculates a strength score for a given password (from 0 to 4).
 * @param {string} password - The password to evaluate.
 * @returns {number} Score representing password strength.
 */

export function passwordScore(password = "") {
// Check password against 4 strength rules:
  // 1. At least 8 characters long
  // 2. Contains an uppercase letter
  // 3. Contains a number
  // 4. Contains a special character
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