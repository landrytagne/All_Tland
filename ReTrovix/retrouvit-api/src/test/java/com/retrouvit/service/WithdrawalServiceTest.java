package com.retrouvit.service;

import com.retrouvit.dto.WithdrawalResponse;
import com.retrouvit.entity.*;
import com.retrouvit.repository.AdminAlertRepository;
import com.retrouvit.repository.UserRepository;
import com.retrouvit.repository.WithdrawalRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("WithdrawalService — Tests unitaires (CDC §5.4/§8.2)")
class WithdrawalServiceTest {

    @Mock
    private WithdrawalRequestRepository withdrawalRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionService transactionService;

    @Mock
    private PlatformSettingsService platformSettingsService;

    @Mock
    private PaymentGatewayService paymentGateway;

    @Mock
    private AdminAlertRepository adminAlertRepository;

    @InjectMocks
    private WithdrawalService withdrawalService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L).name("Landry").email("landry@test.com").password("x")
                .role(Role.USER).trustScore(50).walletBalance(500_000L).build();

        // AUDIT M4 : les opérations wallet sont maintenant ATOMIQUES en base.
        // On simule l'effet réel sur l'entité pour que les assertions de solde
        // continuent de vérifier l'invariant (débit refuses si solde insuffisant).
        when(userRepository.debitWalletAtomically(anyLong(), anyLong())).thenAnswer(inv -> {
            Long uid = inv.getArgument(0);
            Long amt = inv.getArgument(1);
            if (!uid.equals(user.getId())) return 0;
            if (user.getWalletBalance() < amt) return 0;
            user.setWalletBalance(user.getWalletBalance() - amt);
            return 1;
        });
        when(userRepository.creditWalletAtomically(anyLong(), anyLong())).thenAnswer(inv -> {
            Long uid = inv.getArgument(0);
            Long amt = inv.getArgument(1);
            if (!uid.equals(user.getId())) return 0;
            user.setWalletBalance(user.getWalletBalance() + amt);
            return 1;
        });
    }

    private void stubSave() {
        when(withdrawalRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(inv -> {
                    WithdrawalRequest w = inv.getArgument(0);
                    if (w.getId() == null) w.setId(1L);
                    return w;
                });
    }

    @Test
    @DisplayName("withdraw — sous le seuil : soumis directement au provider et COMPLETED")
    void withdraw_belowThreshold_submittedDirectly() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(platformSettingsService.getSettingAsInt("withdraw_manual_review_min")).thenReturn(100_000);
        stubSave();
        when(paymentGateway.submitWithdrawal(anyString(), anyString(), any(), anyLong()))
                .thenReturn("EXT-OK-1234567890AB");
        when(paymentGateway.isWithdrawalConfirmed(anyString())).thenReturn(true);

        WithdrawalResponse response = withdrawalService.requestWithdrawal(1L, "MTN_MOMO", "+237600000001", 50_000L);

        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        // Solde débité, pas de recrédit
        assertThat(user.getWalletBalance()).isEqualTo(450_000L);
        verify(transactionService).createTransaction(eq(1L), eq(TransactionType.WITHDRAWAL), eq(50_000L), anyString());
        verifyNoInteractions(adminAlertRepository);
    }

    @Test
    @DisplayName("withdraw — au-dessus du seuil : PENDING_REVIEW + alerte anti-fraude (CDC §8.2)")
    void withdraw_aboveThreshold_pendingReview() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(platformSettingsService.getSettingAsInt("withdraw_manual_review_min")).thenReturn(100_000);
        stubSave();

        WithdrawalResponse response = withdrawalService.requestWithdrawal(1L, "MTN_MOMO", "+237600000001", 200_000L);

        assertThat(response.getStatus()).isEqualTo("PENDING_REVIEW");
        assertThat(user.getWalletBalance()).isEqualTo(300_000L); // débité en attente
        verify(adminAlertRepository).save(any(AdminAlert.class));
        verify(paymentGateway, never()).submitWithdrawal(anyString(), anyString(), any(), anyLong());
    }

    @Test
    @DisplayName("reviewWithdrawal — rejet finance : statut REJECTED + recrédit du solde")
    void review_rejected_refundsUser() {
        WithdrawalRequest pending = WithdrawalRequest.builder()
                .id(1L).user(user).reference("WD-AB12CD34").amount(200_000L)
                .method("MTN_MOMO").status(WithdrawalStatus.PENDING_REVIEW).build();

        when(withdrawalRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(withdrawalRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        WithdrawalResponse response = withdrawalService.reviewWithdrawal(1L, 9L, false, "Doute sur l'identité");

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(user.getWalletBalance()).isEqualTo(700_000L); // 500k + 200k recrédités
        verify(transactionService).createTransaction(eq(1L), eq(TransactionType.REFUND), eq(200_000L), anyString());
        assertThat(pending.getReviewedBy()).isEqualTo(9L);
    }

    @Test
    @DisplayName("reviewWithdrawal — validation finance : soumis au provider et COMPLETED")
    void review_approved_submitsToProvider() {
        // Simulation de l'état réel : le solde a déjà été débité à la demande
        user.setWalletBalance(300_000L);
        WithdrawalRequest pending = WithdrawalRequest.builder()
                .id(1L).user(user).reference("WD-AB12CD34").amount(200_000L)
                .method("MTN_MOMO").status(WithdrawalStatus.PENDING_REVIEW).build();

        when(withdrawalRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(withdrawalRepository.save(any(WithdrawalRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(paymentGateway.submitWithdrawal(anyString(), anyString(), any(), anyLong()))
                .thenReturn("EXT-OK-1234567890AB");
        when(paymentGateway.isWithdrawalConfirmed(anyString())).thenReturn(true);

        WithdrawalResponse response = withdrawalService.reviewWithdrawal(1L, 9L, true, null);

        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        assertThat(user.getWalletBalance()).isEqualTo(300_000L); // reste débité (pas de recrédit)
        verify(transactionService).createTransaction(eq(1L), eq(TransactionType.WITHDRAWAL), eq(200_000L), anyString());
    }

    @Test
    @DisplayName("withdraw — solde insuffisant : exception, rien n'est débité")
    void withdraw_insufficientBalance_throws() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() ->
                withdrawalService.requestWithdrawal(1L, "MTN_MOMO", "+237600000001", 600_000L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Solde insuffisant");

        assertThat(user.getWalletBalance()).isEqualTo(500_000L);
        verify(withdrawalRepository, never()).save(any());
    }

    @Test
    @DisplayName("withdraw — échec provider : statut FAILED + recrédit automatique")
    void withdraw_providerFailure_refunds() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(platformSettingsService.getSettingAsInt("withdraw_manual_review_min")).thenReturn(100_000);
        stubSave();
        when(paymentGateway.submitWithdrawal(anyString(), anyString(), any(), anyLong()))
                .thenReturn("EXT-KO-1234567890AB");
        when(paymentGateway.isWithdrawalConfirmed(anyString())).thenReturn(false);

        WithdrawalResponse response = withdrawalService.requestWithdrawal(1L, "MTN_MOMO", "+237600000001", 50_000L);

        assertThat(response.getStatus()).isEqualTo("FAILED");
        assertThat(user.getWalletBalance()).isEqualTo(500_000L); // recrédité
        verify(transactionService).createTransaction(eq(1L), eq(TransactionType.REFUND), eq(50_000L), anyString());
    }
}
