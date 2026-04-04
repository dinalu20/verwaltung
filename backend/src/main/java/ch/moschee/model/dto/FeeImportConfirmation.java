package ch.moschee.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class FeeImportConfirmation {
    @NotNull
    private Long memberId;
    @NotNull
    private Map<Integer, BigDecimal> yearPayments;
}
