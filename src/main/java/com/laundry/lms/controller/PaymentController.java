package com.laundry.lms.controller;

import com.laundry.lms.dto.*;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {
  private final PaymentService payments;
  private final LaundryOrderRepository orders;

  public PaymentController(PaymentService payments, LaundryOrderRepository orders) {
    this.payments = payments; this.orders = orders;
  }

  @PostMapping("/cod/confirm")
  public ResponseEntity<?> confirmCod(@RequestBody CodConfirmRequest request) {
    try {
      var o = payments.confirmCod(request.orderId());
      return ResponseEntity.ok(new NextUrlResponse("/frontend/dashboard-user.html?cod=1&orderId=" + o.getId()));
    } catch (Exception ex) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
  }

  @PostMapping("/checkout")
  public ResponseEntity<?> checkout(@RequestBody PaymentCheckoutRequest request) {
    var opt = orders.findById(request.orderId());
    if (opt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error","Order not found"));
    String redirect = payments.makeDemoCheckoutUrl(opt.get());
    return ResponseEntity.ok(new RedirectUrlResponse(redirect));
  }

  @PostMapping("/demo/webhook")
  public ResponseEntity<?> webhook(@RequestBody DemoWebhookRequest request) {
    try {
      if ("success".equalsIgnoreCase(request.status())) {
        payments.markCardPaid(request.orderId(), request.demoRef(), request.amountLkr());
        return ResponseEntity.ok(Map.of("status","PAID"));
      } else {
        payments.markFailed(request.orderId(), "demo-failed");
        return ResponseEntity.ok(Map.of("status","FAILED"));
      }
    } catch (Exception ex) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
  }
}
