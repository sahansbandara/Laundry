import { api, toastError, toastSuccess } from "./common.js";

const params = new URLSearchParams(window.location.search);
const orderIdParam = params.get("orderId");
const orderId = orderIdParam ? Number(orderIdParam) : NaN;

const summaryEl = document.getElementById("orderSummary");
const detailsEl = document.getElementById("orderDetails");
const payBtn = document.getElementById("payBtn");

let orderTotal = 0;

const formatLkr = (value) => {
    const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `LKR ${numeric.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatDate = (value) => {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("en-LK", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch (err) {
        return value;
    }
};

async function loadOrder() {
    if (!Number.isFinite(orderId) || orderId <= 0) {
        toastError("Missing order ID");
        summaryEl.textContent = "Order not found.";
        payBtn.disabled = true;
        return;
    }

    try {
        summaryEl.textContent = "Loading order details…";
        payBtn.disabled = true;

        const order = await api.get(`/api/orders/${orderId}`);
        const priceValue = order?.price ?? order?.totalAmount ?? 0;
        const numericPrice = Number(priceValue);
        orderTotal = Number.isFinite(numericPrice) ? numericPrice : 0;

        summaryEl.textContent = `Order #${orderId} — ${formatLkr(orderTotal)}`;

        const service = order?.serviceType ?? "Laundry";
        const pickup = formatDate(order?.pickupDate);
        const delivery = formatDate(order?.deliveryDate);
        const paymentStatus = order?.paymentStatus ?? "PENDING";
        detailsEl.textContent = `${service} • Pickup ${pickup} • Delivery ${delivery} • Payment ${paymentStatus}`;

        const status = typeof paymentStatus === "string" ? paymentStatus.toUpperCase() : "";
        if (status === "PAID") {
            toastSuccess("This order has already been paid.");
            payBtn.textContent = "Payment complete";
            payBtn.disabled = true;
            return;
        }

        payBtn.disabled = false;
    } catch (err) {
        console.error(err);
        toastError(err?.message || "Failed to load order details");
        summaryEl.textContent = "Unable to load order details.";
        detailsEl.textContent = "";
        payBtn.disabled = true;
    }
}

payBtn?.addEventListener("click", async () => {
    const method = document.querySelector('input[name="method"]:checked')?.value;
    if (!method) {
        toastError("Select a payment method");
        return;
    }
    if (!Number.isFinite(orderId) || orderId <= 0) {
        toastError("Missing order ID");
        return;
    }

    const originalLabel = payBtn.textContent;
    payBtn.disabled = true;
    payBtn.textContent = "Processing…";

    try {
        if (method === "COD") {
            const data = await api.post("/api/payments/cod/confirm", { orderId });
            toastSuccess("Cash on delivery confirmed.");
            const nextUrl = data?.next ?? "/frontend/dashboard-user.html?cod=1";
            window.location.assign(nextUrl);
            return;
        }

        const data = await api.post("/api/payments/checkout", { orderId });
        const fallback = `/frontend/demo-checkout.html?orderId=${orderId}&amount=${orderTotal.toFixed?.(2) ?? orderTotal}`;
        const redirectUrl = data?.redirectUrl ?? fallback;
        window.location.assign(redirectUrl);
    } catch (err) {
        console.error(err);
        toastError(err?.message || "Failed to initiate payment");
        payBtn.disabled = false;
        payBtn.textContent = originalLabel;
    }
});

loadOrder();
