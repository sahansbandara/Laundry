package com.laundry.lms.controller;

import com.laundry.lms.dto.CodConfirmRequest;
import com.laundry.lms.dto.DemoWebhookRequest;
import com.laundry.lms.dto.PaymentCheckoutRequest;
import com.laundry.lms.dto.PaymentRequest;
import com.laundry.lms.dto.PaymentResponse;
import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentMethod;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.PaymentRepository;
import com.laundry.lms.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin("*")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final LaundryOrderRepository orderRepository;
    private final PaymentService paymentService;

    public PaymentController(PaymentRepository paymentRepository,
                             LaundryOrderRepository orderRepository,
                             PaymentService paymentService) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }

    @GetMapping
    public List<PaymentResponse> getPayments() {
        return paymentRepository.findAll().stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<?> createPayment(@Valid @RequestBody PaymentRequest request) {
        Optional<LaundryOrder> orderOpt = orderRepository.findById(request.getOrderId());
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Order not found"));
        }

        LaundryOrder order = orderOpt.get();

        Payment payment = new Payment();
        payment.setOrderId(order.getId());
        if (request.getAmount() != null) {
            payment.setAmountLkr(request.getAmount());
        } else if (order.getPrice() != null) {
            payment.setAmountLkr(order.getPrice());
        }
        if (request.getMethod() != null) {
            PaymentMethod method = resolveMethod(request.getMethod());
            if (method == null) {
                return ResponseEntity.badRequest().body(error("Invalid payment method"));
            }
            payment.setMethod(method);
        }
        if (request.getStatus() != null) {
            PaymentStatus status = resolveStatus(request.getStatus());
            if (status == null) {
                return ResponseEntity.badRequest().body(error("Invalid payment status"));
            }
            payment.setStatus(status);
        }
        payment.setProvider(request.getProvider());
        payment.setProviderRef(request.getProviderRef());
        payment.setRawPayloadJson(request.getRawPayloadJson());

        Payment saved = paymentRepository.save(payment);
        return ResponseEntity.status(HttpStatus.CREATED).body(PaymentResponse.from(saved));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam("value") String value) {
        Optional<Payment> paymentOpt = paymentRepository.findById(id);
        if (paymentOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Payment not found"));
        }
        PaymentStatus status = resolveStatus(value);
        if (status == null) {
            return ResponseEntity.badRequest().body(error("Invalid payment status"));
        }
        Payment payment = paymentOpt.get();
        payment.setStatus(status);
        Payment saved = paymentRepository.save(payment);
        return ResponseEntity.ok(PaymentResponse.from(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePayment(@PathVariable Long id) {
        if (!paymentRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Payment not found"));
        }
        paymentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cod/confirm")
    public ResponseEntity<?> confirmCod(@Valid @RequestBody CodConfirmRequest request) {
        try {
            paymentService.confirmCod(request.orderId());
            Map<String, String> payload = new HashMap<>();
            payload.put("next", String.format("/orders/%d?cod=1", request.orderId()));
            return ResponseEntity.ok(payload);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        }
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> createCheckout(@Valid @RequestBody PaymentCheckoutRequest request) {
        try {
            String redirectUrl = paymentService.createDemoCheckout(request.orderId());
            Map<String, String> payload = new HashMap<>();
            payload.put("redirectUrl", redirectUrl);
            return ResponseEntity.ok(payload);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        }
    }

    @PostMapping("/demo/webhook")
    public ResponseEntity<?> handleDemoWebhook(@Valid @RequestBody DemoWebhookRequest request) {
        String status = request.status();
        try {
            if ("success".equalsIgnoreCase(status)) {
                paymentService.markCardPaid(request.orderId(), request.demoRef(), request.amountLkr());
            } else {
                paymentService.markFailed(request.orderId(), "demo-failed");
            }
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        }
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }

    private PaymentStatus resolveStatus(String value) {
        if (value == null) {
            return null;
        }
        String upper = value.trim().toUpperCase();
        if ("COMPLETED".equals(upper)) {
            return PaymentStatus.PAID;
        }
        try {
            return PaymentStatus.valueOf(upper);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private PaymentMethod resolveMethod(String value) {
        if (value == null) {
            return null;
        }
        String upper = value.trim().toUpperCase();
        try {
            return PaymentMethod.valueOf(upper);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
