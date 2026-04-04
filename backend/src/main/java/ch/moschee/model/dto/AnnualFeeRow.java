package ch.moschee.model.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
public class AnnualFeeRow {
    private int rowNumber;
    private Long memberId;
    private String lastName;
    private String firstName;
    private Map<Integer, BigDecimal> yearlyPayments;
}
