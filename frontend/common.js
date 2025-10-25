const API = "http://localhost:8080";
const toastContainerId = "toast-container";

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
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

export function toastSuccess(message) {
  showToast(message, "success");
}

export function toastError(message) {
  showToast(message, "error");
}

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const errorMessage = data?.error || data?.message || "Something went wrong";
    throw new Error(errorMessage);
  }
  return data;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  return handleResponse(response);
}

export const api = {
  get: (path) => request(`${API}${path}`, { method: "GET" }),
  post: (path, body) => request(`${API}${path}`, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(`${API}${path}`, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: (path) => request(`${API}${path}`, { method: "DELETE" }),
};

export function getCurrentUser() {
  const auth = getAuth();
  if (auth?.user) return auth.user;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    const auth = getAuth() || {};
    localStorage.setItem("auth", JSON.stringify({ ...auth, user }));
  } else {
    localStorage.removeItem("user");
  }
}

export function clearCurrentUser() {
  localStorage.removeItem("user");
  localStorage.removeItem("auth");
}

export function requireAuth(role) {
  const auth = getAuth();
  const user = auth?.user || getCurrentUser();
  if (!user) {
    window.location.href = "/frontend/login.html";
    return null;
  }

  const redirect = user.role === "ADMIN"
    ? "/frontend/dashboard-admin.html"
    : "/frontend/dashboard-user.html";

  if (role === "ADMIN" && user.role !== "ADMIN") {
    window.location.href = redirect;
    return null;
  }

  if (role === "USER" && user.role === "ADMIN") {
    window.location.href = redirect;
    return null;
  }

  if (role && role !== "ADMIN" && role !== "USER" && user.role !== role) {
    window.location.href = redirect;
    return null;
  }

  return user;
}

export async function loadServiceOptions(selectEl) {
  try {
    const services = await api.get("/api/catalog/services");
    selectEl.innerHTML = `<option value="">Select service</option>` +
      services.map((service) => `<option value="${service}">${service}</option>`).join("");
  } catch (error) {
    toastError(error.message);
  }
}

export async function loadUnitOptions(selectEl) {
  try {
    const units = await api.get("/api/catalog/units");
    selectEl.innerHTML = `<option value="">Select unit</option>` +
      units.map((unit) => `<option value="${unit}">${unit}</option>`).join("");
  } catch (error) {
    toastError(error.message);
  }
}

export function renderStatusBadge(value) {
  return `<span class="badge status-${value}">${value.replace(/_/g, ' ')}</span>`;
}

export function confirmAction(message) {
  return window.confirm(message);
}

// === Auth helpers (append to common.js) ===
export function saveAuth(auth) {
  if (!auth) return;
  localStorage.setItem('auth', JSON.stringify(auth));
  if (auth.user) {
    localStorage.setItem('user', JSON.stringify(auth.user));
  } else {
    localStorage.removeItem('user');
  }
}
export function getAuth() {
  try { return JSON.parse(localStorage.getItem('auth') || 'null'); }
  catch { return null; }
}
export function clearAuth() {
  localStorage.removeItem('auth');
  localStorage.removeItem('user');
}

export function requireAuthOrRedirect() {
  const auth = getAuth();
  if (!auth || !auth.token || !auth.user) {
    window.location.href = '/frontend/login.html';
    return null;
  }
  return auth;
}
