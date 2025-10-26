package com.laundry.lms.dto;

import jakarta.validation.constraints.NotNull;

public class CodConfirmRequest {

    @NotNull
    private Long orderId;

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
}
