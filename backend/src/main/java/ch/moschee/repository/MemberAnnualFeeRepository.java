package ch.moschee.repository;

import ch.moschee.model.entity.MemberAnnualFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MemberAnnualFeeRepository extends JpaRepository<MemberAnnualFee, Long> {

    Optional<MemberAnnualFee> findByMemberIdAndYear(Long memberId, Integer year);

    List<MemberAnnualFee> findByMemberIdOrderByYearDesc(Long memberId);

    @Query("SELECT f FROM MemberAnnualFee f JOIN FETCH f.member m WHERE f.year BETWEEN :fromYear AND :toYear AND m.status = 'ACTIVE' ORDER BY m.lastName, m.firstName, f.year")
    List<MemberAnnualFee> findAllForYearRange(@Param("fromYear") int fromYear, @Param("toYear") int toYear);

    List<MemberAnnualFee> findByYear(Integer year);

    @Query("SELECT f FROM MemberAnnualFee f WHERE f.member.id = :memberId AND f.status <> 'PAID' AND f.status <> 'OVERPAID' ORDER BY f.year ASC")
    List<MemberAnnualFee> findOpenFeesByMemberId(@Param("memberId") Long memberId);
}
