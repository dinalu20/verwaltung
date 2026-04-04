package ch.moschee.repository;

import ch.moschee.model.entity.CashBookEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface CashBookEntryRepository extends JpaRepository<CashBookEntry, Long> {

    List<CashBookEntry> findByCashBookIdOrderByEntryDateAscIdAsc(Long cashBookId);

    @Query("SELECT COALESCE(SUM(e.amountIn), 0) FROM CashBookEntry e WHERE e.cashBook.id = :cashBookId")
    BigDecimal sumAmountInByCashBookId(@Param("cashBookId") Long cashBookId);

    @Query("SELECT COALESCE(SUM(e.amountOut), 0) FROM CashBookEntry e WHERE e.cashBook.id = :cashBookId")
    BigDecimal sumAmountOutByCashBookId(@Param("cashBookId") Long cashBookId);
}
