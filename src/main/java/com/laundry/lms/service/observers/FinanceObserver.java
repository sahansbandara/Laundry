package com.laundry.lms.service.observers;

import com.laundry.lms.service.events.PaymentCompletedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class FinanceObserver {

    private static final Logger log = LoggerFactory.getLogger(FinanceObserver.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        log.info("Finance updated for order {}", event.orderId());
    }
}
