// ✅ Base API endpoint for Spring Boot backend
const API = "http://localhost:8080";
const toastContainerId = "toast-container";
const AUTH_STORAGE_KEY = "smartfold_auth";

/* ---------- Toast System ---------- */
function ensureToastContainer() {
    let container = document.getElementById(toastContainerId);
    if (!container) {
        container = document.createElement("div");
        container.id = toastContainerId;
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = "success") {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

export function toastSuccess(message) {
    showToast(message, "success");
}
export function toastError(message) {
    showToast(message, "error");
}

/* ---------- Auth Storage ---------- */
export function saveAuth(auth = {}) {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    } catch (error) {
        console.error("Failed to persist auth", error);
    }
}

export function getAuth() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem("user");
}

/* ---------- Auth Redirect Handling ---------- */
export function requireAuthOrRedirect() {
    const auth = getAuth();
    if (!auth || !auth.token) {
        // ✅ Use relative path (no leading slash)
        window.location.href = "./login.html";
        return null;
    }
    return auth;
}

/* ---------- Fetch Helpers ---------- */
async function handleResponse(response) {
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
        const msg = data?.error || data?.message || "Something went wrong";
        throw new Error(msg);
    }
    return data;
}

async function request(url, options = {}) {
    const auth = getAuth();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;

    const response = await fetch(url, { ...options, headers });
    return handleResponse(response);
}

export const api = {
    get: (path) => request(`${API}${path}`, { method: "GET" }),
    post: (path, body) =>
        request(`${API}${path}`, { method: "POST", body: JSON.stringify(body) }),
    patch: (path, body) =>
        request(`${API}${path}`, {
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
        }),
    del: (path) => request(`${API}${path}`, { method: "DELETE" }),
};

/* ---------- Auth Utilities ---------- */
export function getCurrentUser() {
    const auth = getAuth();
    return auth?.user ?? null;
}

export function setCurrentUser(user, token) {
    saveAuth({
        token: token ?? user?.token ?? null,
        user,
    });
}

export function clearCurrentUser() {
    clearAuth();
}

/* ---------- Role Check + Redirect ---------- */
export function requireAuth(role) {
    const auth = requireAuthOrRedirect();
    const user = auth?.user;
    if (!user) return null;

    if (role && user.role !== role) {
        // ✅ Use relative paths for dashboards
        window.location.href =
            user.role === "ADMIN"
                ? "./dashboard-admin.html"
                : "./dashboard-user.html";
        return null;
    }
    return user;
}

/* ---------- Data Loading Helpers ---------- */
export async function loadServiceOptions(selectEl) {
    if (!selectEl) return;
    try {
        const services = await api.get("/api/catalog/services");
        selectEl.innerHTML =
            `<option value="">Select service</option>` +
            services.map((s) => `<option value="${s}">${s}</option>`).join("");
    } catch (error) {
        toastError(error.message);
    }
}

export async function loadUnitOptions(selectEl) {
    if (!selectEl) return;
    try {
        const units = await api.get("/api/catalog/units");
        selectEl.innerHTML =
            `<option value="">Select unit</option>` +
            units.map((u) => `<option value="${u}">${u}</option>`).join("");
    } catch (error) {
        toastError(error.message);
    }
}

/* ---------- UI Helpers ---------- */
export function renderStatusBadge(value) {
    return `<span class="badge status-${value}">${value.replace(/_/g, " ")}</span>`;
}

export function confirmAction(message) {
    return window.confirm(message);
}
