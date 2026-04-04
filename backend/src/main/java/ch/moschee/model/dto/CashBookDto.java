package ch.moschee.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CashBookDto {
    private Long id;
    @NotBlank
    private String name;
    @NotBlank
    private String bookType;
    private Integer periodMonth;
    @NotNull
    private Integer periodYear;
    private BigDecimal openingBalance;
    private String status;
    private BigDecimal totalIn;
    private BigDecimal totalOut;
    private BigDecimal currentBalance;
    private List<CashBookEntryDto> entries;
}
