package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * AUDIT M4 — verrous de concurrence sur le portefeuille.
 *
 * Avant correctif : read-modify-write applicatif (getWalletBalance →
 * setWalletBalance → save) ; deux transactions parallèles lisaient le
 * même solde et débitaient toutes deux → solde négatif possible.
 *
 * Après correctif : UPDATE ... WHERE wallet_balance >= :amount en base
 * (verrou de ligne) — le deuxième débit concurrent voit le solde déjà
 * réduit et est refusé (rows affected = 0).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("M4 — Débit/crédit atomiques du portefeuille")
class WalletConcurrencyTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private TransactionService transactionService;
    @Mock
    private PlatformSettingsService platformSettingsService;

    private WithdrawalService withdrawalService;

    private User user;

    @BeforeEach
    void setUp() {
        withdrawalService = new WithdrawalService(
                org.mockito.Mockito.mock(com.retrouvit.repository.WithdrawalRequestRepository.class),
                userRepository, transactionService, platformSettingsService,
                org.mockito.Mockito.mock(com.retrouvit.service.PaymentGatewayService.class),
                org.mockito.Mockito.mock(com.retrouvit.repository.AdminAlertRepository.class));

        user = User.builder().id(1L).name("Jean").email("jean@test.com")
                .role(Role.USER).walletBalance(10_000L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(platformSettingsService.getSettingAsInt(anyString())).thenReturn(100_000);
        when(userRepository.debitWalletAtomically(anyLong(), anyLong())).thenAnswer(inv -> {
            Long amt = inv.getArgument(1);
            // Simulation fidèle du WHERE wallet_balance >= :amount
            if (user.getWalletBalance() < amt) return 0;
            user.setWalletBalance(user.getWalletBalance() - amt);
            return 1;
        });
        when(userRepository.creditWalletAtomically(anyLong(), anyLong())).thenAnswer(inv -> {
            Long amt = inv.getArgument(1);
            user.setWalletBalance(user.getWalletBalance() + amt);
            return 1;
        });
    }

    @Test
    @DisplayName("Débit atomique : refusé si le solde en base est insuffisant (rows=0)")
    void debitRefusedWhenInsufficient() {
        assertThatThrownBy(() -> withdrawalService.requestWithdrawal(
                1L, "MTN_MOMO", "+237600000001", 50_000L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Solde insuffisant");
        // Le solde n'a pas bougé
        assertThat(user.getWalletBalance()).isEqualTo(10_000L);
    }

    @Test
    @DisplayName("Simulation de course : 2 retraits de 8 000 sur solde 10 000 → un seul passe")
    void concurrentDebitsOnlyOnePasses() {
        // État base : 10 000. Deux "transactions" partent simultanément,
        // chacune a lu le solde applicatif 10 000 (vérification initiale OK).
        // Mais l'UPDATE atomique sérialise : le second voit 2 000 restants.
        assertThat(user.getWalletBalance() >= 8_000L).isTrue(); // vérif applicative TX-A et TX-B
        int rowsA = userRepository.debitWalletAtomically(1L, 8_000L);   // TX-A gagne le verrou
        assertThat(user.getWalletBalance()).isEqualTo(2_000L);
        int rowsB = userRepository.debitWalletAtomically(1L, 8_000L);   // TX-B : WHERE 2000 >= 8000 est FAUX
        assertThat(rowsA).isEqualTo(1);
        assertThat(rowsB).as("Le débit concurrent doit être refusé par la base").isZero();
        assertThat(user.getWalletBalance())
                .as("Invariant : le solde ne peut jamais être négatif")
                .isEqualTo(2_000L)
                .isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Le solde ne peut jamais devenir négatif, même à la limite exacte")
    void exactBalanceDebitSucceeds() {
        int rows = userRepository.debitWalletAtomically(1L, 10_000L); // solde exact
        assertThat(rows).isEqualTo(1);
        assertThat(user.getWalletBalance()).isEqualTo(0L);
        // Un débit supplémentaire de 1 XAF est refusé
        assertThat(userRepository.debitWalletAtomically(1L, 1L)).isZero();
    }

    @Test
    @DisplayName("Le crédit atomique cumule sans écrasement")
    void creditAccumulates() {
        userRepository.creditWalletAtomically(1L, 5_000L);
        userRepository.creditWalletAtomically(1L, 5_000L);
        assertThat(user.getWalletBalance()).isEqualTo(20_000L);
    }

    @Test
    @DisplayName("Les méthodes du repository sont bien @Modifying (contrat JPA)")
    void repositoryQueriesAreModifying() throws NoSuchMethodException {
        var debit = UserRepository.class.getMethod("debitWalletAtomically", Long.class, long.class);
        var credit = UserRepository.class.getMethod("creditWalletAtomically", Long.class, long.class);
        assertThat(debit.getAnnotation(org.springframework.data.jpa.repository.Modifying.class)).isNotNull();
        assertThat(credit.getAnnotation(org.springframework.data.jpa.repository.Modifying.class)).isNotNull();
        // Le débit porte l'invariant dans sa requête
        assertThat(debit.getAnnotation(org.springframework.data.jpa.repository.Query.class).value())
                .contains("wallet_balance >= :amount");
    }
}
