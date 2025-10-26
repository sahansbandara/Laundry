package com.laundry.lms.service.observers;

import com.laundry.lms.service.events.PaymentCompletedEvent;
import com.laundry.lms.service.events.PaymentFailedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class DashboardObserver {

    private static final Logger log = LoggerFactory.getLogger(DashboardObserver.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        log.info("Dashboard: PAID {}", event.orderId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentFailed(PaymentFailedEvent event) {
        log.info("Dashboard: FAILED {}", event.orderId());
    }
}
