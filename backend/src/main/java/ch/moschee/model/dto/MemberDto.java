package ch.moschee.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MemberDto {
    private Long id;
    private String externalId;
    @NotBlank
    private String lastName;
    @NotBlank
    private String firstName;
    private String company;
    private String street;
    private String zipCode;
    private String city;
    private String phonePrivate;
    private String phoneMobile;
    private String paymentNote;
    private String status;
    private String createdAt;
    private String updatedAt;
}
