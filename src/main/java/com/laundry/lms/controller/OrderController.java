package com.laundry.lms.controller;

import com.laundry.lms.dto.OrderCreateResponse;
import com.laundry.lms.model.LaundryOrder;
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

    /** Create order and tell frontend where to go next (payment page). */
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
