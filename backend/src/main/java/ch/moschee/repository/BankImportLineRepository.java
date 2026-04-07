package ch.moschee.repository;

import ch.moschee.model.entity.BankImportLine;
import ch.moschee.model.enums.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface BankImportLineRepository extends JpaRepository<BankImportLine, Long> {

    @Query("SELECT l FROM BankImportLine l LEFT JOIN FETCH l.suggestedMember WHERE l.bankImport.id = :bankImportId ORDER BY l.bookingDate ASC, l.id ASC")
    List<BankImportLine> findByBankImportIdWithMember(Long bankImportId);

    List<BankImportLine> findByBankImportIdOrderByBookingDateAsc(Long bankImportId);

    List<BankImportLine> findByBankImportIdAndMatchStatus(Long bankImportId, MatchStatus status);

    long countByBankImportIdAndMatchStatus(Long bankImportId, MatchStatus status);

    void deleteAllByBankImportId(Long bankImportId);
}
