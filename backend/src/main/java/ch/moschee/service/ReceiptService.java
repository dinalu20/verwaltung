package ch.moschee.service;

import ch.moschee.model.dto.ReceiptDto;
import ch.moschee.model.entity.Member;
import ch.moschee.model.entity.Receipt;
import ch.moschee.model.enums.PaymentPurpose;
import ch.moschee.model.enums.PaymentType;
import ch.moschee.repository.PaymentRepository;
import ch.moschee.repository.ReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;

@Service
@RequiredArgsConstructor
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final PaymentRepository paymentRepository;
    private final PdfService pdfService;

    @Transactional
    public Receipt createReceipt(Member member, BigDecimal amount, PaymentType paymentType,
                                  PaymentPurpose purpose, String purposeText, String createdByName, int forYear) {
        String receiptNumber = generateReceiptNumber();

        Receipt receipt = Receipt.builder()
                .receiptNumber(receiptNumber)
                .member(member)
                .amount(amount)
                .receiptDate(LocalDate.now())
                .paymentType(paymentType)
                .purpose(purpose)
                .purposeText(purposeText)
                .printed(false)
                .build();

        byte[] pdf = pdfService.generateReceiptPdf(receipt, member, createdByName, forYear);
        receipt.setPdfData(pdf);

        return receiptRepository.save(receipt);
    }

    public Receipt findById(Long id) {
        return receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<ReceiptDto> getReceipts(Pageable pageable) {
        return receiptRepository.findAllWithMember(pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<ReceiptDto> getReceiptsByMember(Long memberId, Pageable pageable) {
        return receiptRepository.findByMemberIdWithMember(memberId, pageable).map(this::toDto);
    }

    @Transactional
    public void markPrinted(Long id) {
        Receipt receipt = findById(id);
        receipt.setPrinted(true);
        receiptRepository.save(receipt);
    }

    @Transactional
    public void deleteReceipt(Long id) {
        paymentRepository.clearReceiptReference(id);
        receiptRepository.deleteById(id);
    }

    private String generateReceiptNumber() {
        String prefix = Year.now().getValue() + "-";
        Integer maxSeq = receiptRepository.findMaxSequenceByPrefix(prefix);
        int next = (maxSeq != null ? maxSeq : 0) + 1;
        return prefix + String.format("%04d", next);
    }

    private ReceiptDto toDto(Receipt r) {
        ReceiptDto dto = new ReceiptDto();
        dto.setId(r.getId());
        dto.setReceiptNumber(r.getReceiptNumber());
        if (r.getMember() != null) {
            dto.setMemberId(r.getMember().getId());
            dto.setMemberName(r.getMember().getLastName() + " " + r.getMember().getFirstName());
        }
        dto.setAmount(r.getAmount());
        dto.setReceiptDate(r.getReceiptDate() != null ? r.getReceiptDate().toString() : null);
        dto.setPaymentType(r.getPaymentType() != null ? r.getPaymentType().name() : null);
        dto.setPurpose(r.getPurpose() != null ? r.getPurpose().name() : null);
        dto.setPurposeText(r.getPurposeText());
        dto.setPrinted(r.getPrinted());
        dto.setCreatedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        return dto;
    }
}
