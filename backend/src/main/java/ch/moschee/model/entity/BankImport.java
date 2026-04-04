package ch.moschee.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bank_import")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankImport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "import_date", nullable = false)
    private LocalDate importDate;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "imported_by")
    private Long importedBy;

    @OneToMany(mappedBy = "bankImport", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BankImportLine> lines = new ArrayList<>();
}
