package ch.moschee.repository;

import ch.moschee.model.entity.BankImport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BankImportRepository extends JpaRepository<BankImport, Long> {
    List<BankImport> findAllByOrderByImportDateDesc();
}
