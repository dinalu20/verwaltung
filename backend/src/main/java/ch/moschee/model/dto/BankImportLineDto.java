package ch.moschee.model.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class BankImportLineDto {
    private Long id;
    private String bookingDate;
    private String bookingText;
    private BigDecimal amount;
    private Long suggestedMemberId;
    private String suggestedMemberName;
    private Integer matchConfidence;
    private String matchStatus;
}
