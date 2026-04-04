package ch.moschee.model.entity;

import ch.moschee.model.enums.FeeStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "member_annual_fee", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"member_id", "year"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MemberAnnualFee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    @JsonIgnore
    private Member member;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "amount_due", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amountDue = new BigDecimal("300.00");

    @Column(name = "amount_paid", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FeeStatus status = FeeStatus.OPEN;

    public void addPayment(BigDecimal amount) {
        this.amountPaid = this.amountPaid.add(amount);
        updateStatus();
    }

    public void updateStatus() {
        int cmp = amountPaid.compareTo(amountDue);
        if (amountPaid.compareTo(BigDecimal.ZERO) == 0) {
            this.status = FeeStatus.OPEN;
        } else if (cmp < 0) {
            this.status = FeeStatus.PARTIAL;
        } else if (cmp == 0) {
            this.status = FeeStatus.PAID;
        } else {
            this.status = FeeStatus.OVERPAID;
        }
    }
}
