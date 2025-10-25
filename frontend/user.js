import {
    api,
    requireAuth,
    toastError,
    toastSuccess,
    clearCurrentUser,
    renderStatusBadge,
} from "./common.js";

const user = requireAuth("USER");

/* --- DOM hooks --- */
const logoutBtn = document.getElementById("logout-user");
const placeOrderMount = document.getElementById("placeOrderMount");

/* KPIs */
const kpiActive = document.getElementById("kpiActive");
const kpiSpent  = document.getElementById("kpiSpent");
const kpiPickup = document.getElementById("kpiPickup");

/* Orders */
const ordersBody = document.getElementById("user-orders-body");
const orderSearch = document.getElementById("orderSearch");
const orderStatus = document.getElementById("orderStatus");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo    = document.getElementById("pageInfo");

/* Support */
const messageList  = document.getElementById("user-message-list");
const messageForm  = document.getElementById("user-message-form");
const messageInput = document.getElementById("user-message-input");

/* State */
let adminUser = null;
let pollingInterval = null;

let ordersAll = [];
let filtered = [];
let page = 1;
const pageSize = 5;

/* --- Logout --- */
logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = "/frontend/login.html";
});

/* =========================
   Place Order – embed hero
   ========================= */
async function mountPlaceOrderUI() {
    if (!placeOrderMount) return;
    placeOrderMount.innerHTML = `<div class="embed-loader">Loading Place Order UI…</div>`;

    try {
        const res = await fetch("./place-order.html", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to fetch place-order.html");
        const html = await res.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // move inline <style> from place-order into <head> (namespaced)
        document.head
            .querySelectorAll("style[data-source='place-order']")
            .forEach((n) => n.remove());
        doc.querySelectorAll("style").forEach((s) => {
            const clone = s.cloneNode(true);
            clone.dataset.source = "place-order";
            document.head.appendChild(clone);
        });

        // inject header+main+modalRoot content
        const fragment = document.createDocumentFragment();
        ["header", "main", "#modalRoot"].forEach((sel) => {
            const node = sel.startsWith("#")
                ? doc.querySelector(sel)
                : doc.querySelector(`body > ${sel}`);
            if (node) fragment.appendChild(node.cloneNode(true));
        });

        placeOrderMount.innerHTML = "";
        placeOrderMount.appendChild(fragment);

        // execute any inline scripts inside place-order.html
        doc.querySelectorAll("script").forEach((orig) => {
            const s = document.createElement("script");
            s.type = orig.type || "text/javascript";
            s.dataset.source = "place-order";
            if (orig.src) s.src = orig.src;
            else s.textContent = orig.textContent;
            placeOrderMount.appendChild(s);
        });

        // signal DOMContentLoaded in case their code expects it
        if (document.readyState !== "loading") {
            setTimeout(() => document.dispatchEvent(new Event("DOMContentLoaded")), 0);
        }
    } catch (err) {
        console.error(err);
        placeOrderMount.innerHTML = `<div class="alert alert-error">Failed to load Place Order UI</div>`;
    }
}

/* =================
   Orders + KPIs
   ================= */
async function fetchOrders() {
    try {
        const data = await api.get(`/api/orders?userId=${user.id}`);
        ordersAll = Array.isArray(data) ? data : [];
    } catch (err) {
        // Demo-friendly fallback
        console.warn("Orders API failed, using fallback:", err?.message);
        ordersAll = [
            { id: 2, serviceType: "Wash & Fold", quantity: "3 Kg", price: 2188, status: "DELIVERED", pickupDate: "2025-10-23", deliveryDate: "2025-10-31" },
            { id: 3, serviceType: "Dry Cleaning", quantity: "5 Items", price: 2073, status: "READY", pickupDate: "2025-10-24", deliveryDate: "2025-10-28" },
            { id: 5, serviceType: "Bedding", quantity: "2 Sets", price: 1318, status: "PENDING", pickupDate: "2025-10-24", deliveryDate: "2025-10-29" },
            { id: 8, serviceType: "Stain Removal", quantity: "1 Items", price: 1649, status: "DELIVERED", pickupDate: "2025-10-23", deliveryDate: "2025-10-27" },
            { id:10, serviceType: "Stain Removal", quantity: "5 Kg", price: 1997, status: "CANCELLED", pickupDate: "2025-10-25", deliveryDate: "2025-10-25" },
        ];
    }
}

function applyFilters() {
    const q = (orderSearch?.value || "").toLowerCase();
    const st = orderStatus?.value || "ALL";

    filtered = ordersAll.filter((o) => {
        const matchesQ = !q || `${o.id} ${o.serviceType} ${o.quantity}`.toLowerCase().includes(q);
        const matchesS = st === "ALL" || o.status === st;
        return matchesQ && matchesS;
    });

    // clamp page
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, totalPages);

    renderOrders();
    renderPagination();
    computeKPIs();
}

