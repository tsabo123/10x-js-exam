import { isEmail, passwordScore, requireAuth } from "./auth.js";
import { getUsers, resetDemoData, saveUsers } from "./storage.js";
import { clearErrors, setupShell, showFieldError, toast } from "./ui.js";

const user = requireAuth();
setupShell();

if (user) {
  document.getElementById("profileName").value = user.fullName;
  document.getElementById("profileEmail").value = user.email;
  document.getElementById("profilePhone").value = user.phone;
  document.getElementById("profileCompany").value = user.company;
}

document.getElementById("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!user) return;
  clearErrors(["profileName", "profileEmail", "profilePhone", "profileCompany"]);
  const fullName = document.getElementById("profileName").value.trim();
  const email = document.getElementById("profileEmail").value.trim().toLowerCase();
  const phone = document.getElementById("profilePhone").value.trim();
  const company = document.getElementById("profileCompany").value.trim();
  let valid = true;

  if (fullName.length < 3) {
    showFieldError("profileName", "Full name must contain at least 3 characters.");
    valid = false;
  }
  if (!isEmail(email)) {
    showFieldError("profileEmail", "Enter a valid email.");
    valid = false;
  }
  if (phone.length < 5) {
    showFieldError("profilePhone", "Enter a valid phone.");
    valid = false;
  }
  if (company.length < 2) {
    showFieldError("profileCompany", "Company is required.");
    valid = false;
  }
  if (!valid) return;

  saveUsers(getUsers().map((item) => (item.id === user.id ? { ...item, fullName, email, phone, company } : item)));
  toast("Profile saved.");
});

document.getElementById("passwordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!user) return;
  clearErrors(["currentPassword", "newPassword", "confirmNewPassword"]);
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;
  let valid = true;

  const latestUser = getUsers().find((item) => item.id === user.id);
  if (currentPassword !== latestUser?.password) {
    showFieldError("currentPassword", "Current password is incorrect.");
    valid = false;
  }
  if (newPassword.length < 8 || passwordScore(newPassword) < 2) {
    showFieldError("newPassword", "New password must be at least 8 characters and stronger.");
    valid = false;
  }
  if (newPassword !== confirmNewPassword) {
    showFieldError("confirmNewPassword", "Passwords must match.");
    valid = false;
  }
  if (!valid) return;

  saveUsers(getUsers().map((item) => (item.id === user.id ? { ...item, password: newPassword } : item)));
  event.target.reset();
  toast("Password changed.");
});

document.getElementById("resetDataBtn").addEventListener("click", () => {
  if (!confirm("Reset all demo clients?")) return;
  resetDemoData();
  toast("Demo client data reset. Open Clients to reload seed data.");
});
