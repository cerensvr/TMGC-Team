package com.skinshelf.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangePasswordRequest {

    @NotBlank(message = "Mevcut şifre zorunludur.")
    private String currentPassword;

    @NotBlank(message = "Yeni şifre zorunludur.")
    @Size(min = 6, max = 100, message = "Yeni şifre 6-100 karakter arasında olmalıdır.")
    private String newPassword;
}
