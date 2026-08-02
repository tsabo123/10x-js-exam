// Import helper functions from modules
import { isEmail, passwordLabel, passwordScore } from "./auth.js";
import { getUsers, saveSession, saveUsers } from "./storage.js";
import { applyTheme, clearErrors, showFieldError } from "./ui.js";

// Apply current visual theme
applyTheme();

// Get HTML elements and input field IDs
const form = document.getElementById("signupForm");
const password = document.getElementById("password");
const strengthMeter = document.getElementById("strengthMeter");
const fieldIds = ["fullName", "email", "phone", "company", "password", "confirmPassword"];

// Update password strength indicator as user types
password.addEventListener("input", () => {
  strengthMeter.textContent = `Password strength: ${passwordLabel(password.value)}`;
});

// Handle signup form submission
form.addEventListener("submit", (event) => {
  // Prevent default page refresh
  event.preventDefault();

  // Clear previous error messages
  clearErrors(fieldIds);

  // Get all form input values as an object
  const values = Object.fromEntries(new FormData(form).entries());

  // Set validation status flag
  let valid = true;

  // Check full name length
  if (values.fullName.trim().length < 3) {
    showFieldError("fullName", "Full name must contain at least 3 characters.");
    valid = false;
  }

  // Check email format
  if (!isEmail(values.email.trim())) {
    showFieldError("email", "Enter a valid email address.");
    valid = false;
  }

  // Check phone number format using regular expression
  if (!/^\+?[0-9\s-]{9,}$/.test(values.phone.trim())) {
    showFieldError("phone", "Enter a valid phone number.");
    valid = false;
  }

  // Check company name length
  if (values.company.trim().length < 2) {
    showFieldError("company", "Company must contain at least 2 characters.");
    valid = false;
  }

  // Check password strength score and minimum length
  if (passwordScore(values.password) < 2 || values.password.length < 8) {
    showFieldError("password", "Password must be at least 8 characters and include numbers or uppercase letters.");
    valid = false;
  }

  // Check if password and confirmation match
  if (values.password !== values.confirmPassword) {
    showFieldError("confirmPassword", "Passwords must match.");
    valid = false;
  }

  // Get existing users list from storage
  const users = getUsers();

  // Check if email is already taken
  if (users.some((user) => user.email.toLowerCase() === values.email.trim().toLowerCase())) {
    showFieldError("email", "This email is already registered.");
    valid = false;
  }

  // Stop execution if any validation fails
  if (!valid) return;

  // Create new user object
  const newUser = {
    id: crypto.randomUUID(),
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    company: values.company.trim(),
    password: values.password,
    createdAt: new Date().toISOString()
  };

  // Save updated users array to storage
  saveUsers([...users, newUser]);

  // Save active session for the user
  saveSession({ userId: newUser.id, createdAt: Date.now() }, true);

  // Redirect user to dashboard page
  window.location.href = "dashboard.html";
});