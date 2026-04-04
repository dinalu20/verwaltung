package ch.moschee.service;

import ch.moschee.model.dto.AnnualFeeRow;
import ch.moschee.model.entity.Member;
import ch.moschee.model.entity.MemberAnnualFee;
import ch.moschee.model.enums.MemberStatus;
import ch.moschee.repository.MemberAnnualFeeRepository;
import ch.moschee.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnnualFeeService {

    private final MemberAnnualFeeRepository feeRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void recordPayment(Long memberId, int year, BigDecimal amount) {
        MemberAnnualFee fee = feeRepository.findByMemberIdAndYear(memberId, year)
                .orElseGet(() -> {
                    Member member = memberRepository.findById(memberId)
                            .orElseThrow(() -> new RuntimeException("Member not found"));
                    return MemberAnnualFee.builder()
                            .member(member)
                            .year(year)
                            .amountDue(new BigDecimal("300.00"))
                            .amountPaid(BigDecimal.ZERO)
                            .build();
                });

        fee.addPayment(amount);
        feeRepository.save(fee);
    }

    public List<AnnualFeeRow> getAnnualList(int fromYear, int toYear) {
        List<Member> members = memberRepository.findByStatusOrderByLastNameAscFirstNameAsc(MemberStatus.ACTIVE);
        List<MemberAnnualFee> allFees = feeRepository.findAllForYearRange(fromYear, toYear);

        Map<Long, Map<Integer, BigDecimal>> feeMap = new HashMap<>();
        for (MemberAnnualFee fee : allFees) {
            feeMap
                .computeIfAbsent(fee.getMember().getId(), k -> new HashMap<>())
                .put(fee.getYear(), fee.getAmountPaid());
        }

        List<AnnualFeeRow> rows = new ArrayList<>();
        int rowNum = 1;
        for (Member m : members) {
            AnnualFeeRow row = new AnnualFeeRow();
            row.setRowNumber(rowNum++);
            row.setMemberId(m.getId());
            row.setLastName(m.getLastName());
            row.setFirstName(m.getFirstName());

            Map<Integer, BigDecimal> yearlyPayments = new LinkedHashMap<>();
            Map<Integer, BigDecimal> memberFees = feeMap.getOrDefault(m.getId(), Collections.emptyMap());
            for (int y = fromYear; y <= toYear; y++) {
                yearlyPayments.put(y, memberFees.getOrDefault(y, null));
            }
            row.setYearlyPayments(yearlyPayments);
            rows.add(row);
        }

        return rows;
    }

    public List<MemberAnnualFee> getMemberFees(Long memberId) {
        return feeRepository.findByMemberIdOrderByYearDesc(memberId);
    }

    @Transactional
    public void quickPay(Long memberId, int year) {
        MemberAnnualFee fee = feeRepository.findByMemberIdAndYear(memberId, year)
                .orElseGet(() -> {
                    Member member = memberRepository.findById(memberId)
                            .orElseThrow(() -> new RuntimeException("Member not found"));
                    return MemberAnnualFee.builder()
                            .member(member)
                            .year(year)
                            .amountDue(new BigDecimal("300.00"))
                            .amountPaid(BigDecimal.ZERO)
                            .build();
                });

        BigDecimal remaining = fee.getAmountDue().subtract(fee.getAmountPaid());
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            fee.addPayment(remaining);
        }
        feeRepository.save(fee);
    }

    @Transactional
    public void undoPay(Long memberId, int year) {
        feeRepository.findByMemberIdAndYear(memberId, year).ifPresent(fee -> {
            fee.setAmountPaid(BigDecimal.ZERO);
            fee.updateStatus();
            feeRepository.save(fee);
        });
    }
}
