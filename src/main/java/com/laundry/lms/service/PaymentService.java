package com.laundry.lms.service;

import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentMethod;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.PaymentRepository;
import com.laundry.lms.service.events.PaymentCompletedEvent;
import com.laundry.lms.service.events.PaymentFailedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final LaundryOrderRepository laundryOrderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PaymentService(PaymentRepository paymentRepository,
                          LaundryOrderRepository laundryOrderRepository,
                          ApplicationEventPublisher eventPublisher) {
        this.paymentRepository = paymentRepository;
        this.laundryOrderRepository = laundryOrderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public String createDemoCheckout(Long orderId) {
        LaundryOrder order = loadOrder(orderId);
        BigDecimal amount = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;

        Payment payment = paymentRepository.findTopByOrderIdOrderByUpdatedAtDesc(orderId)
                .orElseGet(() -> {
                    Payment p = new Payment();
                    p.setOrderId(orderId);
                    return p;
                });
        payment.setAmountLkr(amount);
        payment.setMethod(PaymentMethod.CARD);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setProvider("DEMO");
        paymentRepository.save(payment);

        order.setPaymentMethod(PaymentMethod.CARD.name());
        order.setPaymentStatus(PaymentStatus.PENDING.name());
        order.setPaidAt(null);
        laundryOrderRepository.save(order);

        String amountParam = amount == null ? "0" : amount.stripTrailingZeros().toPlainString();
        return String.format("/pay/demo-checkout.html?orderId=%d&amount=%s&currency=LKR", orderId, amountParam);
    }

    @Transactional
    public void markCardPaid(Long orderId, String providerRef, BigDecimal amountLkr) {
        LaundryOrder order = loadOrder(orderId);
        BigDecimal resolvedAmount = amountLkr != null ? amountLkr : order.getPrice();
        if (resolvedAmount == null) {
            resolvedAmount = BigDecimal.ZERO;
        }

        Payment payment = paymentRepository.findTopByOrderIdOrderByUpdatedAtDesc(orderId)
                .orElseGet(() -> {
                    Payment p = new Payment();
                    p.setOrderId(orderId);
                    return p;
                });
        payment.setMethod(PaymentMethod.CARD);
        payment.setStatus(PaymentStatus.PAID);
        payment.setProvider("DEMO");
        payment.setProviderRef(providerRef);
        payment.setAmountLkr(resolvedAmount);
        Payment saved = paymentRepository.save(payment);

        order.setPaymentMethod(PaymentMethod.CARD.name());
        order.setPaymentStatus(PaymentStatus.PAID.name());
        order.setPaidAt(Instant.now());
        laundryOrderRepository.save(order);

        eventPublisher.publishEvent(new PaymentCompletedEvent(saved.getId(), orderId, resolvedAmount));
    }

    @Transactional
    public void markFailed(Long orderId, String reason) {
        LaundryOrder order = loadOrder(orderId);

        Payment payment = paymentRepository.findTopByOrderIdOrderByUpdatedAtDesc(orderId)
                .orElseGet(() -> {
                    Payment p = new Payment();
                    p.setOrderId(orderId);
                    p.setAmountLkr(order.getPrice());
                    p.setMethod(PaymentMethod.CARD);
                    return p;
                });
        payment.setStatus(PaymentStatus.FAILED);
        payment.setProvider("DEMO");
        Payment saved = paymentRepository.save(payment);

        if (payment.getMethod() != null) {
            order.setPaymentMethod(payment.getMethod().name());
        }
        order.setPaymentStatus(PaymentStatus.FAILED.name());
        order.setPaidAt(null);
        laundryOrderRepository.save(order);

        eventPublisher.publishEvent(new PaymentFailedEvent(saved.getId(), orderId, reason));
    }

    @Transactional
    public void confirmCod(Long orderId) {
        LaundryOrder order = loadOrder(orderId);
        BigDecimal amount = order.getPrice() != null ? order.getPrice() : BigDecimal.ZERO;

        Payment payment = paymentRepository.findTopByOrderIdOrderByUpdatedAtDesc(orderId)
                .orElseGet(() -> {
                    Payment p = new Payment();
                    p.setOrderId(orderId);
                    return p;
                });
        payment.setMethod(PaymentMethod.COD);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setProvider("CASH");
        payment.setProviderRef(null);
        payment.setAmountLkr(amount);
        paymentRepository.save(payment);

        order.setPaymentMethod(PaymentMethod.COD.name());
        order.setPaymentStatus(PaymentStatus.PENDING.name());
        order.setPaidAt(null);
        laundryOrderRepository.save(order);
    }

    private LaundryOrder loadOrder(Long orderId) {
        return laundryOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
    }
}
