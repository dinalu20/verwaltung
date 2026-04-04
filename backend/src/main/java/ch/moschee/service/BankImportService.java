package ch.moschee.service;

import ch.moschee.model.dto.BankImportDto;
import ch.moschee.model.dto.BankImportLineDto;
import ch.moschee.model.dto.ConfirmMatchRequest;
import ch.moschee.model.entity.*;
import ch.moschee.model.enums.MatchStatus;
import ch.moschee.model.enums.PaymentPurpose;
import ch.moschee.model.enums.PaymentType;
import ch.moschee.repository.BankImportLineRepository;
import ch.moschee.repository.BankImportRepository;
import ch.moschee.repository.PaymentRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import ch.moschee.util.CsvCharsetDetector;

import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankImportService {

    private final BankImportRepository importRepository;
    private final BankImportLineRepository lineRepository;
    private final PaymentRepository paymentRepository;
    private final MemberMatchingService matchingService;
    private final AnnualFeeService annualFeeService;
    private final CashBookService cashBookService;
    private final AuditService auditService;

    @Transactional
    public BankImportDto importFile(MultipartFile file) {
        BankImport bankImport = BankImport.builder()
                .fileName(file.getOriginalFilename())
                .importDate(LocalDate.now())
                .status("PENDING")
                .build();
        bankImport = importRepository.save(bankImport);

        List<BankImportLine> lines = parseBankFile(file, bankImport);

        for (BankImportLine line : lines) {
            var match = matchingService.findBestMatch(line.getBookingText(), line.getAmount());
            if (match != null) {
                line.setSuggestedMember(match.member());
                line.setMatchConfidence(match.confidence());
            }
            lineRepository.save(line);
        }

        auditService.logAction("BankImport", bankImport.getId(), "IMPORT", null, file.getOriginalFilename());
        return toDto(bankImport);
    }

    public List<BankImportDto> getAllImports() {
        return importRepository.findAllByOrderByImportDateDesc()
                .stream().map(this::toDto).toList();
    }

    public BankImportDto getImportWithLines(Long id) {
        BankImport bi = importRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Import not found: " + id));
        BankImportDto dto = toDto(bi);
        List<BankImportLine> lines = lineRepository.findByBankImportIdOrderByBookingDateAsc(id);
        dto.setLines(lines.stream().map(this::toLineDto).toList());
        return dto;
    }

    @Transactional
    public void confirmMatch(ConfirmMatchRequest request) {
        BankImportLine line = lineRepository.findById(request.getLineId())
                .orElseThrow(() -> new RuntimeException("Line not found: " + request.getLineId()));

        if (request.isConfirm()) {
            Member member = null;
            if (request.getMemberId() != null) {
                member = line.getSuggestedMember();
                if (member == null || !member.getId().equals(request.getMemberId())) {
                    member = null; // will be resolved by controller
                }
            }

            line.setMatchStatus(MatchStatus.CONFIRMED);
            lineRepository.save(line);

            int forYear = request.getForYear() != null ? request.getForYear() : LocalDate.now().getYear();

            Payment payment = Payment.builder()
                    .member(member)
                    .amount(line.getAmount())
                    .paymentDate(line.getBookingDate() != null ? line.getBookingDate() : LocalDate.now())
                    .paymentType(PaymentType.BANK)
                    .purpose(PaymentPurpose.MEMBERSHIP_FEE)
                    .forYear(forYear)
                    .bankImportLineId(line.getId())
                    .build();
            payment = paymentRepository.save(payment);

            if (member != null) {
                annualFeeService.recordPayment(member.getId(), forYear, line.getAmount());
            }
        } else {
            line.setMatchStatus(MatchStatus.REJECTED);
            lineRepository.save(line);
        }
    }

    @Transactional
    public void confirmAllHighConfidence(Long importId, int minConfidence) {
        List<BankImportLine> pending = lineRepository.findByBankImportIdAndMatchStatus(importId, MatchStatus.PENDING);
        for (BankImportLine line : pending) {
            if (line.getMatchConfidence() != null && line.getMatchConfidence() >= minConfidence && line.getSuggestedMember() != null) {
                ConfirmMatchRequest req = new ConfirmMatchRequest();
                req.setLineId(line.getId());
                req.setMemberId(line.getSuggestedMember().getId());
                req.setConfirm(true);
                confirmMatch(req);
            }
        }
    }

    private List<BankImportLine> parseBankFile(MultipartFile file, BankImport bankImport) {
        List<BankImportLine> lines = new ArrayList<>();
        try {
            byte[] data = file.getInputStream().readAllBytes();
            Charset charset = CsvCharsetDetector.detect(data);
            log.info("Bank CSV charset detected: {}", charset.displayName());

            CSVReader reader = new CSVReaderBuilder(
                    new InputStreamReader(CsvCharsetDetector.inputStream(data, charset), charset))
                    .withCSVParser(new CSVParserBuilder().withSeparator(';').withQuoteChar('"').build())
                    .build();

            String[] header = reader.readNext();
            if (header == null) return lines;

            int colDate = findCol(header, "Datum", "Buchungsdatum", "Date", "Valuta");
            int colText = findCol(header, "Text", "Buchungstext", "Beschreibung", "Description", "Mitteilungen");
            int colAmount = findCol(header, "Betrag", "Amount", "Gutschrift", "Kredit");

            String[] row;
            while ((row = reader.readNext()) != null) {
                try {
                    String dateStr = colDate >= 0 && colDate < row.length ? row[colDate].trim() : null;
                    String text = colText >= 0 && colText < row.length ? row[colText].trim() : "";
                    String amountStr = colAmount >= 0 && colAmount < row.length ? row[colAmount].trim() : "0";

                    if (amountStr.isEmpty() || text.isEmpty()) continue;

                    amountStr = amountStr.replace("'", "").replace(",", ".");
                    BigDecimal amount = new BigDecimal(amountStr);
                    if (amount.compareTo(BigDecimal.ZERO) <= 0) continue;

                    LocalDate bookingDate = parseDate(dateStr);

                    BankImportLine line = BankImportLine.builder()
                            .bankImport(bankImport)
                            .bookingDate(bookingDate)
                            .bookingText(text)
                            .amount(amount)
                            .matchStatus(MatchStatus.PENDING)
                            .build();
                    lines.add(line);
                } catch (Exception e) {
                    log.warn("Skipping bank import row: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse bank file", e);
        }
        return lines;
    }

    private int findCol(String[] header, String... candidates) {
        for (int i = 0; i < header.length; i++) {
            String h = header[i].trim().toLowerCase();
            for (String c : candidates) {
                if (h.contains(c.toLowerCase())) return i;
            }
        }
        return -1;
    }

    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        s = s.trim();
        for (String pattern : List.of("dd.MM.yyyy", "yyyy-MM-dd", "dd/MM/yyyy")) {
            try {
                return LocalDate.parse(s, DateTimeFormatter.ofPattern(pattern));
            } catch (Exception ignored) {}
        }
        return null;
    }

    private BankImportDto toDto(BankImport bi) {
        BankImportDto dto = new BankImportDto();
        dto.setId(bi.getId());
        dto.setFileName(bi.getFileName());
        dto.setImportDate(bi.getImportDate().toString());
        dto.setStatus(bi.getStatus());
        dto.setTotalLines(lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.PENDING)
                + lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.CONFIRMED)
                + lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.REJECTED)
                + lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.IGNORED));
        dto.setPendingLines(lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.PENDING));
        dto.setConfirmedLines(lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.CONFIRMED));
        return dto;
    }

    private BankImportLineDto toLineDto(BankImportLine l) {
        BankImportLineDto dto = new BankImportLineDto();
        dto.setId(l.getId());
        dto.setBookingDate(l.getBookingDate() != null ? l.getBookingDate().toString() : null);
        dto.setBookingText(l.getBookingText());
        dto.setAmount(l.getAmount());
        if (l.getSuggestedMember() != null) {
            dto.setSuggestedMemberId(l.getSuggestedMember().getId());
            dto.setSuggestedMemberName(l.getSuggestedMember().getFullName());
        }
        dto.setMatchConfidence(l.getMatchConfidence());
        dto.setMatchStatus(l.getMatchStatus().name());
        return dto;
    }
}
