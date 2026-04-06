package ch.moschee.service;

import ch.moschee.model.dto.CashBookDto;
import ch.moschee.model.dto.CashBookEntryDto;
import ch.moschee.model.entity.CashBook;
import ch.moschee.model.entity.CashBookEntry;
import ch.moschee.model.entity.Member;
import ch.moschee.model.entity.Payment;
import ch.moschee.model.enums.CashBookStatus;
import ch.moschee.model.enums.CashBookType;
import ch.moschee.repository.CashBookEntryRepository;
import ch.moschee.repository.CashBookRepository;
import ch.moschee.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CashBookService {

    private final CashBookRepository cashBookRepository;
    private final CashBookEntryRepository entryRepository;
    private final PaymentRepository paymentRepository;
    private final AuditService auditService;

    @Transactional
    public CashBookDto createCashBook(CashBookDto dto) {
        CashBook book = CashBook.builder()
                .name(dto.getName())
                .bookType(CashBookType.valueOf(dto.getBookType()))
                .periodMonth(dto.getPeriodMonth())
                .periodYear(dto.getPeriodYear())
                .openingBalance(dto.getOpeningBalance() != null ? dto.getOpeningBalance() : BigDecimal.ZERO)
                .status(CashBookStatus.OPEN)
                .build();
        book = cashBookRepository.save(book);
        auditService.logAction("CashBook", book.getId(), "CREATE", null, dto.getName());
        return toDto(book);
    }

    public List<CashBookDto> getAllCashBooks() {
        return cashBookRepository.findAllSorted()
                .stream().map(this::toDtoWithSummary).toList();
    }

    public CashBookDto getCashBookWithEntries(Long id) {
        CashBook book = findById(id);
        CashBookDto dto = toDto(book);

        List<CashBookEntry> entries = entryRepository.findByCashBookIdOrderByEntryDateAscIdAsc(id);
        BigDecimal running = book.getOpeningBalance();
        List<CashBookEntryDto> entryDtos = new ArrayList<>();

        for (CashBookEntry e : entries) {
            CashBookEntryDto edto = toEntryDto(e);
            running = running.add(e.getAmountIn()).subtract(e.getAmountOut());
            edto.setRunningBalance(running);
            entryDtos.add(edto);
        }

        dto.setEntries(entryDtos);
        dto.setTotalIn(entryRepository.sumAmountInByCashBookId(id));
        dto.setTotalOut(entryRepository.sumAmountOutByCashBookId(id));
        dto.setCurrentBalance(running);
        return dto;
    }

    @Transactional
    public CashBookEntryDto addEntry(CashBookEntryDto dto) {
        CashBook book = findById(dto.getCashBookId());
        if (book.getStatus() == CashBookStatus.CLOSED) {
            throw new RuntimeException("Cash book is closed");
        }

        CashBookEntry entry = CashBookEntry.builder()
                .cashBook(book)
                .entryDate(LocalDate.parse(dto.getEntryDate()))
                .receiptNumber(dto.getReceiptNumber())
                .description(dto.getDescription())
                .amountIn(dto.getAmountIn() != null ? dto.getAmountIn() : BigDecimal.ZERO)
                .amountOut(dto.getAmountOut() != null ? dto.getAmountOut() : BigDecimal.ZERO)
                .account(dto.getAccount())
                .recipient(dto.getRecipient())
                .approvedBy(dto.getApprovedBy())
                .build();
        entry = entryRepository.save(entry);
        return toEntryDto(entry);
    }

    @Transactional
    public CashBookEntry createEntryFromPayment(Long cashBookId, Payment payment, Member member, String receiptNumber) {
        CashBook book;
        if (cashBookId != null) {
            book = findById(cashBookId);
        } else {
            List<CashBook> generalBooks = cashBookRepository
                    .findByStatusAndBookTypeOrderByPeriodYearDescPeriodMonthDesc(CashBookStatus.OPEN, CashBookType.GENERAL);
            if (!generalBooks.isEmpty()) {
                book = generalBooks.getFirst();
            } else {
                List<CashBook> openBooks = cashBookRepository
                        .findByStatusOrderByPeriodYearDescPeriodMonthDesc(CashBookStatus.OPEN);
                if (!openBooks.isEmpty()) {
                    book = openBooks.getFirst();
                } else {
                    book = CashBook.builder()
                            .name("Kassenbuch " + LocalDate.now().getYear())
                            .bookType(CashBookType.GENERAL)
                            .periodYear(LocalDate.now().getYear())
                            .openingBalance(BigDecimal.ZERO)
                            .status(CashBookStatus.OPEN)
                            .build();
                    book = cashBookRepository.save(book);
                }
            }
        }

        String description = member != null ? member.getFullName() : "Zahlung";
        if (payment.getPurposeText() != null) {
            description += " - " + payment.getPurposeText();
        }

        CashBookEntry entry = CashBookEntry.builder()
                .cashBook(book)
                .entryDate(payment.getPaymentDate())
                .receiptNumber(receiptNumber)
                .description(description)
                .amountIn(payment.getAmount())
                .amountOut(BigDecimal.ZERO)
                .build();

        return entryRepository.save(entry);
    }

    @Transactional
    public CashBookDto updateCashBook(Long id, CashBookDto dto) {
        CashBook book = findById(id);
        if (dto.getOpeningBalance() != null) {
            book.setOpeningBalance(dto.getOpeningBalance());
        }
        if (dto.getName() != null) {
            book.setName(dto.getName());
        }
        book = cashBookRepository.save(book);
        auditService.logAction("CashBook", id, "UPDATE", null, dto.getName());
        return getCashBookWithEntries(id);
    }

    @Transactional
    public void closeCashBook(Long id) {
        CashBook book = findById(id);
        book.setStatus(CashBookStatus.CLOSED);
        cashBookRepository.save(book);
        auditService.logAction("CashBook", id, "CLOSE", null, null);
    }

    @Transactional
    public CashBookEntryDto updateEntry(Long entryId, CashBookEntryDto dto) {
        CashBookEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found: " + entryId));

        if (entry.getCashBook().getStatus() == CashBookStatus.CLOSED) {
            throw new RuntimeException("Cash book is closed");
        }

        entry.setEntryDate(LocalDate.parse(dto.getEntryDate()));
        entry.setReceiptNumber(dto.getReceiptNumber());
        entry.setDescription(dto.getDescription());
        entry.setAmountIn(dto.getAmountIn() != null ? dto.getAmountIn() : BigDecimal.ZERO);
        entry.setAmountOut(dto.getAmountOut() != null ? dto.getAmountOut() : BigDecimal.ZERO);
        entry.setAccount(dto.getAccount());
        entry.setRecipient(dto.getRecipient());
        entry.setApprovedBy(dto.getApprovedBy());

        entry = entryRepository.save(entry);
        return toEntryDto(entry);
    }

    @Transactional
    public void deleteEntry(Long entryId) {
        CashBookEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found: " + entryId));
        paymentRepository.clearCashBookEntryReference(entryId);
        entryRepository.delete(entry);
    }

    public BigDecimal getLastClosedBalance() {
        List<CashBook> closedBooks = cashBookRepository.findByStatusOrderByPeriodYearDescPeriodMonthDesc(CashBookStatus.CLOSED);
        if (closedBooks.isEmpty()) {
            return BigDecimal.ZERO;
        }
        CashBook last = closedBooks.getFirst();
        BigDecimal totalIn = entryRepository.sumAmountInByCashBookId(last.getId());
        BigDecimal totalOut = entryRepository.sumAmountOutByCashBookId(last.getId());
        return last.getOpeningBalance().add(totalIn).subtract(totalOut);
    }

    @Transactional
    public void deleteCashBook(Long id) {
        CashBook book = findById(id);
        List<CashBookEntry> entries = entryRepository.findByCashBookIdOrderByEntryDateAscIdAsc(id);
        for (CashBookEntry entry : entries) {
            paymentRepository.clearCashBookEntryReference(entry.getId());
        }
        entryRepository.deleteAll(entries);
        cashBookRepository.delete(book);
        auditService.logAction("CashBook", id, "DELETE", book.getName(), null);
    }

    private CashBook findById(Long id) {
        return cashBookRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CashBook not found: " + id));
    }

    private CashBookDto toDto(CashBook b) {
        CashBookDto dto = new CashBookDto();
        dto.setId(b.getId());
        dto.setName(b.getName());
        dto.setBookType(b.getBookType().name());
        dto.setPeriodMonth(b.getPeriodMonth());
        dto.setPeriodYear(b.getPeriodYear());
        dto.setOpeningBalance(b.getOpeningBalance());
        dto.setStatus(b.getStatus().name());
        return dto;
    }

    private CashBookDto toDtoWithSummary(CashBook b) {
        CashBookDto dto = toDto(b);
        BigDecimal totalIn = entryRepository.sumAmountInByCashBookId(b.getId());
        BigDecimal totalOut = entryRepository.sumAmountOutByCashBookId(b.getId());
        dto.setTotalIn(totalIn);
        dto.setTotalOut(totalOut);
        dto.setCurrentBalance(b.getOpeningBalance().add(totalIn).subtract(totalOut));
        return dto;
    }

    private CashBookEntryDto toEntryDto(CashBookEntry e) {
        CashBookEntryDto dto = new CashBookEntryDto();
        dto.setId(e.getId());
        dto.setCashBookId(e.getCashBook().getId());
        dto.setEntryDate(e.getEntryDate().toString());
        dto.setReceiptNumber(e.getReceiptNumber());
        dto.setDescription(e.getDescription());
        dto.setAmountIn(e.getAmountIn());
        dto.setAmountOut(e.getAmountOut());
        dto.setAccount(e.getAccount());
        dto.setRecipient(e.getRecipient());
        dto.setApprovedBy(e.getApprovedBy());
        return dto;
    }
}
