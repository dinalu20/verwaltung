package ch.moschee.model.entity;

import ch.moschee.model.enums.CashBookStatus;
import ch.moschee.model.enums.CashBookType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cash_book")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashBook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "book_type", nullable = false, length = 30)
    private CashBookType bookType;

    @Column(name = "period_month")
    private Integer periodMonth;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "opening_balance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CashBookStatus status = CashBookStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @OneToMany(mappedBy = "cashBook", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("entryDate ASC, id ASC")
    @Builder.Default
    private List<CashBookEntry> entries = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
