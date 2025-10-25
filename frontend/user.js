import {
    api,
    requireAuth,
    toastError,
    clearCurrentUser,
    renderStatusBadge,
} from "./common.js";

const user = requireAuth("USER");

const logoutBtn = document.getElementById("logout-user");
const ordersBody = document.getElementById("user-orders-body");
const messageList = document.getElementById("user-message-list");
const messageForm = document.getElementById("user-message-form");
const messageInput = document.getElementById("user-message-input");
const placeOrderMount = document.getElementById("placeOrderMount");

let adminUser = null;
let pollingInterval = null;

if (user) {
    logoutBtn?.addEventListener("click", (event) => {
        event.preventDefault();
        clearCurrentUser();
        window.location.href = "/frontend/login.html";
    });
}

async function mountPlaceOrderUI() {
    if (!placeOrderMount) return;
    placeOrderMount.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "embed-loader";
    loading.textContent = "Loading Place Order UI…";
    placeOrderMount.appendChild(loading);

    try {
        const response = await fetch("/frontend/place-order.html", { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Unable to fetch place-order.html");
        }
        const markup = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(markup, "text/html");

        document.head.querySelectorAll("style[data-source='place-order']").forEach((node) => node.remove());
        doc.querySelectorAll("style").forEach((styleEl, index) => {
            const clone = styleEl.cloneNode(true);
            clone.dataset.source = "place-order";
            document.head.appendChild(clone);
        });

        const fragment = document.createDocumentFragment();
        const header = doc.querySelector("body > header");
        const main = doc.querySelector("body > main");
        const modalRoot = doc.getElementById("modalRoot");

        placeOrderMount.innerHTML = "";
        [header, main, modalRoot].forEach((node) => {
            if (node) {
                fragment.appendChild(node.cloneNode(true));
            }
        });
        placeOrderMount.appendChild(fragment);

        const scriptNodes = doc.querySelectorAll("script");
        scriptNodes.forEach((original) => {
            const script = document.createElement("script");
            script.type = original.type || "text/javascript";
            script.dataset.source = "place-order";
            if (original.src) {
                script.src = original.src;
            } else {
                script.textContent = original.textContent;
            }
            placeOrderMount.appendChild(script);
        });

        if (document.readyState !== "loading") {
            setTimeout(() => {
                document.dispatchEvent(new Event("DOMContentLoaded"));
            }, 0);
        }
    } catch (error) {
        console.error(error);
        placeOrderMount.innerHTML = "";
        const alert = document.createElement("div");
        alert.className = "alert alert-error";
        alert.textContent = "Failed to load Place Order UI";
        placeOrderMount.appendChild(alert);
    }
}

async function loadOrders() {
    if (!ordersBody) return;
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
        ordersBody.innerHTML = `<tr><td colspan="7" class="empty">No orders yet. Place one above!</td></tr>`;
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
    if (!messageList) return;
    if (!adminUser) {
        messageList.innerHTML = `<p class="muted">Administrator unavailable.</p>`;
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
        messageList.innerHTML = `<p class="muted">Start the conversation!</p>`;
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

if (user) {
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
}

async function initMessaging() {
    await findAdmin();
    await loadMessages();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(loadMessages, 5000);
}

window.addEventListener("beforeunload", () => {
    if (pollingInterval) clearInterval(pollingInterval);
});

if (user) {
    mountPlaceOrderUI();
    loadOrders();
    initMessaging();
}
