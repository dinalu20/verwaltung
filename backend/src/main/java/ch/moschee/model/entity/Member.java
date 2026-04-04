package ch.moschee.model.entity;

import ch.moschee.model.enums.MemberStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "member")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", unique = true, length = 50)
    private String externalId;

    @Column(name = "last_name", nullable = false, length = 200)
    private String lastName;

    @Column(name = "first_name", nullable = false, length = 200)
    private String firstName;

    @Column(length = 200)
    private String company;

    @Column(length = 300)
    private String street;

    @Column(name = "zip_code", length = 10)
    private String zipCode;

    @Column(length = 200)
    private String city;

    @Column(name = "phone_private", length = 50)
    private String phonePrivate;

    @Column(name = "phone_mobile", length = 50)
    private String phoneMobile;

    @Column(name = "payment_note", length = 500)
    private String paymentNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MemberStatus status = MemberStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Transient
    public String getFullName() {
        return lastName + " " + firstName;
    }
}
