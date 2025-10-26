package com.laundry.lms.controller;

import com.laundry.lms.dto.OrderCreateResponse;
import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.OrderStatus;
import com.laundry.lms.repository.LaundryOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final LaundryOrderRepository orderRepository;

    public OrderController(LaundryOrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody LaundryOrder orderRequest) {
        try {
            LaundryOrder saved = orderRepository.save(orderRequest);
            String next = "/frontend/pay.html?orderId=" + saved.getId();
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new OrderCreateResponse(saved.getId(), next));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create order: " + ex.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        return orderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Order not found")));
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(orderRepository.findAll());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam("value") String value) {
        return orderRepository.findById(id)
                .map(order -> {
                    try {
                        OrderStatus status = OrderStatus.valueOf(value);
                        order.setStatus(status);
                        LaundryOrder saved = orderRepository.save(order);
                        return ResponseEntity.ok(saved);
                    } catch (IllegalArgumentException ex) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("error", "Invalid order status"));
                    }
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Order not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!orderRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Order not found"));
        }
        orderRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Order deleted"));
    }
}
