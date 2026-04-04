package ch.moschee.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashBookEntryDto {
    private Long id;
    @NotNull
    private Long cashBookId;
    @NotBlank
    private String entryDate;
    private String receiptNumber;
    @NotBlank
    private String description;
    private BigDecimal amountIn;
    private BigDecimal amountOut;
    private String account;
    private String recipient;
    private String approvedBy;
    private BigDecimal runningBalance;
}
