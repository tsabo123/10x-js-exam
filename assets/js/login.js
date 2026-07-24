import { isEmail } from "./auth.js";
import { getUsers, saveSession } from "./storage.js";
import { applyTheme, clearErrors, showFieldError } from "./ui.js";

applyTheme();

const form = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

if (form) {

  form.addEventListener("submit", (event) => {

    event.preventDefault();

    clearErrors([
      "loginEmail",
      "loginPassword"
    ]);

    loginError.textContent = "";


    const email =
      document.getElementById("loginEmail")
      .value
      .trim()
      .toLowerCase();


    const password =
      document.getElementById("loginPassword")
      .value;


    const remember =
      document.getElementById("rememberMe").checked;


    let valid = true;


    if (!isEmail(email)) {
      showFieldError(
        "loginEmail",
        "Enter a valid email address."
      );
      valid = false;
    }


    if (!password) {
      showFieldError(
        "loginPassword",
        "Password is required."
      );
      valid = false;
    }


    if (!valid) return;


    const user = (getUsers() || []).find(
      (item) =>
        item.email === email &&
        item.password === password
    );


    if (!user) {
      loginError.textContent =
        "Email or password is incorrect.";
      return;
    }


    saveSession(
      {
        userId: user.id,
        createdAt: Date.now()
      },
      remember
    );


    window.location.href =
      "dashboard.html";

  });

}