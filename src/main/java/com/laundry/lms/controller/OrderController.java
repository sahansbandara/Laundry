package com.laundry.lms.controller;

import com.laundry.lms.dto.OrderCreateResponse;
import com.laundry.lms.dto.OrderRequest;
import com.laundry.lms.dto.OrderResponse;
import com.laundry.lms.model.LaundryOrder;
import com.laundry.lms.model.OrderStatus;
import com.laundry.lms.model.PaymentStatus;
import com.laundry.lms.model.User;
import com.laundry.lms.repository.LaundryOrderRepository;
import com.laundry.lms.repository.UserRepository;
import com.laundry.lms.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final LaundryOrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CatalogService catalogService;

    public OrderController(LaundryOrderRepository orderRepository,
                           UserRepository userRepository,
                           CatalogService catalogService) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.catalogService = catalogService;
    }

    @GetMapping
    public List<OrderResponse> getOrders(@RequestParam(required = false) Long userId) {
        List<LaundryOrder> orders = userId != null
                ? orderRepository.findByCustomerId(userId)
                : orderRepository.findAll();
        return orders.stream().map(OrderResponse::from).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long id) {
        Optional<LaundryOrder> orderOpt = orderRepository.findById(id);
        return orderOpt.map(order -> ResponseEntity.ok(OrderResponse.from(order)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@Valid @RequestBody OrderRequest request) {
        if (!catalogService.isValidService(request.getServiceType())) {
            return ResponseEntity.badRequest().body(error("Invalid service type"));
        }
        if (!catalogService.isValidUnit(request.getUnit())) {
            return ResponseEntity.badRequest().body(error("Invalid unit"));
        }

        Optional<User> customerOpt = userRepository.findById(request.getCustomerId());
        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Customer not found"));
        }

        LaundryOrder order = new LaundryOrder();
        order.setCustomer(customerOpt.get());
        order.setServiceType(request.getServiceType());
        order.setQuantity(request.getQuantity());
        order.setUnit(request.getUnit());
        order.setPrice(request.getPrice());
        order.setPickupDate(request.getPickupDate());
        order.setDeliveryDate(request.getDeliveryDate());
        order.setNotes(request.getNotes());

        if (request.getStatus() != null) {
            try {
                order.setStatus(OrderStatus.valueOf(request.getStatus()));
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(error("Invalid order status"));
            }
        }

        order.setPaymentStatus(PaymentStatus.PENDING.name());
        order.setPaymentMethod(null);
        order.setPaidAt(null);

        try {
            LaundryOrder saved = orderRepository.save(order);
            OrderCreateResponse response = new OrderCreateResponse(
                    saved.getId(),
                    String.format("/frontend/pay.html?orderId=%d", saved.getId())
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Failed to create order"));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam("value") String value) {
        Optional<LaundryOrder> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Order not found"));
        }
        try {
            OrderStatus status = OrderStatus.valueOf(value);
            LaundryOrder order = orderOpt.get();
            order.setStatus(status);
            LaundryOrder saved = orderRepository.save(order);
            return ResponseEntity.ok(OrderResponse.from(saved));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error("Invalid order status"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOrder(@PathVariable Long id) {
        if (!orderRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Order not found"));
        }
        orderRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}
