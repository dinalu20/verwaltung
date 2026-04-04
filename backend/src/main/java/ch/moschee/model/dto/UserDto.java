package ch.moschee.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserDto {
    private Long id;
    @NotBlank @Size(min = 3, max = 100)
    private String username;
    @Size(min = 6, max = 100)
    private String password;
    @NotBlank
    private String fullName;
    @NotBlank
    private String role;
    private Boolean active;
}
