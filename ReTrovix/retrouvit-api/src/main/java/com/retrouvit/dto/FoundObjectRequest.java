package com.retrouvit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoundObjectRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String title;

    @NotBlank(message = "La description est obligatoire")
    private String description;

    @NotBlank(message = "La catégorie est obligatoire")
    private String category;

    @NotBlank(message = "La localisation est obligatoire")
    private String location;

    @NotBlank(message = "La ville est obligatoire")
    private String city;

    private LocalDate dateFound;
    private String image;
    private String images;

    // ─── Vérification de propriété (§2 / CDC §4.2) ─────────────
    /** Question affichée au Chercheur avant mise en relation (optionnelle). */
    private String verificationQuestion;

    /** Réponse en clair À L'ENTRÉE — stockée uniquement hachée (bcrypt), jamais relue. */
    private String verificationAnswer;
}
