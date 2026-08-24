package com.retrouvit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LostObjectRequest {

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

    private LocalDate dateLost;
    private String image;
    private String images;
    private Long reward;
}
