package ch.moschee.repository;

import ch.moschee.model.entity.Payment;
import ch.moschee.model.enums.PaymentPurpose;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Page<Payment> findByMemberId(Long memberId, Pageable pageable);

    @Query("SELECT p FROM Payment p LEFT JOIN FETCH p.member LEFT JOIN FETCH p.receipt")
    Page<Payment> findAllWithRelations(Pageable pageable);

    @Query("SELECT p FROM Payment p LEFT JOIN FETCH p.member LEFT JOIN FETCH p.receipt WHERE p.member.id = :memberId")
    Page<Payment> findByMemberIdWithRelations(@Param("memberId") Long memberId, Pageable pageable);

    List<Payment> findByMemberIdAndForYear(Long memberId, Integer forYear);

    List<Payment> findByMemberIdAndPurposeAndForYear(Long memberId, PaymentPurpose purpose, Integer forYear);

    Optional<Payment> findByReceiptId(Long receiptId);

    @Modifying
    @Query("UPDATE Payment p SET p.receipt = null WHERE p.receipt.id = :receiptId")
    void clearReceiptReference(@Param("receiptId") Long receiptId);

    @Modifying
    @Query("UPDATE Payment p SET p.cashBookEntry = null WHERE p.cashBookEntry.id = :entryId")
    void clearCashBookEntryReference(@Param("entryId") Long entryId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.member.id = :memberId AND p.purpose = 'MEMBERSHIP_FEE' AND p.forYear = :year")
    BigDecimal sumMembershipFeesByMemberAndYear(@Param("memberId") Long memberId, @Param("year") Integer year);
}
