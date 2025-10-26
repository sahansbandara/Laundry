
package com.laundry.lms.service;

import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.PaymentRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.Instant;

@Service
public class PaymentService {
  private final PaymentRepository payments;
  private final LaundryOrderRepository orders;
  private final ApplicationEventPublisher events;

  public PaymentService(PaymentRepository payments, LaundryOrderRepository orders, ApplicationEventPublisher events) {
    this.payments = payments; this.orders = orders; this.events = events;
  }

  public String makeDemoCheckoutUrl(LaundryOrder order) {
    BigDecimal amount = extractOrderTotal(order);
    return "/frontend/demo-checkout.html?orderId=" + order.getId() + "&amount=" + amount;
  }

  private BigDecimal extractOrderTotal(LaundryOrder o) {
    for (String name : new String[]{"getPrice","getTotal","getTotalAmount"}) {
      try { Method m = o.getClass().getMethod(name); Object v = m.invoke(o);
        if (v instanceof BigDecimal b) return b;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
      } catch (Exception ignored) {}
    }
    return BigDecimal.ZERO;
  }

  private void setOrderPaymentMethod(LaundryOrder o, String v) {
    try { o.getClass().getMethod("setPaymentMethod", String.class).invoke(o, v); } catch (Exception ignored) {}
  }
  private void setOrderPaymentStatus(LaundryOrder o, String v) {
    try { o.getClass().getMethod("setPaymentStatus", String.class).invoke(o, v); } catch (Exception ignored) {}
  }
  private void setOrderPaidAt(LaundryOrder o, Instant t) {
    try { o.getClass().getMethod("setPaidAt", Instant.class).invoke(o, t); } catch (Exception ignored) {}
  }

  @Transactional
  public LaundryOrder confirmCod(Long orderId) {
    var o = orders.findById(orderId).orElseThrow();
    setOrderPaymentMethod(o, "COD");
    setOrderPaymentStatus(o, PaymentStatus.PENDING.name());
    orders.save(o);

    var p = payments.findByOrderId(orderId).orElse(new Payment());
    p.setOrderId(orderId);
    p.setProvider("CASH");
    p.setAmountLkr(extractOrderTotal(o));
    p.setStatus(PaymentStatus.PENDING);
    p.setCreatedAt(p.getCreatedAt() == null ? Instant.now() : p.getCreatedAt());
    p.setUpdatedAt(Instant.now());
    payments.save(p);
    return o;
  }

  @Transactional
  public void markCardPaid(Long orderId, String ref, BigDecimal amt) {
    var o = orders.findById(orderId).orElseThrow();
    setOrderPaymentStatus(o, PaymentStatus.PAID.name());
    setOrderPaidAt(o, Instant.now());
    orders.save(o);

    var p = payments.findByOrderId(orderId).orElse(new Payment());
    p.setOrderId(orderId);
    p.setProvider("DEMO");
    p.setProviderRef(ref);
    p.setAmountLkr(amt != null ? amt : extractOrderTotal(o));
    p.setStatus(PaymentStatus.PAID);
    p.setCreatedAt(p.getCreatedAt() == null ? Instant.now() : p.getCreatedAt());
    p.setUpdatedAt(Instant.now());
    payments.save(p);

    try {
      Class<?> evt = Class.forName("com.laundry.lms.service.events.PaymentCompletedEvent");
      var ctor = evt.getDeclaredConstructor(Long.class, Long.class, BigDecimal.class);
      events.publishEvent(ctor.newInstance(p.getId(), orderId, p.getAmountLkr()));
    } catch (Throwable ignored) {}
  }

  @Transactional
  public void markFailed(Long orderId, String reason) {
    var o = orders.findById(orderId).orElseThrow();
    setOrderPaymentStatus(o, PaymentStatus.FAILED.name());
    orders.save(o);

    var p = payments.findByOrderId(orderId).orElse(new Payment());
    p.setOrderId(orderId);
    p.setProvider("DEMO");
    p.setProviderRef("FAILED");
    p.setStatus(PaymentStatus.FAILED);
    p.setUpdatedAt(Instant.now());
    payments.save(p);

    try {
      Class<?> evt = Class.forName("com.laundry.lms.service.events.PaymentFailedEvent");
      var ctor = evt.getDeclaredConstructor(Long.class, Long.class, String.class);
      events.publishEvent(ctor.newInstance(p.getId(), orderId, reason));
    } catch (Throwable ignored) {}
  }
}
