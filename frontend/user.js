import {
  api,
  requireAuth,
  toastError,
  toastSuccess,
  loadServiceOptions,
  loadUnitOptions,
  clearCurrentUser,
  renderStatusBadge,
} from "./common.js";

const user = requireAuth("USER");
const logoutBtn = document.getElementById("logout-user");
logoutBtn?.addEventListener("click", () => {
  clearCurrentUser();
  window.location.href = "login.html";
});

const orderForm = document.getElementById("user-order-form");
const serviceSelect = document.getElementById("user-service");
const quantityInput = document.getElementById("user-quantity");
const unitSelect = document.getElementById("user-unit");
const pickupInput = document.getElementById("user-pickup");
const deliveryInput = document.getElementById("user-delivery");
const notesInput = document.getElementById("user-notes");
const priceInput = document.getElementById("user-price");
const ordersBody = document.getElementById("user-orders-body");

const messageList = document.getElementById("user-message-list");
const messageForm = document.getElementById("user-message-form");
const messageInput = document.getElementById("user-message-input");

let adminUser = null;
let pollingInterval = null;

async function initCatalog() {
  await loadServiceOptions(serviceSelect);
  await loadUnitOptions(unitSelect);
}

function setHelper(id, message) {
  const helper = document.querySelector(`.helper-text[data-for="${id}"]`);
  const field = document.getElementById(id);
  if (!helper || !field) return;
  if (message) {
    helper.textContent = message;
    helper.style.display = "block";
    field.classList.add("error");
  } else {
    helper.textContent = "";
    helper.style.display = "none";
    field.classList.remove("error");
  }
}

function validateForm() {
  let valid = true;
  if (!serviceSelect.value) {
    setHelper("user-service", "Select a service");
    valid = false;
  } else {
    setHelper("user-service");
  }

  const quantity = parseFloat(quantityInput.value);
  if (!quantity || quantity < 1) {
    setHelper("user-quantity", "Quantity must be at least 1");
    valid = false;
  } else {
    setHelper("user-quantity");
  }

  if (!unitSelect.value) {
    setHelper("user-unit", "Select a unit");
    valid = false;
  } else {
    setHelper("user-unit");
  }

  const price = parseFloat(priceInput.value);
  if (isNaN(price) || price < 0) {
    setHelper("user-price", "Price cannot be negative");
    valid = false;
  } else {
    setHelper("user-price");
  }

  if (!valid) {
    toastError("Please review highlighted fields");
  }
  return valid;
}

orderForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) return;

  const payload = {
    customerId: user.id,
    serviceType: serviceSelect.value,
    quantity: parseFloat(quantityInput.value),
    unit: unitSelect.value,
    price: parseFloat(priceInput.value),
    pickupDate: pickupInput.value || null,
    deliveryDate: deliveryInput.value || null,
    notes: notesInput.value || null,
  };

  try {
    await api.post("/api/orders", payload);
    toastSuccess("Order placed! We'll confirm shortly.");
    orderForm.reset();
    await initCatalog();
    await loadOrders();
  } catch (error) {
    toastError(error.message);
  }
});

serviceSelect?.addEventListener("change", () => setHelper("user-service"));
quantityInput?.addEventListener("input", () => setHelper("user-quantity"));
unitSelect?.addEventListener("change", () => setHelper("user-unit"));
priceInput?.addEventListener("input", () => setHelper("user-price"));

async function loadOrders() {
  try {
    const data = await api.get(`/api/orders?userId=${user.id}`);
    renderOrders(data);
  } catch (error) {
    toastError(error.message);
  }
}

function renderOrders(data) {
  if (!ordersBody) return;
  if (!data || data.length === 0) {
    ordersBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--muted);">No orders yet. Place one above!</td></tr>`;
    return;
  }
  ordersBody.innerHTML = data.map((order) => `<tr>
    <td>#${order.id}</td>
    <td>${order.serviceType}</td>
    <td>${order.quantity} ${order.unit}</td>
    <td>${Number(order.price).toLocaleString()}</td>
    <td>${renderStatusBadge(order.status)}</td>
    <td>${order.pickupDate || "-"}</td>
    <td>${order.deliveryDate || "-"}</td>
  </tr>`).join("");
}

async function findAdmin() {
  try {
    const data = await api.get("/api/admin/users");
    adminUser = data.find((entry) => entry.role === "ADMIN");
  } catch (error) {
    toastError("Unable to load admin user");
  }
}

async function loadMessages() {
  if (!adminUser) {
    messageList.innerHTML = `<p style="color:var(--muted);">Administrator unavailable.</p>`;
    return;
  }
  try {
    const messages = await api.get(`/api/messages?withUserId=${adminUser.id}&currentUserId=${user.id}`);
    renderMessages(messages);
  } catch (error) {
    toastError(error.message);
  }
}

function renderMessages(messages) {
  if (!messageList) return;
  if (!messages || messages.length === 0) {
    messageList.innerHTML = `<p style="color:var(--muted);">Start the conversation!</p>`;
    return;
  }
  messageList.innerHTML = messages.map((message) => {
    const isUser = message.fromUserId === user.id;
    return `<div class="message-bubble ${isUser ? "sent" : "received"}">
      <div>${message.body}</div>
      <div class="message-meta">${new Date(message.timestamp).toLocaleString()}</div>
    </div>`;
  }).join("");
  messageList.scrollTop = messageList.scrollHeight;
}

messageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminUser) {
    toastError("Admin unavailable");
    return;
  }
  const body = messageInput.value.trim();
  if (!body) {
    toastError("Message cannot be empty");
    return;
  }
  try {
    await api.post("/api/messages", {
      fromUserId: user.id,
      toUserId: adminUser.id,
      body,
    });
    messageInput.value = "";
    await loadMessages();
  } catch (error) {
    toastError(error.message);
  }
});

async function initMessaging() {
  await findAdmin();
  await loadMessages();
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(loadMessages, 5000);
}

async function init() {
  await initCatalog();
  await loadOrders();
  await initMessaging();
}

init();

window.addEventListener("beforeunload", () => {
  if (pollingInterval) clearInterval(pollingInterval);
});
