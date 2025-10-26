package com.laundry.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class DemoWebhookRequest {

    @NotNull
    private Long orderId;

    @NotBlank
    private String status;

    private String demoRef;

    private BigDecimal amountLkr;

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDemoRef() {
        return demoRef;
    }

    public void setDemoRef(String demoRef) {
        this.demoRef = demoRef;
    }

    public BigDecimal getAmountLkr() {
        return amountLkr;
    }

    public void setAmountLkr(BigDecimal amountLkr) {
        this.amountLkr = amountLkr;
    }
}
