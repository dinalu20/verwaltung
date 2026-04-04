package ch.moschee.service;

import ch.moschee.model.dto.CsvImportResult;
import ch.moschee.model.dto.MemberDto;
import ch.moschee.model.entity.Member;
import ch.moschee.model.enums.MemberStatus;
import ch.moschee.repository.MemberRepository;
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
import java.nio.charset.Charset;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CsvImportService {

    private final MemberRepository memberRepository;
    private final AuditService auditService;

    public CsvImportResult preview(MultipartFile file) {
        return processFile(file, false);
    }

    @Transactional
    public CsvImportResult importMembers(MultipartFile file) {
        return processFile(file, true);
    }

    private CsvImportResult processFile(MultipartFile file, boolean persist) {
        CsvImportResult result = new CsvImportResult();

        try {
            byte[] data = file.getInputStream().readAllBytes();
            Charset charset = CsvCharsetDetector.detect(data);
            log.info("CSV charset detected: {}", charset.displayName());

            CSVReader reader = new CSVReaderBuilder(
                    new InputStreamReader(CsvCharsetDetector.inputStream(data, charset), charset))
                    .withCSVParser(new CSVParserBuilder().withSeparator(';').withQuoteChar('"').build())
                    .build();

            String[] header = reader.readNext();
            if (header == null) {
                result.getErrors().add("Empty file");
                return result;
            }

            int colLastName = findColumn(header, "Nachname");
            int colFirstName = findColumn(header, "Vorname");
            int colCompany = findColumn(header, "Firma");
            int colAddress = findColumn(header, "Adresse");
            int colZip = findColumn(header, "PLZ");
            int colCity = findColumn(header, "Ort");
            int colPhonePrivate = findColumn(header, "Telefon Privat");
            int colPhoneMobile = findColumn(header, "Telefon Mobil");
            int colNotPaid = findColumn(header, "nichtBezahlt");
            int colId = findColumn(header, "[Id]");

            String[] line;
            int row = 1;
            while ((line = reader.readNext()) != null) {
                row++;
                result.setTotalRows(result.getTotalRows() + 1);

                try {
                    String lastName = getVal(line, colLastName);
                    String firstName = getVal(line, colFirstName);

                    if (lastName == null || lastName.isBlank() || firstName == null || firstName.isBlank()) {
                        result.getErrors().add("Row " + row + ": Missing name");
                        result.setSkipped(result.getSkipped() + 1);
                        continue;
                    }

                    String externalId = getVal(line, colId);
                    Optional<Member> existing = (externalId != null && !externalId.isBlank())
                            ? memberRepository.findByExternalId(externalId)
                            : Optional.empty();

                    if (existing.isPresent()) {
                        if (persist) {
                            Member m = existing.get();
                            m.setLastName(lastName.trim());
                            m.setFirstName(firstName.trim());
                            m.setCompany(getVal(line, colCompany));
                            m.setStreet(getVal(line, colAddress));
                            m.setZipCode(getVal(line, colZip));
                            m.setCity(getVal(line, colCity));
                            m.setPhonePrivate(getVal(line, colPhonePrivate));
                            m.setPhoneMobile(getVal(line, colPhoneMobile));
                            m.setPaymentNote(getVal(line, colNotPaid));
                            memberRepository.save(m);
                        }
                        result.setUpdated(result.getUpdated() + 1);
                    } else {
                        if (persist) {
                            Member m = Member.builder()
                                    .externalId(externalId)
                                    .lastName(lastName.trim())
                                    .firstName(firstName.trim())
                                    .company(getVal(line, colCompany))
                                    .street(getVal(line, colAddress))
                                    .zipCode(getVal(line, colZip))
                                    .city(getVal(line, colCity))
                                    .phonePrivate(getVal(line, colPhonePrivate))
                                    .phoneMobile(getVal(line, colPhoneMobile))
                                    .paymentNote(getVal(line, colNotPaid))
                                    .status(MemberStatus.ACTIVE)
                                    .build();
                            memberRepository.save(m);
                        }
                        result.setImported(result.getImported() + 1);
                    }

                    MemberDto previewDto = new MemberDto();
                    previewDto.setExternalId(externalId);
                    previewDto.setLastName(lastName);
                    previewDto.setFirstName(firstName);
                    previewDto.setCity(getVal(line, colCity));
                    previewDto.setStatus(existing.isPresent() ? "UPDATE" : "NEW");
                    result.getPreview().add(previewDto);

                } catch (Exception e) {
                    result.getErrors().add("Row " + row + ": " + e.getMessage());
                    result.setSkipped(result.getSkipped() + 1);
                }
            }

            if (persist) {
                auditService.logAction("CsvImport", 0L, "IMPORT",
                        null, "Imported " + result.getImported() + ", Updated " + result.getUpdated());
            }

        } catch (Exception e) {
            log.error("CSV import failed", e);
            result.getErrors().add("Import failed: " + e.getMessage());
        }

        return result;
    }

    private int findColumn(String[] header, String name) {
        for (int i = 0; i < header.length; i++) {
            String h = header[i].replace("[", "").replace("]", "").trim();
            if (h.equalsIgnoreCase(name.replace("[", "").replace("]", "").trim())) {
                return i;
            }
        }
        return -1;
    }

    private String getVal(String[] line, int col) {
        if (col < 0 || col >= line.length) return null;
        String val = line[col].trim();
        return val.isEmpty() ? null : val;
    }
}
