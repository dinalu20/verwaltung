package ch.moschee.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_book_entry")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashBookEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cash_book_id", nullable = false)
    private CashBook cashBook;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "receipt_number", length = 50)
    private String receiptNumber;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "amount_in", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amountIn = BigDecimal.ZERO;

    @Column(name = "amount_out", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amountOut = BigDecimal.ZERO;

    @Column(length = 200)
    private String account;

    @Column(length = 200)
    private String recipient;

    @Column(name = "approved_by", length = 200)
    private String approvedBy;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
