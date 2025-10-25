import { api, setCurrentUser, toastError, toastSuccess } from "./common.js";

// ✅ Select form elements
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("login-error");

// ✅ Demo users (for offline / fallback login)
const DEMO_USERS = [
    {
        email: "admin@smartfold.lk",
        password: "1234",
        role: "ADMIN",
        name: "Demo Admin",
        token: "demo-admin-token",
    },
    {
        email: "nimal@smartfold.lk",
        password: "1234",
        role: "USER",
        name: "Nimal Perera",
        token: "demo-nimal-token",
    },
    {
        email: "ruwan@smartfold.lk",
        password: "1234",
        role: "USER",
        name: "Ruwan Fernando",
        token: "demo-ruwan-token",
    },
    {
        email: "kamal@smartfold.lk",
        password: "1234",
        role: "USER",
        name: "Kamal Jayasuriya",
        token: "demo-kamal-token",
    },
];

// ✅ Form validation
function validate() {
    let valid = true;
    errorMessage.style.display = "none";
    [emailInput, passwordInput].forEach((input) => {
        const helper = document.querySelector(`.helper-text[data-for="${input.id}"]`);
        if (!input.value.trim()) {
            input.classList.add("error");
            helper.textContent = "This field is required";
            helper.style.display = "block";
            valid = false;
        } else {
            input.classList.remove("error");
            helper.style.display = "none";
        }
    });
    if (!valid) toastError("Please fill in all required fields");
    return valid;
}

// ✅ Handle form submit
form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
        email: emailInput.value.trim(),
        password: passwordInput.value.trim(),
    };

    try {
        // Try backend login first
        const user = await api.post("/api/auth/login", payload);
        handleSuccess(user);
    } catch (error) {
        console.warn("⚠️ Backend unreachable, trying demo login:", error.message);
        const fallback = findDemoUser(payload.email, payload.password);
        if (fallback) {
            handleSuccess(fallback);
            toastSuccess("Demo mode activated.");
            return;
        }
        showError(error.message || "Login failed");
    }
});

// ✅ Find demo user match
function findDemoUser(email, password) {
    return DEMO_USERS.find(
        (user) => user.email === email && user.password === password
    );
}

// ✅ Success handler (redirects safely with relative paths)
function handleSuccess(user) {
    const token = user.token ?? user.accessToken ?? "session-token";
    const normalizedUser = { ...user };
    delete normalizedUser.password;
    delete normalizedUser.token;
    normalizedUser.role = (user.role ?? "USER").toString().toUpperCase();
    setCurrentUser(normalizedUser, token);

    toastSuccess(`Welcome back, ${user.name ?? user.email}!`);
    console.log("✅ LOGIN_OK", normalizedUser.role);

    setTimeout(() => {
        if (normalizedUser.role === "ADMIN") {
            window.location.href = "./dashboard-admin.html";
        } else {
            window.location.href = "./dashboard-user.html";
        }
    }, 300);
}

// ✅ Error display helper
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    toastError(message);
}
