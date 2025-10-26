import { api, toastError, toastSuccess } from "./common.js";

const params = new URLSearchParams(window.location.search);
const orderId = Number.parseInt(params.get("orderId"), 10);

const summaryEl = document.getElementById("orderSummary");
const feedbackEl = document.getElementById("payFeedback");
const submitBtn = document.getElementById("paySubmit");
const form = document.getElementById("payForm");

const radios = Array.from(form?.querySelectorAll('input[name="payment"]') ?? []);

const setSummary = (message) => {
    if (!summaryEl) return;
    summaryEl.textContent = message;
};

const setFeedback = (message, tone = "info") => {
    if (!feedbackEl) return;
    feedbackEl.textContent = message || "";
    feedbackEl.dataset.tone = tone;
};

const codFallback = () => "/frontend/dashboard-user.html?cod=1";
const cardFallback = (amountLkr) => {
    const amount = amountLkr ?? params.get("amount") ?? "";
    const amountQuery = amount !== "" ? `&amount=${encodeURIComponent(amount)}` : "";
    return `/frontend/demo-checkout.html?orderId=${encodeURIComponent(orderId)}${amountQuery}`;
};

const init = () => {
    if (!orderId) {
        setSummary("Missing order reference. Please return to your orders page.");
        submitBtn?.setAttribute("disabled", "true");
        return;
    }

    setSummary(`Order #${orderId} — payable in LKR.`);

    radios.forEach((radio) => {
        radio.addEventListener("change", () => {
            setFeedback("", "info");
        });
    });

    submitBtn?.addEventListener("click", async () => {
        const selected = radios.find((radio) => radio.checked);
        if (!selected) {
            setFeedback("Select a payment option to continue.", "error");
            return;
        }

        setFeedback("", "info");
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing…";

        try {
            if (selected.value === "COD") {
                const response = await api.post("/api/payments/cod/confirm", { orderId });
                toastSuccess("COD confirmed. Payment due at delivery.");
                const next = response?.next ?? codFallback();
                window.location.assign(next);
                return;
            }

            const response = await api.post("/api/payments/checkout", { orderId });
            const fallbackUrl = cardFallback(response?.amountLkr ?? response?.amount);
            const redirectUrl = response?.redirectUrl ?? fallbackUrl;
            toastSuccess("Redirecting to demo checkout…");
            window.location.assign(redirectUrl);
        } catch (error) {
            toastError(error?.message || "Payment step failed");
            submitBtn.disabled = false;
            submitBtn.textContent = "Continue";
        }
    });
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
