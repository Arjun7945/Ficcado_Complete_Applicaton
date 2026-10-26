package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.OrderStatusNotificationRequest;
import com.aps.ficcado_website_data.entity.OrderNotification;
import com.aps.ficcado_website_data.entity.enums.EmailType;
import com.aps.ficcado_website_data.repository.OrderNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderNotificationService {

    private final OrderNotificationRepository orderNotificationRepository;
    private final EmailService emailService;

    @Transactional
    public OrderNotification processOrderStatus(OrderStatusNotificationRequest request) {
        // Idempotency: Ignore duplicate notifications for the same transaction
        if (orderNotificationRepository.existsByTransactionId(request.transactionId())) {
            log.info("Order status notification for transaction {} already processed (idempotent ignore)",
                    request.transactionId());
            return orderNotificationRepository.findByTransactionId(request.transactionId()).orElse(null);
        }

        String customerName = request.customerName() != null && !request.customerName().isBlank()
                ? request.customerName().trim()
                : "Valued Customer";
        String status = request.status().toUpperCase();
        String subject;
        String bodyText;
        String bodyHtml;

        switch (status) {
            case "COMPLETED" -> {
                String invoice = request.invoiceNumber() != null ? request.invoiceNumber() : "FIC-INV";
                BigDecimal amt = request.amount() != null ? request.amount() : BigDecimal.ZERO;
                subject = "Your Ficcado Order is Confirmed — Invoice " + invoice;
                bodyText = """
                        Hello %s,

                        Thank you for your purchase from Ficcado.
                        Your order has been confirmed successfully!

                        Invoice Number: %s
                        Amount Paid: ₹%s

                        Your items are being packed with care and will be dispatched shortly.

                        Stay chosen,
                        Team Ficcado
                        """.formatted(customerName, invoice, amt);
                bodyHtml = "<p>Hello <strong>" + customerName + "</strong>,</p>"
                        + "<p>Thank you for your purchase from Ficcado. Your order has been confirmed successfully!</p>"
                        + "<p><strong>Invoice Number:</strong> " + invoice + "<br/>"
                        + "<strong>Amount Paid:</strong> ₹" + amt + "</p>"
                        + "<p>Stay chosen,<br/><strong>Team Ficcado</strong></p>";
            }
            case "FAILED" -> {
                String reason = request.failureReason() != null ? request.failureReason() : "Payment was declined by your bank";
                subject = "Ficcado Order Payment Failed";
                bodyText = """
                        Hello %s,

                        We were unable to complete your payment for your recent Ficcado order.
                        Reason: %s

                        No amount was deducted from your account. You can return to your cart and try placing your order again.

                        Best regards,
                        Ficcado Support
                        """.formatted(customerName, reason);
                bodyHtml = "<p>Hello <strong>" + customerName + "</strong>,</p>"
                        + "<p>We were unable to complete your payment for your recent Ficcado order.</p>"
                        + "<p><strong>Reason:</strong> " + reason + "</p>"
                        + "<p>No amount was deducted from your account. You can return to your cart and try placing your order again.</p>"
                        + "<p>Best regards,<br/><strong>Ficcado Support</strong></p>";
            }
            case "REFUND_PENDING", "REFUNDED" -> {
                String reason = request.failureReason() != null ? request.failureReason() : "Inventory sold out prior to finalization";
                BigDecimal amt = request.amount() != null ? request.amount() : BigDecimal.ZERO;
                subject = "Ficcado Order Refund Notice";
                bodyText = """
                        Hello %s,

                        We experienced an issue while finalizing your order: %s.
                        A full refund of ₹%s has been initiated to your original payment method.

                        Please try placing the order again or reach out to our team if you need assistance.

                        Best regards,
                        Ficcado Support
                        """.formatted(customerName, reason, amt);
                bodyHtml = "<p>Hello <strong>" + customerName + "</strong>,</p>"
                        + "<p>We experienced an issue while finalizing your order: " + reason + ".</p>"
                        + "<p>A full refund of <strong>₹" + amt + "</strong> has been initiated to your original payment method.</p>"
                        + "<p>Please try placing the order again or reach out to our team if you need assistance.</p>"
                        + "<p>Best regards,<br/><strong>Ficcado Support</strong></p>";
            }
            default -> {
                subject = "Ficcado Order Status Update";
                bodyText = "Hello " + customerName + ",\n\nYour order status is currently: " + status;
                bodyHtml = "<p>Hello " + customerName + ",<br/>Your order status is: <strong>" + status + "</strong></p>";
            }
        }

        // Send email via existing EmailService (simulated or real SMTP)
        emailService.sendEmail(request.customerEmail(), subject, bodyText, bodyHtml, EmailType.NOTIFICATION);

        OrderNotification notification = OrderNotification.builder()
                .transactionId(request.transactionId())
                .razorpayOrderId(request.razorpayOrderId())
                .orderStatus(status)
                .invoiceNumber(request.invoiceNumber())
                .saleId(request.saleId())
                .customerEmail(request.customerEmail())
                .customerName(customerName)
                .amount(request.amount())
                .message(request.failureReason())
                .emailSent(true)
                .build();

        OrderNotification saved = orderNotificationRepository.save(notification);
        log.info("Recorded order notification [id={}, tx={}, status={}, email={}]",
                saved.getId(), saved.getTransactionId(), saved.getOrderStatus(), saved.getCustomerEmail());

        return saved;
    }
}
