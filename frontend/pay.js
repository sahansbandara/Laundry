(function () {
  const qs = new URLSearchParams(location.search);
  const orderId = qs.get("orderId");
  if (!orderId) {
    alert("Missing order ID");
    return;
  }

  const summary = document.getElementById("orderSummary");
  summary.textContent = `Order #${orderId} – LKR —`;

  const payBtn = document.getElementById("payBtn");
  payBtn.addEventListener("click", async () => {
    const method = document.querySelector('input[name="method"]:checked')?.value;
    if (!method) return alert("Please select a payment method");

    if (method === "COD") {
      try {
        const res = await fetch("http://localhost:8080/api/payments/cod/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        alert("Order confirmed with Cash on Delivery.");
        location.assign(data.next ?? "/frontend/dashboard-user.html?cod=1");
      } catch (err) {
        console.error(err);
        alert("COD confirmation failed");
      }
      return;
    }

    // CARD – redirect to demo checkout
    try {
      const res = await fetch("http://localhost:8080/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      location.assign(data.redirectUrl ?? `/frontend/demo-checkout.html?orderId=${orderId}&amount=0`);
    } catch (err) {
      console.error(err);
      alert("Payment session creation failed");
    }
  });
})();
