export const API_BASE = window.API_BASE || "http://localhost:8080";
const toastContainerId = "toast-container";
const AUTH_STORAGE_KEY = "smartfold_auth";

/* ---------- Toasts ---------- */
function ensureToastContainer() {
    let c = document.getElementById(toastContainerId);
    if (!c) {
        c = document.createElement("div");
        c.id = toastContainerId;
        c.className = "toast-container";
        document.body.appendChild(c);
    }
    return c;
}
function showToast(message, type = "success") {
    const c = ensureToastContainer();
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = message;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
export const toastSuccess = (m) => showToast(m, "success");
export const toastError = (m) => showToast(m, "error");

/* ---------- Auth Storage ---------- */
export function saveAuth(auth = {}) {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    } catch (e) {
        console.error("Failed to persist auth", e);
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
export function requireAuthOrRedirect() {
    const auth = getAuth();
    if (!auth || !auth.token) {
        window.location.href = "./login.html";
        return null;
    }
    return auth;
}

/* ---------- Fetch helpers ---------- */
async function parseResponse(response) {
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
        const msg = data?.error || data?.message || response.statusText || "Something went wrong";
        throw new Error(msg);
    }
    return data;
}

function buildHeaders(base = {}) {
    const auth = getAuth();
    const headers = { ...base };
    if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
    return headers;
}

export const api = {
    async get(path) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "GET",
            headers: buildHeaders(),
            credentials: "include",
        });
        return parseResponse(res);
    },
    async post(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers: buildHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(body ?? {}),
            credentials: "include",
        });
        return parseResponse(res);
    },
    async patch(path, body) {
        const isJsonBody = body !== undefined && !(body instanceof FormData);
        const res = await fetch(`${API_BASE}${path}`, {
            method: "PATCH",
            headers: buildHeaders(isJsonBody ? { "Content-Type": "application/json" } : {}),
            body: isJsonBody ? JSON.stringify(body) : body,
            credentials: "include",
        });
        return parseResponse(res);
    },
    async del(path) {
        const res = await fetch(`${API_BASE}${path}`, {
            method: "DELETE",
            headers: buildHeaders(),
            credentials: "include",
        });
        return parseResponse(res);
    },
};

/* ---------- Auth utils ---------- */
export function getCurrentUser() {
    const auth = getAuth();
    return auth?.user ?? null;
}
export function setCurrentUser(user, token) {
    saveAuth({ token: token ?? user?.token ?? null, user });
}
export function clearCurrentUser() {
    clearAuth();
}
export function requireAuth(role) {
    const auth = requireAuthOrRedirect();
    const user = auth?.user;
    if (!user) return null;
    if (role && user.role !== role) {
        window.location.href = user.role === "ADMIN" ? "./dashboard-admin.html" : "./dashboard-user.html";
        return null;
    }
    return user;
}

/* ---------- Helpers ---------- */
export async function loadServiceOptions(selectEl) {
    if (!selectEl) return;
    try {
        const services = await api.get("/api/catalog/services");
        selectEl.innerHTML =
            `<option value="">Select service</option>` +
            services.map((s) => `<option value="${s}">${s}</option>`).join("");
    } catch (e) {
        toastError(e.message);
    }
}
export async function loadUnitOptions(selectEl) {
    if (!selectEl) return;
    try {
        const units = await api.get("/api/catalog/units");
        selectEl.innerHTML =
            `<option value="">Select unit</option>` +
            units.map((u) => `<option value="${u}">${u}</option>`).join("");
    } catch (e) {
        toastError(e.message);
    }
}
export function renderStatusBadge(v) {
    return `<span class="badge status-${v}">${v.replace(/_/g, " ")}</span>`;
}
export function confirmAction(message) {
    return window.confirm(message);
}
