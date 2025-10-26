package com.laundry.lms.dto;

import java.math.BigDecimal;

public record DemoWebhookRequest(Long orderId, String status, String demoRef, BigDecimal amountLkr) {}
