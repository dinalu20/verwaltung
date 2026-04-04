package ch.moschee.repository;

import ch.moschee.model.entity.Member;
import ch.moschee.model.enums.MemberStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByExternalId(String externalId);

    @Query("SELECT m FROM Member m WHERE m.status = :status AND " +
           "(LOWER(m.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(m.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(m.city) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " m.zipCode LIKE CONCAT('%', :search, '%') OR " +
           " LOWER(CONCAT(m.firstName, ' ', m.lastName)) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(CONCAT(m.lastName, ' ', m.firstName)) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Member> searchByTerm(@Param("search") String search, @Param("status") MemberStatus status, Pageable pageable);

    Page<Member> findByStatus(MemberStatus status, Pageable pageable);

    List<Member> findByStatusOrderByLastNameAscFirstNameAsc(MemberStatus status);

    long countByStatus(MemberStatus status);
}
