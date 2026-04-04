package ch.moschee.model.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class FeeImportRow {
    private int rowNumber;
    private String excelLastName;
    private String excelFirstName;
    private Long matchedMemberId;
    private String matchedMemberName;
    private int confidence;
    private Map<Integer, BigDecimal> yearPayments;
    private String note;
    private String status; // MATCHED, LOW_CONFIDENCE, UNMATCHED, SKIPPED
}
