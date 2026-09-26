package com.retrouvit.repository;

import com.retrouvit.entity.Role;
import com.retrouvit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByBannedTrue();
    long countByCreatedAtAfter(LocalDateTime date);
    List<User> findByRole(Role role);

    /**
     * AUDIT M4 — débit atomique du portefeuille.
     * La condition WHERE garantit l'invariant solde >= 0 même sous
     * concurrence : deux transactions parallèles ne peuvent pas passer
     * toutes deux la vérification puis débit. Le débit est refusé si le
     * solde courant (en base, verrou de ligne le temps de l'UPDATE) est
     * insuffisant.
     * @return 1 si débit effectué, 0 si solde insuffisant (rows affected)
     */
    @Modifying
    @Query(value = "UPDATE users SET wallet_balance = wallet_balance - :amount " +
            "WHERE id = :userId AND wallet_balance >= :amount", nativeQuery = true)
    int debitWalletAtomically(@Param("userId") Long userId, @Param("amount") long amount);

    /**
     * AUDIT M4 — crédit atomique du portefeuille (release, remboursement,
     * recrédit après rejet de retrait). Idempotent par appel ; le solde ne
     * dépend plus d'un read-modify-write applicatif en course.
     */
    @Modifying
    @Query(value = "UPDATE users SET wallet_balance = wallet_balance + :amount " +
            "WHERE id = :userId", nativeQuery = true)
    int creditWalletAtomically(@Param("userId") Long userId, @Param("amount") long amount);
}
