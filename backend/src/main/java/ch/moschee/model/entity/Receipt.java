package ch.moschee.model.entity;

import ch.moschee.model.enums.PaymentPurpose;
import ch.moschee.model.enums.PaymentType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "receipt")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "receipt_number", nullable = false, unique = true, length = 50)
    private String receiptNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "receipt_date", nullable = false)
    private LocalDate receiptDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentType paymentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PaymentPurpose purpose;

    @Column(name = "purpose_text", length = 500)
    private String purposeText;

    @Column(nullable = false)
    @Builder.Default
    private Boolean printed = false;

    @Column(name = "pdf_data")
    private byte[] pdfData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
