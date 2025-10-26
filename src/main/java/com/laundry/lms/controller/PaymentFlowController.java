package com.laundry.lms.controller;

import com.laundry.lms.dto.CodConfirmRequest;
import com.laundry.lms.dto.DemoWebhookRequest;
import com.laundry.lms.dto.NextUrlResponse;
import com.laundry.lms.dto.PaymentCheckoutRequest;
import com.laundry.lms.dto.RedirectUrlResponse;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentFlowController {

  private final PaymentService payments;
  private final LaundryOrderRepository orders;

  public PaymentFlowController(PaymentService payments, LaundryOrderRepository orders) {
    this.payments = payments;
    this.orders = orders;
  }

  @PostMapping("/cod/confirm")
  public ResponseEntity<?> confirmCod(@Valid @RequestBody CodConfirmRequest req) {
    try {
      var o = payments.confirmCod(req.orderId());
      String next = "/frontend/dashboard-user.html?cod=1&orderId=" + o.getId();
      return ResponseEntity.ok(new NextUrlResponse(next));
    } catch (Exception ex) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
  }

  @PostMapping("/checkout")
  public ResponseEntity<?> checkout(@Valid @RequestBody PaymentCheckoutRequest req) {
    var opt = orders.findById(req.orderId());
    if (opt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .body(Map.of("error", "Order not found"));
    }
    String url = payments.makeDemoCheckoutUrl(opt.get());
    return ResponseEntity.ok(new RedirectUrlResponse(url));
  }

  @PostMapping("/demo/webhook")
  public ResponseEntity<?> webhook(@Valid @RequestBody DemoWebhookRequest req) {
    try {
      if ("success".equalsIgnoreCase(req.status())) {
        payments.markCardPaid(req.orderId(), req.demoRef(), req.amountLkr());
        return ResponseEntity.ok(Map.of("status", "PAID"));
      } else {
        payments.markFailed(req.orderId(), "demo-failed");
        return ResponseEntity.ok(Map.of("status", "FAILED"));
      }
    } catch (Exception ex) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
  }
}
