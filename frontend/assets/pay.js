import { api, toastError, toastSuccess } from "../common.js";

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

const init = () => {
    if (!orderId) {
        setSummary("Missing order reference. Please return to your orders page.");
        submitBtn?.setAttribute("disabled", "true");
        return;
    }

    setSummary(`Order #${orderId} — amounts payable in LKR.`);

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
                if (response?.next) {
                    window.location.assign(response.next);
                    return;
                }
            } else {
                const response = await api.post("/api/payments/checkout", { orderId });
                if (response?.redirectUrl) {
                    toastSuccess("Redirecting to demo checkout…");
                    window.location.assign(response.redirectUrl);
                    return;
                }
            }
            toastError("Unexpected response. Please try again.");
            submitBtn.disabled = false;
        } catch (error) {
            toastError(error?.message || "Payment step failed");
            submitBtn.disabled = false;
        } finally {
            submitBtn.textContent = "Continue";
        }
    });
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
