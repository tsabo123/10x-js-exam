// Get functions from auth, storage, and ui modules
import { isEmail, passwordScore, requireAuth } from "./auth.js";
import { getUsers, resetDemoData, saveUsers } from "./storage.js";
import { clearErrors, setupShell, showFieldError, toast } from "./ui.js";

// Check login status and setup page layout
const user = requireAuth();
setupShell();

// Fill input fields with current user details if user exists
if (user) {
  document.getElementById("profileName").value = user.fullName;
  document.getElementById("profileEmail").value = user.email;
  document.getElementById("profilePhone").value = user.phone;
  document.getElementById("profileCompany").value = user.company;
}

// Handle profile update form submission
document.getElementById("profileForm").addEventListener("submit", (event) => {
  // Prevent default page refresh
  event.preventDefault();

  // Stop if user is not logged in
  if (!user) return;

  // Clear previous error messages
  clearErrors(["profileName", "profileEmail", "profilePhone", "profileCompany"]);

  // Read and trim input values
  const fullName = document.getElementById("profileName").value.trim();
  const email = document.getElementById("profileEmail").value.trim().toLowerCase();
  const phone = document.getElementById("profilePhone").value.trim();
  const company = document.getElementById("profileCompany").value.trim();

  // Set validation status flag
  let valid = true;

  // Check if name is at least 3 characters
  if (fullName.length < 3) {
    showFieldError("profileName", "Full name must contain at least 3 characters.");
    valid = false;
  }

  // Check if email is valid
  if (!isEmail(email)) {
    showFieldError("profileEmail", "Enter a valid email.");
    valid = false;
  }

  // Check if phone is at least 5 characters
  if (phone.length < 5) {
    showFieldError("profilePhone", "Enter a valid phone.");
    valid = false;
  }

  // Check if company is at least 2 characters
  if (company.length < 2) {
    showFieldError("profileCompany", "Company is required.");
    valid = false;
  }

  // Stop form submission if any validation fails
  if (!valid) return;

  // Save updated user profile data to storage
  saveUsers(getUsers().map((item) => (item.id === user.id ? { ...item, fullName, email, phone, company } : item)));
  toast("Profile saved.");
});

// Handle password change form submission
document.getElementById("passwordForm").addEventListener("submit", (event) => {
  // Prevent default page refresh
  event.preventDefault();

  // Stop if user is not logged in
  if (!user) return;

  // Clear previous password error messages
  clearErrors(["currentPassword", "newPassword", "confirmNewPassword"]);

  // Read input values
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;

  // Set validation status flag
  let valid = true;

  // Find current user in storage
  const latestUser = getUsers().find((item) => item.id === user.id);

  // Check if current password matches
  if (currentPassword !== latestUser?.password) {
    showFieldError("currentPassword", "Current password is incorrect.");
    valid = false;
  }

  // Check new password length and strength
  if (newPassword.length < 8 || passwordScore(newPassword) < 2) {
    showFieldError("newPassword", "New password must be at least 8 characters and stronger.");
    valid = false;
  }

  // Check if passwords match
  if (newPassword !== confirmNewPassword) {
    showFieldError("confirmNewPassword", "Passwords must match.");
    valid = false;
  }

  // Stop submission if password validation fails
  if (!valid) return;

  // Save new password to storage
  saveUsers(getUsers().map((item) => (item.id === user.id ? { ...item, password: newPassword } : item)));
  
  // Clear form fields
  event.target.reset();
  toast("Password changed.");
});

// Handle demo data reset button click
document.getElementById("resetDataBtn").addEventListener("click", () => {
  // Ask for user confirmation before reset
  if (!confirm("Reset all demo clients?")) return;

  // Reset demo clients data in storage
  resetDemoData();
  toast("Demo client data reset. Open Clients to reload seed data.");
});