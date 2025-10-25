import {
    api,
    requireAuth,
    toastError,
    clearCurrentUser,
    renderStatusBadge,
} from "./common.js";

// ✅ Require login as USER
const user = requireAuth("USER");

// ✅ Element references
const logoutBtn = document.getElementById("logout-user");
const ordersBody = document.getElementById("user-orders-body");
const messageList = document.getElementById("user-message-list");
const messageForm = document.getElementById("user-message-form");
const messageInput = document.getElementById("user-message-input");
const placeOrderMount = document.getElementById("placeOrderMount");

let adminUser = null;
let pollingInterval = null;

// ✅ Logout handler (use relative path)
if (user && logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        clearCurrentUser();
        window.location.href = "./login.html";
    });
}

// ✅ Inject Place Order UI dynamically
async function mountPlaceOrderUI() {
    if (!placeOrderMount) return;

    placeOrderMount.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "embed-loader";
    loading.textContent = "Loading Place Order UI…";
    placeOrderMount.appendChild(loading);

    try {
        const response = await fetch("./place-order.html", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to fetch place-order.html");

        const markup = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(markup, "text/html");

        // ✅ Remove any previous injected styles
        document.head.querySelectorAll("style[data-source='place-order']").forEach((node) => node.remove());

        // ✅ Copy style blocks from place-order.html into <head>
        doc.querySelectorAll("style").forEach((styleEl) => {
            const clone = styleEl.cloneNode(true);
            clone.dataset.source = "place-order";
            document.head.appendChild(clone);
        });

        // ✅ Build DOM fragment from fetched UI
        const fragment = document.createDocumentFragment();
        const header = doc.querySelector("body > header");
        const main = doc.querySelector("body > main");
        const modalRoot = doc.getElementById("modalRoot");

        placeOrderMount.innerHTML = "";
        [header, main, modalRoot].forEach((node) => {
            if (node) fragment.appendChild(node.cloneNode(true));
        });
        placeOrderMount.appendChild(fragment);

        // ✅ Execute scripts from place-order.html
        const scriptNodes = doc.querySelectorAll("script");
        scriptNodes.forEach((original) => {
            const script = document.createElement("script");
            script.type = original.type || "text/javascript";
            script.dataset.source = "place-order";
            if (original.src) {
                // Convert relative URLs safely
                const src = original.src.startsWith("http")
                    ? original.src
                    : new URL(original.getAttribute("src"), window.location.href).href;
                script.src = src;
            } else {
                script.textContent = original.textContent;
            }
            placeOrderMount.appendChild(script);
        });

        // ✅ Trigger DOMContentLoaded for any inline JS
        if (document.readyState !== "loading") {
            setTimeout(() => document.dispatchEvent(new Event("DOMContentLoaded")), 0);
        }
    } catch (error) {
        console.error("❌ Place Order UI load failed:", error);
        placeOrderMount.innerHTML = `<div class="alert alert-error">Failed to load Place Order UI</div>`;
    }
}

// ✅ Load user orders
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

    ordersBody.innerHTML = data.map((order) => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.serviceType}</td>
        <td>${order.quantity} ${order.unit}</td>
        <td>${Number(order.price).toLocaleString()}</td>
        <td>${renderStatusBadge(order.status)}</td>
        <td>${order.pickupDate || "-"}</td>
        <td>${order.deliveryDate || "-"}</td>
      </tr>
    `).join("");
}

// ✅ Admin / Messaging Logic
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
        return `
          <div class="message-bubble ${isUser ? "sent" : "received"}">
            <div>${message.body}</div>
            <div class="message-meta">${new Date(message.timestamp).toLocaleString()}</div>
          </div>`;
    }).join("");

    messageList.scrollTop = messageList.scrollHeight;
}

// ✅ Handle send message form
if (user && messageForm) {
    messageForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!adminUser) return toastError("Admin unavailable");
        const body = messageInput.value.trim();
        if (!body) return toastError("Message cannot be empty");

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

// ✅ Init Messaging
async function initMessaging() {
    await findAdmin();
    await loadMessages();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(loadMessages, 5000);
}

// ✅ Cleanup before unload
window.addEventListener("beforeunload", () => {
    if (pollingInterval) clearInterval(pollingInterval);
});

// ✅ Run all
if (user) {
    mountPlaceOrderUI();
    loadOrders();
    initMessaging();
}
