package com.retrouvit.dto;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    private String name;

    @Email(message = "Format d'email invalide")
    private String email;

    private String password;
    private String phone;
    private String location;
    private String avatar;
}
