package ch.moschee.service;

import ch.moschee.model.dto.DashboardDto;
import ch.moschee.model.enums.FeeStatus;
import ch.moschee.model.enums.MemberStatus;
import ch.moschee.repository.CashBookEntryRepository;
import ch.moschee.repository.CashBookRepository;
import ch.moschee.repository.MemberAnnualFeeRepository;
import ch.moschee.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MemberRepository memberRepository;
    private final MemberAnnualFeeRepository feeRepository;

    public DashboardDto getDashboard() {
        int currentYear = LocalDate.now().getYear();
        DashboardDto dto = new DashboardDto();

        dto.setTotalMembers(memberRepository.count());
        dto.setActiveMembers(memberRepository.countByStatus(MemberStatus.ACTIVE));

        var fees = feeRepository.findByYear(currentYear);
        long paid = fees.stream().filter(f -> f.getStatus() == FeeStatus.PAID || f.getStatus() == FeeStatus.OVERPAID).count();
        dto.setPaidThisYear(paid);
        dto.setUnpaidThisYear(dto.getActiveMembers() - paid);
        dto.setTotalCollectedThisYear(fees.stream()
                .map(f -> f.getAmountPaid())
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        return dto;
    }
}
