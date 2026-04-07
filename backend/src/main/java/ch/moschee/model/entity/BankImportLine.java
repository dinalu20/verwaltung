package ch.moschee.model.entity;

import ch.moschee.model.enums.MatchStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bank_import_line")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankImportLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_import_id", nullable = false)
    private BankImport bankImport;

    @Column(name = "booking_date")
    private LocalDate bookingDate;

    @Column(name = "booking_text", length = 2000)
    private String bookingText;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suggested_member_id")
    private Member suggestedMember;

    @Column(name = "match_confidence")
    @Builder.Default
    private Integer matchConfidence = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_status", nullable = false, length = 20)
    @Builder.Default
    private MatchStatus matchStatus = MatchStatus.PENDING;

    @Column(name = "is_debit", nullable = false)
    @Builder.Default
    private Boolean isDebit = false;

    @Column(name = "confirmed_by")
    private Long confirmedBy;
}
