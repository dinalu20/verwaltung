package ch.moschee.repository;

import ch.moschee.model.entity.CashBook;
import ch.moschee.model.enums.CashBookStatus;
import ch.moschee.model.enums.CashBookType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface CashBookRepository extends JpaRepository<CashBook, Long> {

    List<CashBook> findByStatusOrderByPeriodYearDescPeriodMonthDesc(CashBookStatus status);

    List<CashBook> findByStatusAndBookTypeOrderByPeriodYearDescPeriodMonthDesc(CashBookStatus status, CashBookType bookType);

    List<CashBook> findByBookTypeAndPeriodYear(CashBookType bookType, Integer periodYear);

    @Query("SELECT c FROM CashBook c ORDER BY CASE WHEN c.status = 'OPEN' THEN 0 ELSE 1 END, c.periodYear DESC, c.periodMonth DESC NULLS LAST")
    List<CashBook> findAllSorted();
}
