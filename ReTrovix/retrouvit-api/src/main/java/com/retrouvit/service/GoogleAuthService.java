package com.retrouvit.service;

import com.retrouvit.entity.AuthProvider;
import com.retrouvit.entity.User;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Connexion / inscription via Google (CDC §5.1) : le compte est
 * retrouvé par email ou créé à la volée. Aucun mot de passe n'est
 * stocké pour ces comptes (authentification déléguée à Google — §6.1) ;
 * l'email Google est déjà vérifié par Google, donc le compte est
 * directement actif et marque email_verified.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final UserService userService;

    /**
     * Find-or-create : retourne les tokens JWT internes pour le profil
     * Google vérifié.
     */
    @Transactional
    public com.retrouvit.dto.AuthResponse loginOrRegister(GoogleTokenVerifier.GoogleProfile profile) {
        User user = userRepository.findByEmail(profile.email()).orElse(null);

        if (user == null) {
            user = User.builder()
                    .name(profile.name() != null ? profile.name() : profile.email().split("@")[0])
                    .email(profile.email())
                    .password(null) // pas de mot de passe pour les comptes Google
                    .authProvider(AuthProvider.GOOGLE)
                    .emailVerified(true) // vérifié par Google
                    .enabled(true)
                    .twoFactorEnabled(false) // 2FA déléguée à Google (CDC §4.1)
                    .build();
            userRepository.save(user);
            log.info("Nouveau compte Google créé: {}", profile.email());
        } else {
            // Compte local existant : on marque le provider Google utilisé
            if (user.getAuthProvider() == AuthProvider.LOCAL) {
                user.setAuthProvider(AuthProvider.GOOGLE);
                user.setEmailVerified(true);
                userRepository.save(user);
            }
        }

        if (!Boolean.TRUE.equals(user.getEnabled())) {
            user.setEnabled(true);
            userRepository.save(user);
        }

        return userService.buildAuthResponseForVerifiedUser(user);
    }
}
