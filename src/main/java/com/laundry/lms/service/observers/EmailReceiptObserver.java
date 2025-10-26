package com.laundry.lms.service.observers;

import com.laundry.lms.service.events.PaymentCompletedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class EmailReceiptObserver {

    private static final Logger log = LoggerFactory.getLogger(EmailReceiptObserver.class);

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        log.info("Email receipt sent for payment {}", event.paymentId());
    }
}
