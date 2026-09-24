package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.repository.EscrowRepository;
import com.retrouvit.repository.UserRepository;
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

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EscrowService — Protection double-release et idempotence")
class EscrowServiceTest {

    @Mock private EscrowRepository escrowRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private EscrowService escrowService;

    private User owner;
    private User finder;
    private Escrow escrow;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(1L).name("Owner").walletBalance(50000L).role(Role.USER).build();
        finder = User.builder().id(2L).name("Finder").walletBalance(0L).role(Role.USER).build();
        escrow = Escrow.builder()
                .id(1L).reference("ESC-TEST")
                .buyer(owner).seller(finder)
                .amount(15000L)
                .deadline(LocalDate.now().plusDays(7))
                .status(EscrowStatus.RETURN_CONFIRMED)
                .build();

        when(escrowRepository.save(any(Escrow.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Nested
    @DisplayName("Double-release protection")
    class DoubleReleaseProtection {

        @Test
        @DisplayName("❌ Bloque le release si déjà RELEASED")
        void release_alreadyReleased() {
            escrow.setStatus(EscrowStatus.RELEASED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            assertThatThrownBy(() -> escrowService.releaseEscrow(1L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà été libéré");
        }

        @Test
        @DisplayName("❌ Bloque le release si déjà COMPLETED")
        void release_alreadyCompleted() {
            escrow.setStatus(EscrowStatus.COMPLETED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            assertThatThrownBy(() -> escrowService.releaseEscrow(1L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà été libéré");
        }

        @Test
        @DisplayName("❌ Bloque le release pendant un litige")
        void release_duringDispute() {
            escrow.setStatus(EscrowStatus.DISPUTED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            assertThatThrownBy(() -> escrowService.releaseEscrow(1L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("litige");
        }

        @Test
        @DisplayName("✅ Release autorisé depuis RETURN_CONFIRMED")
        void release_fromReturnConfirmed() {
            escrow.setStatus(EscrowStatus.RETURN_CONFIRMED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            escrowService.releaseEscrow(1L, 1L);

            assertThat(escrow.getStatus()).isEqualTo(EscrowStatus.RELEASED);
            verify(escrowRepository).save(escrow);
        }
    }

    @Nested
    @DisplayName("Double-refund protection")
    class DoubleRefundProtection {

        @Test
        @DisplayName("❌ Bloque le refund si déjà REFUNDED")
        void refund_alreadyRefunded() {
            escrow.setStatus(EscrowStatus.REFUNDED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            assertThatThrownBy(() -> escrowService.refundEscrow(1L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà été remboursé");
        }

        @Test
        @DisplayName("❌ Bloque le refund si déjà RELEASED au trouveur")
        void refund_alreadyReleasedToFinder() {
            escrow.setStatus(EscrowStatus.RELEASED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            assertThatThrownBy(() -> escrowService.refundEscrow(1L, 1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("libéré au retrouveur");
        }
    }

    @Nested
    @DisplayName("Idempotence")
    class IdempotenceTests {

        @Test
        @DisplayName("lockEscrow est idempotent si déjà LOCKED")
        void lock_alreadyLocked() {
            escrow.setStatus(EscrowStatus.LOCKED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            escrowService.lockEscrow(1L, 1L);

            assertThat(escrow.getStatus()).isEqualTo(EscrowStatus.LOCKED);
            verify(escrowRepository, never()).save(any());
        }

        @Test
        @DisplayName("confirmReturn est idempotent si déjà RETURN_CONFIRMED")
        void confirmReturn_alreadyConfirmed() {
            escrow.setStatus(EscrowStatus.RETURN_CONFIRMED);
            when(escrowRepository.findById(1L)).thenReturn(Optional.of(escrow));

            escrowService.confirmReturn(1L, 1L);

            verify(escrowRepository, never()).save(any());
        }
    }
}
