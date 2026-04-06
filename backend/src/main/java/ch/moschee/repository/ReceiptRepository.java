package ch.moschee.repository;

import ch.moschee.model.entity.Receipt;
import ch.moschee.model.enums.PaymentPurpose;
import ch.moschee.model.enums.PaymentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
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

    @Query("SELECT r FROM Receipt r LEFT JOIN FETCH r.member m WHERE " +
           "(:search IS NULL OR LOWER(r.receiptNumber) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(CONCAT(m.lastName, ' ', m.firstName)) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:dateFrom IS NULL OR r.receiptDate >= :dateFrom) " +
           "AND (:dateTo IS NULL OR r.receiptDate <= :dateTo) " +
           "AND (:purpose IS NULL OR r.purpose = :purpose) " +
           "AND (:paymentType IS NULL OR r.paymentType = :paymentType)")
    Page<Receipt> searchReceipts(
            @Param("search") String search,
            @Param("dateFrom") LocalDate dateFrom,
            @Param("dateTo") LocalDate dateTo,
            @Param("purpose") PaymentPurpose purpose,
            @Param("paymentType") PaymentType paymentType,
            Pageable pageable);
}
