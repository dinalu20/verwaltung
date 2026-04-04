package ch.moschee.repository;

import ch.moschee.model.entity.BankImportLine;
import ch.moschee.model.enums.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BankImportLineRepository extends JpaRepository<BankImportLine, Long> {

    List<BankImportLine> findByBankImportIdOrderByBookingDateAsc(Long bankImportId);

    List<BankImportLine> findByBankImportIdAndMatchStatus(Long bankImportId, MatchStatus status);

    long countByBankImportIdAndMatchStatus(Long bankImportId, MatchStatus status);
}
