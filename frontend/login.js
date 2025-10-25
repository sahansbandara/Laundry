import { api, setCurrentUser, toastError, toastSuccess } from "./common.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("login-error");

function validate() {
  let valid = true;
  errorMessage.style.display = "none";
  [emailInput, passwordInput].forEach((input) => {
    const helper = document.querySelector(`.helper-text[data-for="${input.id}"]`);
    if (!input.value) {
      input.classList.add("error");
      helper.textContent = "This field is required";
      helper.style.display = "block";
      toastError("Please fill in all required fields");
      valid = false;
    } else {
      input.classList.remove("error");
      helper.style.display = "none";
    }
  });
  return valid;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value.trim(),
  };

  try {
    const user = await api.post("/api/auth/login", payload);
    setCurrentUser(user);
    toastSuccess(`Welcome back, ${user.name}!`);
    setTimeout(() => {
      if (user.role === "ADMIN") {
        window.location.href = "dashboard-admin.html";
      } else {
        window.location.href = "dashboard-user.html";
      }
    }, 300);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    toastError(error.message);
  }
});
