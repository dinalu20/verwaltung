package ch.moschee.model.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentRequest {
    private Long memberId;

    @NotNull @DecimalMin("0.01")
    private BigDecimal amount;

    @NotBlank
    private String paymentType;

    @NotBlank
    private String purpose;

    private String purposeText;
    private Integer forYear;
    private boolean addToCashBook = true;
    private Long cashBookId;
}
