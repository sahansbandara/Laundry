package com.laundry.lms.repository;

import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByStatus(PaymentStatus status);

    Optional<Payment> findTopByOrderIdOrderByUpdatedAtDesc(Long orderId);
}