function renderOrders() {
    if (!ordersBody) return;
    if (filtered.length === 0) {
        ordersBody.innerHTML = `<tr><td colspan="7" class="muted">No orders found.</td></tr>`;
        return;
    }

    const start = (page - 1) * pageSize;
    const end   = Math.min(start + pageSize, filtered.length);
    const slice = filtered.slice(start, end);

    ordersBody.innerHTML = slice.map((o) => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.serviceType}</td>
      <td>${o.quantity}</td>
      <td>${Number(o.price).toLocaleString()}</td>
      <td>${renderStatusBadge(o.status)}</td>
      <td>${o.pickupDate || "-"}</td>
      <td>${o.deliveryDate || "-"}</td>
    </tr>
  `).join("");

    pageInfo.textContent = `Showing ${filtered.length ? start + 1 : 0}–${end} of ${filtered.length}`;
}

function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPages;
}

prevPageBtn?.addEventListener("click", () => { if (page > 1) { page--; renderOrders(); renderPagination(); } });
nextPageBtn?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page < totalPages) { page++; renderOrders(); renderPagination(); }
});
orderSearch?.addEventListener("input", () => { page = 1; applyFilters(); });
orderStatus?.addEventListener("change", () => { page = 1; applyFilters(); });

function computeKPIs() {
    const activeStatuses = new Set(["PENDING","IN_PROGRESS","READY"]);
    const activeCount = ordersAll.filter(o => activeStatuses.has(o.status)).length;

    const spent = ordersAll
        .filter(o => ["DELIVERED","COMPLETED","READY","IN_PROGRESS","PENDING"].includes(o.status))
        .reduce((sum,o)=> sum + (Number(o.price)||0), 0);

    const pickups = ordersAll.map(o => new Date(o.pickupDate)).filter(d => !isNaN(d.getTime()));
    const lastPickup = pickups.length ? pickups.sort((a,b)=>b-a)[0] : null;

    kpiActive.textContent = `${activeCount}`;
    kpiSpent.textContent  = Number(spent).toLocaleString();
    kpiPickup.textContent = lastPickup ? lastPickup.toLocaleDateString() : "—";
}

/* =================
   Support Messaging
   ================= */
async function findAdmin() {
    try {
        const list = await api.get("/api/admin/users");
        adminUser = (list || []).find(u => u.role === "ADMIN") || null;
    } catch {
        // fake admin fallback
        adminUser = { id: 1, name: "SmartFold Support", role: "ADMIN" };
    }
}

async function loadMessages() {
    if (!messageList) return;
    if (!adminUser) {
        messageList.innerHTML = `<p class="muted">Support is unavailable right now.</p>`;
        return;
    }
    try {
        const msgs = await api.get(`/api/messages?withUserId=${adminUser.id}&currentUserId=${user.id}`);
        renderMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
        console.warn("Messages API failed, using demo:", err?.message);
        // demo messages
        renderMessages([
            { fromUserId: user.id, body:"Hello team, checking on order update #4", timestamp: new Date().toISOString() },
            { fromUserId: adminUser.id, body:"Hi Ruwan, your order is cancelled.", timestamp: new Date().toISOString() },
            { fromUserId: user.id, body:"Hello team, checking on order update #5", timestamp: new Date().toISOString() },
            { fromUserId: adminUser.id, body:"Hi Ruwan, your order is ready.", timestamp: new Date().toISOString() },
        ]);
    }
}

function renderMessages(list) {
    if (!messageList) return;
    if (!list.length) {
        messageList.innerHTML = `<p class="muted">Start a conversation with Support.</p>`;
        return;
    }
    messageList.innerHTML = list.map(m => {
        const mine = m.fromUserId === user.id;
        return `
      <div class="message-bubble ${mine ? "sent" : "received"}">
        <div>${m.body}</div>
        <div class="message-meta">${new Date(m.timestamp).toLocaleString()}</div>
      </div>
    `;
    }).join("");
    messageList.scrollTop = messageList.scrollHeight;
}

messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = messageInput.value.trim();
    if (!body) return;

    if (!adminUser) {
        toastError("Support unavailable");
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
    } catch (err) {
        toastError(err.message || "Failed to send");
    }
});

async function initSupport() {
    await findAdmin();
    await loadMessages();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(loadMessages, 5000);
}
window.addEventListener("beforeunload", () => pollingInterval && clearInterval(pollingInterval));

/* =================
   Boot
   ================= */
(async function boot(){
    if (!user) return;
    await mountPlaceOrderUI();
    await fetchOrders();
    applyFilters();         // renders + KPIs
    await initSupport();
    toastSuccess("Welcome back!");
})();
