import { isEmail, passwordLabel, passwordScore } from "./auth.js";
import { getUsers, saveSession, saveUsers } from "./storage.js";
import { applyTheme, clearErrors, showFieldError } from "./ui.js";

applyTheme();

const form = document.getElementById("signupForm");
const password = document.getElementById("password");
const strengthMeter = document.getElementById("strengthMeter");
const fieldIds = ["fullName", "email", "phone", "company", "password", "confirmPassword"];

password.addEventListener("input", () => {
  strengthMeter.textContent = `Password strength: ${passwordLabel(password.value)}`;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors(fieldIds);

  const values = Object.fromEntries(new FormData(form).entries());
  let valid = true;

  if (values.fullName.trim().length < 3) {
    showFieldError("fullName", "Full name must contain at least 3 characters.");
    valid = false;
  }
  if (!isEmail(values.email.trim())) {
    showFieldError("email", "Enter a valid email address.");
    valid = false;
  }
  if (!/^\+?[0-9\s-]{9,}$/.test(values.phone.trim())) {
    showFieldError("phone", "Enter a valid phone number.");
    valid = false;
  }
  if (values.company.trim().length < 2) {
    showFieldError("company", "Company must contain at least 2 characters.");
    valid = false;
  }
  if (passwordScore(values.password) < 2 || values.password.length < 8) {
    showFieldError("password", "Password must be at least 8 characters and include numbers or uppercase letters.");
    valid = false;
  }
  if (values.password !== values.confirmPassword) {
    showFieldError("confirmPassword", "Passwords must match.");
    valid = false;
  }

  const users = getUsers();
  if (users.some((user) => user.email.toLowerCase() === values.email.trim().toLowerCase())) {
    showFieldError("email", "This email is already registered.");
    valid = false;
  }
  if (!valid) return;

  const newUser = {
    id: crypto.randomUUID(),
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    company: values.company.trim(),
    password: values.password,
    createdAt: new Date().toISOString()
  };

  saveUsers([...users, newUser]);
  saveSession({ userId: newUser.id, createdAt: Date.now() }, true);
  window.location.href = "dashboard.html";
});
