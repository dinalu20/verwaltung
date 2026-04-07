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
        return getAnnualList(fromYear, toYear, false);
    }

    public List<AnnualFeeRow> getAnnualList(int fromYear, int toYear, boolean onlyWithPayments) {
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
            Map<Integer, BigDecimal> memberFees = feeMap.getOrDefault(m.getId(), Collections.emptyMap());

            if (onlyWithPayments) {
                boolean hasPaid = memberFees.values().stream()
                        .anyMatch(v -> v != null && v.compareTo(BigDecimal.ZERO) > 0);
                if (!hasPaid) continue;
            }

            AnnualFeeRow row = new AnnualFeeRow();
            row.setRowNumber(rowNum++);
            row.setMemberId(m.getId());
            row.setLastName(m.getLastName());
            row.setFirstName(m.getFirstName());

            Map<Integer, BigDecimal> yearlyPayments = new LinkedHashMap<>();
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
    public void quickPay(Long memberId, int year, BigDecimal amount) {
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

        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            fee.addPayment(amount);
        } else {
            BigDecimal remaining = fee.getAmountDue().subtract(fee.getAmountPaid());
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                fee.addPayment(remaining);
            }
        }
        feeRepository.save(fee);
    }

    @Transactional
    public void setPayment(Long memberId, int year, BigDecimal amount, BigDecimal amountDue) {
        MemberAnnualFee fee = feeRepository.findByMemberIdAndYear(memberId, year)
                .orElseGet(() -> {
                    Member member = memberRepository.findById(memberId)
                            .orElseThrow(() -> new RuntimeException("Member not found"));
                    return MemberAnnualFee.builder()
                            .member(member)
                            .year(year)
                            .amountDue(amountDue)
                            .amountPaid(BigDecimal.ZERO)
                            .build();
                });

        fee.setAmountDue(amountDue.max(amount));
        fee.setAmountPaid(amount);
        fee.updateStatus();
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

    /**
     * Find the years that are open/partial for a member, ordered oldest first.
     * Includes the current year even if no fee record exists yet.
     */
    public List<Integer> getOpenYears(Long memberId) {
        List<MemberAnnualFee> openFees = feeRepository.findOpenFeesByMemberId(memberId);
        List<Integer> years = new ArrayList<>();
        for (MemberAnnualFee f : openFees) {
            years.add(f.getYear());
        }
        int currentYear = java.time.LocalDate.now().getYear();
        if (!years.contains(currentYear)) {
            // Check if the current year is already paid
            var existing = feeRepository.findByMemberIdAndYear(memberId, currentYear);
            if (existing.isEmpty() || existing.get().getAmountPaid().compareTo(existing.get().getAmountDue()) < 0) {
                years.add(currentYear);
                Collections.sort(years);
            }
        }
        return years;
    }

    /**
     * Distribute a payment amount across open years, oldest first.
     * Returns the list of {year, amount} pairs that were applied.
     */
    @Transactional
    public List<Map.Entry<Integer, BigDecimal>> distributePayment(Long memberId, BigDecimal totalAmount) {
        List<Integer> openYears = getOpenYears(memberId);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        List<Map.Entry<Integer, BigDecimal>> allocations = new ArrayList<>();
        BigDecimal remaining = totalAmount;

        for (int year : openYears) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            MemberAnnualFee fee = feeRepository.findByMemberIdAndYear(memberId, year)
                    .orElseGet(() -> MemberAnnualFee.builder()
                            .member(member)
                            .year(year)
                            .amountDue(new BigDecimal("300.00"))
                            .amountPaid(BigDecimal.ZERO)
                            .build());

            BigDecimal due = fee.getAmountDue().subtract(fee.getAmountPaid());
            if (due.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal toApply = remaining.min(due);
            fee.addPayment(toApply);
            feeRepository.save(fee);

            allocations.add(Map.entry(year, toApply));
            remaining = remaining.subtract(toApply);
        }

        // If there's remaining amount, put it on the last open year (overpayment)
        if (remaining.compareTo(BigDecimal.ZERO) > 0 && !openYears.isEmpty()) {
            int lastYear = openYears.get(openYears.size() - 1);
            MemberAnnualFee fee = feeRepository.findByMemberIdAndYear(memberId, lastYear)
                    .orElseThrow();
            fee.addPayment(remaining);
            feeRepository.save(fee);
            allocations.add(Map.entry(lastYear, remaining));
        }

        return allocations;
    }
}
