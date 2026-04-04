package ch.moschee.service;

import ch.moschee.model.dto.PaymentDto;
import ch.moschee.model.dto.PaymentRequest;
import ch.moschee.model.entity.*;
import ch.moschee.model.enums.PaymentPurpose;
import ch.moschee.model.enums.PaymentType;
import ch.moschee.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MemberService memberService;
    private final ReceiptService receiptService;
    private final CashBookService cashBookService;
    private final AnnualFeeService annualFeeService;
    private final AuditService auditService;

    @Transactional
    public PaymentDto createPayment(PaymentRequest request, String currentUsername) {
        Member member = null;
        if (request.getMemberId() != null) {
            member = memberService.findById(request.getMemberId());
        }

        PaymentType paymentType = PaymentType.valueOf(request.getPaymentType());
        PaymentPurpose purpose = PaymentPurpose.valueOf(request.getPurpose());
        int forYear = request.getForYear() != null ? request.getForYear() : LocalDate.now().getYear();

        Receipt receipt = receiptService.createReceipt(
                member, request.getAmount(), paymentType, purpose, request.getPurposeText(), currentUsername);

        Payment payment = Payment.builder()
                .member(member)
                .amount(request.getAmount())
                .paymentDate(LocalDate.now())
                .paymentType(paymentType)
                .purpose(purpose)
                .purposeText(request.getPurposeText())
                .forYear(forYear)
                .receipt(receipt)
                .build();

        if (shouldAddToCashBook(purpose, request.isAddToCashBook())) {
            Long cashBookId = request.getCashBookId();
            CashBookEntry entry = cashBookService.createEntryFromPayment(
                    cashBookId, payment, member, receipt.getReceiptNumber());
            payment.setCashBookEntry(entry);
        }

        payment = paymentRepository.save(payment);

        if (purpose == PaymentPurpose.MEMBERSHIP_FEE && member != null) {
            annualFeeService.recordPayment(member.getId(), forYear, request.getAmount());
        }

        auditService.logAction("Payment", payment.getId(), "CREATE", null, request);

        return toDto(payment);
    }

    private boolean shouldAddToCashBook(PaymentPurpose purpose, boolean addToCashBook) {
        if (purpose == PaymentPurpose.MEMBERSHIP_FEE) {
            return true;
        }
        return addToCashBook;
    }

    @Transactional(readOnly = true)
    public Page<PaymentDto> getPayments(Pageable pageable) {
        return paymentRepository.findAllWithRelations(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PaymentDto> getPaymentsByMember(Long memberId, Pageable pageable) {
        return paymentRepository.findByMemberIdWithRelations(memberId, pageable).map(this::toDto);
    }

    public PaymentDto toDto(Payment p) {
        PaymentDto dto = new PaymentDto();
        dto.setId(p.getId());
        if (p.getMember() != null) {
            dto.setMemberId(p.getMember().getId());
            dto.setMemberName(p.getMember().getFullName());
        }
        dto.setAmount(p.getAmount());
        dto.setPaymentDate(p.getPaymentDate().toString());
        dto.setPaymentType(p.getPaymentType().name());
        dto.setPurpose(p.getPurpose().name());
        dto.setPurposeText(p.getPurposeText());
        dto.setForYear(p.getForYear());
        if (p.getReceipt() != null) {
            dto.setReceiptId(p.getReceipt().getId());
            dto.setReceiptNumber(p.getReceipt().getReceiptNumber());
        }
        if (p.getCreatedAt() != null) dto.setCreatedAt(p.getCreatedAt().toString());
        return dto;
    }
}
