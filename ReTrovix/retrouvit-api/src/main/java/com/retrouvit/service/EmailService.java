package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${app.url:http://localhost:3000}")
    private String appUrl;

    @Value("${app.name:RetrouvIt}")
    private String appName;

    /**
     * Send a critical alert email to all admin users.
     * Runs async to not block the alert scheduler.
     */
    @Async
    public void sendCriticalAlertToAdmins(AdminAlert alert) {
        try {
            List<User> admins = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equals(u.getRole()))
                    .filter(u -> !Boolean.TRUE.equals(u.getBanned()))
                    .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                    .toList();

            if (admins.isEmpty()) {
                log.warn("No admin users found to send critical alert email");
                return;
            }

            String htmlContent = buildCriticalAlertHtml(alert);

            for (User admin : admins) {
                try {
                    sendHtmlEmail(
                            admin.getEmail(),
                            "🔴 Alerte critique - " + alert.getTitle(),
                            htmlContent
                    );
                    log.info("Critical alert email sent to admin: {}", admin.getEmail());
                } catch (Exception e) {
                    log.error("Failed to send email to {}: {}", admin.getEmail(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Failed to send critical alert emails: {}", e.getMessage());
        }
    }

    /**
     * Send a level-change notification when an alert escalates to CRITICAL.
     */
    @Async
    public void sendAlertEscalationEmail(AdminAlert alert, AlertLevel previousLevel) {
        try {
            List<User> admins = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equals(u.getRole()))
                    .filter(u -> !Boolean.TRUE.equals(u.getBanned()))
                    .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                    .toList();

            if (admins.isEmpty()) return;

            String htmlContent = buildEscalationHtml(alert, previousLevel);

            for (User admin : admins) {
                try {
                    sendHtmlEmail(
                            admin.getEmail(),
                            "⚠️ Alerte escaladée - " + alert.getTitle(),
                            htmlContent
                    );
                } catch (Exception e) {
                    log.error("Failed to send escalation email to {}: {}", admin.getEmail(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Failed to send escalation emails: {}", e.getMessage());
        }
    }

    /**
     * Send a generic HTML email.
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("noreply@retrouvit.com");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    /**
     * Build HTML email for a critical alert.
     */
    private String buildCriticalAlertHtml(AdminAlert alert) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                                <!-- Header -->
                                <tr>
                                    <td style="background-color:#ef4444;padding:24px 32px;text-align:center;">
                                        <h1 style="color:#ffffff;margin:0;font-size:24px;">🔴 Alerte Critique</h1>
                                        <p style="color:#fca5a5;margin:8px 0 0;font-size:14px;">%s</p>
                                    </td>
                                </tr>
                                <!-- Content -->
                                <tr>
                                    <td style="padding:32px;">
                                        <h2 style="color:#1e293b;margin:0 0 16px;font-size:18px;">%s</h2>
                                        <p style="color:#475569;line-height:1.6;margin:0 0 24px;font-size:15px;">%s</p>

                                        <!-- Stats box -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
                                            <tr>
                                                <td style="padding:16px;">
                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="padding:4px 0;">
                                                                <span style="color:#64748b;font-size:13px;">Valeur actuelle</span>
                                                            </td>
                                                            <td align="right" style="padding:4px 0;">
                                                                <strong style="color:#dc2626;font-size:15px;">%d</strong>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:4px 0;">
                                                                <span style="color:#64748b;font-size:13px;">Seuil critique</span>
                                                            </td>
                                                            <td align="right" style="padding:4px 0;">
                                                                <strong style="color:#64748b;font-size:15px;">%d</strong>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:4px 0;">
                                                                <span style="color:#64748b;font-size:13px;">Catégorie</span>
                                                            </td>
                                                            <td align="right" style="padding:4px 0;">
                                                                <code style="background:#fee2e2;padding:2px 8px;border-radius:4px;font-size:13px;color:#991b1b;">%s</code>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:4px 0;">
                                                                <span style="color:#64748b;font-size:13px;">Date</span>
                                                            </td>
                                                            <td align="right" style="padding:4px 0;">
                                                                <span style="color:#1e293b;font-size:13px;">%s</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- CTA -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center">
                                                    <a href="%s/admin" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Ouvrir le Dashboard</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color:#f1f5f9;padding:16px 32px;text-align:center;">
                                        <p style="color:#94a3b8;margin:0;font-size:12px;">
                                            %s · Cet email a été envoyé automatiquement.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                now,
                escapeHtml(alert.getTitle()),
                escapeHtml(alert.getMessage()),
                alert.getCurrentValue(),
                alert.getThresholdValue(),
                escapeHtml(alert.getCategory()),
                now,
                appUrl,
                appName
        );
    }

    /**
     * Build HTML email for alert escalation (WARNING → CRITICAL).
     */
    private String buildEscalationHtml(AdminAlert alert, AlertLevel previousLevel) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                                <!-- Header -->
                                <tr>
                                    <td style="background-color:#f59e0b;padding:24px 32px;text-align:center;">
                                        <h1 style="color:#ffffff;margin:0;font-size:24px;">⚠️ Alerte Escaladée</h1>
                                        <p style="color:#fde68a;margin:8px 0 0;font-size:14px;">Niveau passé de %s à CRITIQUE</p>
                                    </td>
                                </tr>
                                <!-- Content -->
                                <tr>
                                    <td style="padding:32px;">
                                        <h2 style="color:#1e293b;margin:0 0 16px;font-size:18px;">%s</h2>
                                        <p style="color:#475569;line-height:1.6;margin:0 0 24px;font-size:15px;">%s</p>

                                        <!-- CTA -->
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center">
                                                    <a href="%s/admin" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Voir dans le Dashboard</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color:#f1f5f9;padding:16px 32px;text-align:center;">
                                        <p style="color:#94a3b8;margin:0;font-size:12px;">
                                            %s · Cet email a été envoyé automatiquement.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """.formatted(
                previousLevel,
                escapeHtml(alert.getTitle()),
                escapeHtml(alert.getMessage()),
                appUrl,
                appName
        );
    }

    // ════════════════════════════════════════════════════════════
    // Dispute emails
    // ════════════════════════════════════════════════════════════

    @Async
    public void sendDisputeFiledEmail(ReturnRequest request) {
        try {
            String subject = "🔴 Litige signalé - " + request.getReference();
            String html = buildDisputeFiledHtml(request);

            // Notify both parties
            sendToUser(request.getLoser(), subject, html);
            sendToUser(request.getFinder(), subject, html);

            // Notify all admins
            sendToAdmins(subject, html);

            log.info("Dispute filed email sent for return {}", request.getReference());
        } catch (Exception e) {
            log.error("Failed to send dispute filed email: {}", e.getMessage());
        }
    }

    @Async
    public void sendDisputeResolvedEmail(ReturnRequest request) {
        try {
            String subject = "✅ Litige résolu - " + request.getReference();
            String html = buildDisputeResolvedHtml(request);

            sendToUser(request.getLoser(), subject, html);
            sendToUser(request.getFinder(), subject, html);

            log.info("Dispute resolved email sent for return {}", request.getReference());
        } catch (Exception e) {
            log.error("Failed to send dispute resolved email: {}", e.getMessage());
        }
    }

    @Async
    public void sendReturnCompletedEmail(ReturnRequest request) {
        try {
            String subject = "🎉 Échange terminé - " + request.getReference();
            String html = buildReturnCompletedHtml(request);

            sendToUser(request.getLoser(), subject, html);
            sendToUser(request.getFinder(), subject, html);

            log.info("Return completed email sent for return {}", request.getReference());
        } catch (Exception e) {
            log.error("Failed to send return completed email: {}", e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────

    private void sendToUser(User user, String subject, String html) {
        if (user != null && user.getEmail() != null && !user.getEmail().isBlank()) {
            try {
                sendHtmlEmail(user.getEmail(), subject, html);
            } catch (Exception e) {
                log.error("Failed to send email to {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    private void sendToAdmins(String subject, String html) {
        userRepository.findAll().stream()
                .filter(u -> "ADMIN".equals(u.getRole().name()))
                .filter(u -> !Boolean.TRUE.equals(u.getBanned()))
                .forEach(admin -> sendToUser(admin, subject, html));
    }

    private String buildDisputeFiledHtml(ReturnRequest request) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String objectTitle = request.getLostObject() != null ? request.getLostObject().getTitle() : (request.getFoundObject() != null ? request.getFoundObject().getTitle() : "Objet");
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
            <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                <tr><td style="background:#ef4444;padding:24px 32px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">🔴 Litige Signalé</h1>
                    <p style="color:#fca5a5;margin:8px 0 0;font-size:13px;">Réf: %s</p>
                </td></tr>
                <tr><td style="padding:32px;">
                    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">Un litige a été signalé pour l'échange concernant <strong>%s</strong>.</p>
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:20px;">
                        <tr><td style="padding:16px;">
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Raison :</strong> %s</p>
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Propriétaire :</strong> %s</p>
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Retrouveur :</strong> %s</p>
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Récompense :</strong> %s XAF</p>
                        </td></tr>
                    </table>
                    <a href="%s/admin/disputes" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Gérer le litige</a>
                </td></tr>
                <tr><td style="background:#f1f5f9;padding:16px 32px;text-align:center;">
                    <p style="color:#94a3b8;margin:0;font-size:12px;">%s · %s</p>
                </td></tr>
            </table></td></tr></table>
            </body></html>
            """.formatted(
                escapeHtml(request.getReference()),
                escapeHtml(objectTitle),
                escapeHtml(request.getDisputeReason()),
                escapeHtml(request.getLoser().getName()),
                escapeHtml(request.getFinder().getName()),
                request.getAcceptedAmount() != null ? String.format("%,d", request.getAcceptedAmount()) : "N/A",
                appUrl + "/admin/disputes",
                now, appName
        );
    }

    private String buildDisputeResolvedHtml(ReturnRequest request) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String objectTitle = request.getLostObject() != null ? request.getLostObject().getTitle() : (request.getFoundObject() != null ? request.getFoundObject().getTitle() : "Objet");
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
            <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                <tr><td style="background:#22c55e;padding:24px 32px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">✅ Litige Résolu</h1>
                    <p style="color:#bbf7d0;margin:8px 0 0;font-size:13px;">Réf: %s</p>
                </td></tr>
                <tr><td style="padding:32px;">
                    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">Le litige pour <strong>%s</strong> a été résolu par l'équipe RetrouvIt.</p>
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:20px;">
                        <tr><td style="padding:16px;">
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Résolution :</strong> %s</p>
                        </td></tr>
                    </table>
                    <a href="%s/return/%d" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Voir les détails</a>
                </td></tr>
                <tr><td style="background:#f1f5f9;padding:16px 32px;text-align:center;">
                    <p style="color:#94a3b8;margin:0;font-size:12px;">%s · %s</p>
                </td></tr>
            </table></td></tr></table>
            </body></html>
            """.formatted(
                escapeHtml(request.getReference()),
                escapeHtml(objectTitle),
                escapeHtml(request.getDisputeResolution()),
                appUrl, request.getId(),
                now, appName
        );
    }

    private String buildReturnCompletedHtml(ReturnRequest request) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String objectTitle = request.getLostObject() != null ? request.getLostObject().getTitle() : (request.getFoundObject() != null ? request.getFoundObject().getTitle() : "Objet");
        long finderPayment = request.getPaymentAmount() != null ? request.getPaymentAmount() : 0;
        long platformFee = request.getPlatformFee() != null ? request.getPlatformFee() : 0;
        return """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
            <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                <tr><td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:24px 32px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">🎉 Échange Terminé !</h1>
                    <p style="color:#bbf7d0;margin:8px 0 0;font-size:13px;">Réf: %s</p>
                </td></tr>
                <tr><td style="padding:32px;">
                    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">L'échange pour <strong>%s</strong> s'est terminé avec succès.</p>
                    <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:20px;">
                        <tr><td style="padding:16px;">
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Récompense :</strong> %s XAF</p>
                            <p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Frais plateforme (15%%) :</strong> %s XAF</p>
                            <p style="color:#16a34a;font-size:15px;margin:8px 0 0;font-weight:700;"><strong>Retrouveur reçoit : %s XAF</strong></p>
                        </td></tr>
                    </table>
                    <p style="color:#64748b;font-size:13px;margin:0 0 20px;">N'oubliez pas de vous mutuellement noter pour améliorer les scores de confiance !</p>
                    <a href="%s/return/%d" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Noter l'échange</a>
                </td></tr>
                <tr><td style="background:#f1f5f9;padding:16px 32px;text-align:center;">
                    <p style="color:#94a3b8;margin:0;font-size:12px;">%s · %s</p>
                </td></tr>
            </table></td></tr></table>
            </body></html>
            """.formatted(
                escapeHtml(request.getReference()),
                escapeHtml(objectTitle),
                String.format("%,d", request.getAcceptedAmount() != null ? request.getAcceptedAmount() : 0),
                String.format("%,d", platformFee),
                String.format("%,d", finderPayment),
                appUrl, request.getId(),
                now, appName
        );
    }

    /**
     * Escape HTML to prevent injection in email templates.
     */
    private String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
