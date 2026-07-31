package com.skinshelf.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateAccountRequest {

    @NotBlank(message = "Ad zorunludur.")
    @Size(max = 50, message = "Ad en fazla 50 karakter olabilir.")
    private String firstName;

    @Size(max = 50, message = "Soyad en fazla 50 karakter olabilir.")
    private String lastName;
}
