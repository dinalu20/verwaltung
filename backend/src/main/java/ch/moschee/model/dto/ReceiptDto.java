package ch.moschee.model.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ReceiptDto {
    private Long id;
    private String receiptNumber;
    private Long memberId;
    private String memberName;
    private BigDecimal amount;
    private String receiptDate;
    private String paymentType;
    private String purpose;
    private String purposeText;
    private Boolean printed;
    private String createdAt;
}
