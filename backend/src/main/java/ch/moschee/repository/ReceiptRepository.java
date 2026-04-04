package ch.moschee.repository;

import ch.moschee.model.entity.Receipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {

    Optional<Receipt> findByReceiptNumber(String receiptNumber);

    @Query("SELECT r FROM Receipt r LEFT JOIN FETCH r.member WHERE r.member.id = :memberId")
    Page<Receipt> findByMemberIdWithMember(@Param("memberId") Long memberId, Pageable pageable);

    Page<Receipt> findByMemberId(Long memberId, Pageable pageable);

    @Query("SELECT MAX(CAST(SUBSTRING(r.receiptNumber, LENGTH(:prefix) + 1) AS int)) FROM Receipt r WHERE r.receiptNumber LIKE CONCAT(:prefix, '%')")
    Integer findMaxSequenceByPrefix(@Param("prefix") String prefix);

    @Query("SELECT r FROM Receipt r LEFT JOIN FETCH r.member ORDER BY r.createdAt DESC")
    Page<Receipt> findAllWithMember(Pageable pageable);

    Page<Receipt> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
