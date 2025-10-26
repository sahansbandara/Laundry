import { api, toastError, toastSuccess } from "./common.js";

const params = new URLSearchParams(window.location.search);
const orderIdParam = params.get("orderId");
const amountParam = params.get("amount") ?? "0";

const orderId = orderIdParam ? Number(orderIdParam) : NaN;
const amountValue = Number(amountParam);

const orderInfo = document.getElementById("orderInfo");
const successBtn = document.getElementById("successBtn");
const failBtn = document.getElementById("failBtn");

const formatLkr = (value) => {
    const numeric = Number.isFinite(value) ? value : 0;
    return `LKR ${numeric.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

if (!Number.isFinite(orderId) || orderId <= 0) {
    orderInfo.textContent = "Missing order information";
    successBtn.disabled = true;
    failBtn.disabled = true;
} else {
    orderInfo.textContent = `Order #${orderId} – ${formatLkr(Number.isFinite(amountValue) ? amountValue : 0)}`;
}

const setButtonsDisabled = (state) => {
    successBtn.disabled = state;
    failBtn.disabled = state;
};

successBtn?.addEventListener("click", async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) return;
    setButtonsDisabled(true);
    try {
        const ref = `D-${Date.now()}`;
        await api.post("/api/payments/demo/webhook", {
            orderId,
            status: "success",
            demoRef: ref,
            amountLkr: Number.isFinite(amountValue) ? amountValue : 0,
        });
        toastSuccess("Payment successful (demo)");
        window.location.assign("/frontend/dashboard-user.html?paid=1");
    } catch (err) {
        console.error(err);
        toastError(err?.message || "Failed to record payment");
        setButtonsDisabled(false);
    }
});

failBtn?.addEventListener("click", async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) return;
    setButtonsDisabled(true);
    try {
        await api.post("/api/payments/demo/webhook", {
            orderId,
            status: "failed",
            demoRef: `F-${Date.now()}`,
            amountLkr: Number.isFinite(amountValue) ? amountValue : 0,
        });
        toastError("Payment failed (demo)");
        window.location.assign("/frontend/dashboard-user.html?failed=1");
    } catch (err) {
        console.error(err);
        toastError(err?.message || "Failed to report payment failure");
        setButtonsDisabled(false);
    }
});
