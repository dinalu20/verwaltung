package ch.moschee.model.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentDto {
    private Long id;
    private Long memberId;
    private String memberName;
    private BigDecimal amount;
    private String paymentDate;
    private String paymentType;
    private String purpose;
    private String purposeText;
    private Integer forYear;
    private Long receiptId;
    private String receiptNumber;
    private String createdAt;
}
