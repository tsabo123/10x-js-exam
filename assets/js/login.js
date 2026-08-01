import { isEmail } from "./auth.js";
import { getUsers, saveSession } from "./storage.js";
import { applyTheme, clearErrors, showFieldError } from "./ui.js";

applyTheme();
// Get form and error output DOM elements
const form = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
// Run script only if the login form exists on the page

if (form) {

  form.addEventListener("submit", (event) => {
// Prevent default form submission page reload
    event.preventDefault();
// Clear previous field validation errors
    clearErrors([
      "loginEmail",
      "loginPassword"
    ]);
// Clear general login error message
    loginError.textContent = "";

// Read and format email input value
    const email =
      document.getElementById("loginEmail")
      .value
      .trim()
      .toLowerCase();

// Read password input value
    const password =
      document.getElementById("loginPassword")
      .value;

// Check if 'Remember Me' checkbox is selected
    const remember =
      document.getElementById("rememberMe").checked;

// Validate email format
    let valid = true;

// Validate email format

    if (!isEmail(email)) {
      showFieldError(
        "loginEmail",
        "Enter a valid email address."
      );
      valid = false;
    }
// Validate password presence
    if (!password) {
      showFieldError(
        "loginPassword",
        "Password is required."
      );
      valid = false;
    }
// Stop execution if inputs are invalid
    if (!valid) return;

// Find user with matching credentials
    const user = (getUsers() || []).find(
      (item) =>
        item.email === email &&
        item.password === password
    );
// Show error if user is not found

    if (!user) {
      loginError.textContent =
        "Email or password is incorrect.";
      return;
    }
// Save session data with user ID and timestamp
    saveSession(
      {
        userId: user.id,
        createdAt: Date.now()
      },
      remember
    );
// Redirect to the dashboard page
    window.location.href =
      "dashboard.html";

  });

}