package com.laundry.lms.controller;

import com.laundry.lms.dto.OrderCreateResponse;
import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.OrderStatus;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.model.User;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final LaundryOrderRepository orderRepository;
    private final UserRepository userRepository;

    public OrderController(LaundryOrderRepository orderRepository, UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
    }

    /** Create order and tell frontend where to go next (payment page). */
    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody LaundryOrder orderRequest) {
        try {
            if (orderRequest.getCustomer() == null || orderRequest.getCustomer().getId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Customer is required"));
            }

            Optional<User> customerOpt = userRepository.findById(orderRequest.getCustomer().getId());
            if (customerOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
            }

            if (orderRequest.getPrice() == null || orderRequest.getPrice().signum() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Order total must be greater than zero"));
            }

            if (orderRequest.getServiceType() == null || orderRequest.getServiceType().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Service type is required"));
            }

            if (orderRequest.getQuantity() == null || orderRequest.getQuantity() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Quantity must be greater than zero"));
            }

            orderRequest.setId(null);
            orderRequest.setCustomer(customerOpt.get());
            orderRequest.setStatus(OrderStatus.PENDING);
            orderRequest.setPaymentStatus(PaymentStatus.PENDING.name());
            orderRequest.setPaymentMethod(null);
            orderRequest.setPaidAt(null);

            LaundryOrder saved = orderRepository.save(orderRequest);
            String next = "/frontend/pay.html?orderId=" + saved.getId();
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new OrderCreateResponse(saved.getId(), next));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create order: " + ex.getMessage()));
        }
    }

    /** Get one order (avoid Optional generic clash). */
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        var opt = orderRepository.findById(id);
        if (opt.isPresent()) return ResponseEntity.ok(opt.get());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found"));
    }

    /** List all orders. */
    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(orderRepository.findAll());
    }

    /** Delete an order. */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!orderRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Order not found"));
        }
        orderRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Order deleted"));
    }
}
