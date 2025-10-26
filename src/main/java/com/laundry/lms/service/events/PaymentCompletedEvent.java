package com.laundry.lms.service.events;

import java.math.BigDecimal;

public record PaymentCompletedEvent(Long paymentId, Long orderId, BigDecimal amountLkr) {
}
