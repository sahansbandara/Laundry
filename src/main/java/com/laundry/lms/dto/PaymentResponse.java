package com.laundry.lms.dto;

import com.laundry.lms.model.Payment;
import com.laundry.lms.model.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

public class PaymentResponse {

    private Long id;
    private Long orderId;
    private String orderServiceType;
    private BigDecimal amountLkr;
    private String method;
    private String provider;
    private String providerRef;
    private PaymentStatus status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String rawPayloadJson;

    public static PaymentResponse from(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setOrderId(payment.getOrderId());
        response.setAmountLkr(payment.getAmountLkr());
        response.setMethod(payment.getMethod() != null ? payment.getMethod().name() : null);
        response.setProvider(payment.getProvider());
        response.setProviderRef(payment.getProviderRef());
        response.setStatus(payment.getStatus());
        response.setRawPayloadJson(payment.getRawPayloadJson());

        if (payment.getStatus() == PaymentStatus.PAID && payment.getUpdatedAt() != null) {
            response.setPaidAt(LocalDateTime.ofInstant(payment.getUpdatedAt(), ZoneOffset.UTC));
        }
        if (payment.getCreatedAt() != null) {
            response.setCreatedAt(LocalDateTime.ofInstant(payment.getCreatedAt(), ZoneOffset.UTC));
        }
        if (payment.getUpdatedAt() != null) {
            response.setUpdatedAt(LocalDateTime.ofInstant(payment.getUpdatedAt(), ZoneOffset.UTC));
        }
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getOrderServiceType() {
        return orderServiceType;
    }

    public void setOrderServiceType(String orderServiceType) {
        this.orderServiceType = orderServiceType;
    }

    public BigDecimal getAmountLkr() {
        return amountLkr;
    }

    public void setAmountLkr(BigDecimal amountLkr) {
        this.amountLkr = amountLkr;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderRef() {
        return providerRef;
    }

    public void setProviderRef(String providerRef) {
        this.providerRef = providerRef;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getRawPayloadJson() {
        return rawPayloadJson;
    }

    public void setRawPayloadJson(String rawPayloadJson) {
        this.rawPayloadJson = rawPayloadJson;
    }
}
