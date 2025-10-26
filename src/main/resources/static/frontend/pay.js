(function () {
  const qs = new URLSearchParams(location.search);
  const orderId = qs.get("orderId");
  const base = ""; // served by Spring static → same-origin (http://localhost:8080)
  if (!orderId) { alert("Missing order ID"); return; }

  // Optional: fetch order total for nicer UI (ignore errors)
  (async () => {
    const el = document.getElementById("orderSummary");
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const o = await res.json();
        const amt = (o.price ?? o.total ?? 0);
        el.textContent = `Order #${orderId} — LKR ${amt}`;
      } else {
        el.textContent = `Order #${orderId} — LKR —`;
      }
    } catch {
      el.textContent = `Order #${orderId} — LKR —`;
    }
  })();

  const btn = document.getElementById("payBtn");
  btn?.addEventListener("click", async () => {
    const method = document.querySelector('input[name="method"]:checked')?.value;
    if (!method) return alert("Please select a payment method");

    if (method === "COD") {
      try {
        const res = await fetch(`/api/payments/cod/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "COD failed");
        location.assign(data.next ?? "/frontend/dashboard-user.html?cod=1");
      } catch (e) {
        console.error(e);
        alert("COD confirmation failed");
      }
      return;
    }

    // CARD demo
    try {
      const res = await fetch(`/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout failed");
      location.assign(data.redirectUrl ?? `/frontend/demo-checkout.html?orderId=${orderId}&amount=0`);
    } catch (e) {
      console.error(e);
      alert("Payment session creation failed");
    }
  });
})();
