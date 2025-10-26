package com.laundry.lms.service;

import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentMethod;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.PaymentRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
public class PaymentService {

  private final PaymentRepository payments;
  private final LaundryOrderRepository orders;
  private final ApplicationEventPublisher events;

  public PaymentService(PaymentRepository payments, LaundryOrderRepository orders, ApplicationEventPublisher events) {
    this.payments = payments;
    this.orders = orders;
    this.events = events;
  }

  public String makeDemoCheckoutUrl(LaundryOrder order) {
    BigDecimal amount = extractOrderTotal(order);
    return "/frontend/demo-checkout.html?orderId=" + order.getId() + "&amount=" + amount;
  }

  private BigDecimal extractOrderTotal(LaundryOrder order) {
    try {
      var m = order.getClass().getMethod("getTotalAmount");
      Object v = m.invoke(order);
      if (v instanceof BigDecimal bigDecimal) return bigDecimal;
      if (v instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
    } catch (Exception ignored) {}
    return BigDecimal.ZERO;
  }

  @Transactional
  public LaundryOrder confirmCod(Long orderId) {
    LaundryOrder o = orders.findById(orderId).orElseThrow();
    setOrderPaymentMethod(o, "COD");
    setOrderPaymentStatus(o, PaymentStatus.PENDING.name());
    orders.save(o);

    Payment p = payments.findByOrderId(orderId).orElse(new Payment());
    p.setOrderId(orderId);
    p.setProvider("CASH");
    p.setProviderRef(null);
    p.setAmountLkr(extractOrderTotal(o));
    p.setStatus(PaymentStatus.PENDING);
    p.setMethod(PaymentMethod.COD);
    if (p.getCreatedAt() == null) {
      p.setCreatedAt(Instant.now());
    }
    p.setUpdatedAt(Instant.now());
    payments.save(p);
    return o;
  }

  @Transactional
  public void markCardPaid(Long orderId, String providerRef, BigDecimal amount) {
    LaundryOrder o = orders.findById(orderId).orElseThrow();
    setOrderPaymentStatus(o, PaymentStatus.PAID.name());
    setOrderPaidAt(o, Instant.now());
    orders.save(o);

    Payment p = payments.findByOrderId(orderId).orElse(new Payment());
    p.setOrderId(orderId);
    p.setProvider("DEMO");
    p.setProviderRef(providerRef);
    p.setAmountLkr(amount != null ? amount : extractOrderTotal(o));
    p.setStatus(PaymentStatus.PAID);
    p.setMethod(PaymentMethod.CARD);
    if (p.getCreatedAt() == null) {
      p.setCreatedAt(Instant.now());
    }
    p.setUpdatedAt(Instant.now());
    payments.save(p);

    try {
      Class<?> evt = Class.forName("com.laundry.lms.service.events.PaymentCompletedEvent");
      var ctor = evt.getDeclaredConstructor(Long.class, Long.class, BigDecimal.class);
      Object eventObj = ctor.newInstance(p.getId(), orderId, p.getAmountLkr());
      events.publishEvent(eventObj);
    } catch (Throwable ignored) {}
  }

  @Transactional
  public void markFailed(Long orderId, String reason) {
    LaundryOrder o = orders.findById(orderId).orElseThrow();
    setOrderPaymentStatus(o, PaymentStatus.FAILED.name());
    orders.save(o);

    Payment p = payments.findByOrderId(orderId).orElse(new Payment());
    p.setOrderId(orderId);
    p.setProvider("DEMO");
    p.setProviderRef("FAILED");
    p.setStatus(PaymentStatus.FAILED);
    p.setMethod(PaymentMethod.CARD);
    if (p.getCreatedAt() == null) {
      p.setCreatedAt(Instant.now());
    }
    p.setUpdatedAt(Instant.now());
    payments.save(p);

    try {
      Class<?> evt = Class.forName("com.laundry.lms.service.events.PaymentFailedEvent");
      var ctor = evt.getDeclaredConstructor(Long.class, Long.class, String.class);
      Object eventObj = ctor.newInstance(p.getId(), orderId, reason);
      events.publishEvent(eventObj);
    } catch (Throwable ignored) {}
  }

  private void setOrderPaymentMethod(LaundryOrder o, String method) {
    try {
      o.getClass().getMethod("setPaymentMethod", String.class).invoke(o, method);
    } catch (Exception ignored) {}
  }

  private void setOrderPaymentStatus(LaundryOrder o, String status) {
    try {
      o.getClass().getMethod("setPaymentStatus", String.class).invoke(o, status);
    } catch (Exception ignored) {}
  }

  private void setOrderPaidAt(LaundryOrder o, Instant when) {
    try {
      o.getClass().getMethod("setPaidAt", Instant.class).invoke(o, when);
    } catch (Exception ignored) {}
  }
}
