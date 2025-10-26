package com.laundry.lms.service.events;

public record PaymentFailedEvent(Long paymentId, Long orderId, String reason) {
}
