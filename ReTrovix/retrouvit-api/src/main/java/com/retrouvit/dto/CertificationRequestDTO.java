package com.retrouvit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationRequestDTO {

    @NotBlank(message = "Le type de document est obligatoire")
    private String documentType; // CNI, PASSEPORT, PERMIS, etc.

    @NotBlank(message = "Le document est obligatoire")
    private String documentUrl; // URL of uploaded document image

    private String selfieUrl; // Optional selfie holding the document
}
