package com.laundry.lms.dto;

public class OrderCreateResponse {

    private Long orderId;
    private String next;

    public OrderCreateResponse() {
    }

    public OrderCreateResponse(Long orderId, String next) {
        this.orderId = orderId;
        this.next = next;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getNext() {
        return next;
    }

    public void setNext(String next) {
        this.next = next;
    }
}
