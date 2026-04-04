package ch.moschee.service;

import ch.moschee.model.dto.MemberDto;
import ch.moschee.model.entity.Member;
import ch.moschee.model.enums.MemberStatus;
import ch.moschee.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final AuditService auditService;

    public Page<MemberDto> getMembers(String search, String status, Pageable pageable) {
        MemberStatus memberStatus = (status != null && !status.isBlank())
                ? MemberStatus.valueOf(status)
                : MemberStatus.ACTIVE;

        if (search != null && !search.isBlank()) {
            return memberRepository.searchByTerm(search, memberStatus, pageable).map(this::toDto);
        }
        return memberRepository.findByStatus(memberStatus, pageable).map(this::toDto);
    }

    public MemberDto getMember(Long id) {
        return toDto(findById(id));
    }

    @Transactional
    public MemberDto createMember(MemberDto dto) {
        Member member = toEntity(dto);
        member.setStatus(MemberStatus.ACTIVE);
        member = memberRepository.save(member);
        auditService.logAction("Member", member.getId(), "CREATE", null, dto);
        return toDto(member);
    }

    @Transactional
    public MemberDto updateMember(Long id, MemberDto dto) {
        Member member = findById(id);
        MemberDto oldDto = toDto(member);

        member.setLastName(dto.getLastName());
        member.setFirstName(dto.getFirstName());
        member.setCompany(dto.getCompany());
        member.setStreet(dto.getStreet());
        member.setZipCode(dto.getZipCode());
        member.setCity(dto.getCity());
        member.setPhonePrivate(dto.getPhonePrivate());
        member.setPhoneMobile(dto.getPhoneMobile());
        member.setPaymentNote(dto.getPaymentNote());

        member = memberRepository.save(member);
        auditService.logAction("Member", member.getId(), "UPDATE", oldDto, dto);
        return toDto(member);
    }

    @Transactional
    public void deactivateMember(Long id) {
        Member member = findById(id);
        member.setStatus(MemberStatus.INACTIVE);
        memberRepository.save(member);
        auditService.logAction("Member", id, "DEACTIVATE", null, null);
    }

    @Transactional
    public void reactivateMember(Long id) {
        Member member = findById(id);
        member.setStatus(MemberStatus.ACTIVE);
        memberRepository.save(member);
        auditService.logAction("Member", id, "REACTIVATE", null, null);
    }

    public List<Member> getAllActiveMembers() {
        return memberRepository.findByStatusOrderByLastNameAscFirstNameAsc(MemberStatus.ACTIVE);
    }

    public Member findById(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found: " + id));
    }

    public MemberDto toDto(Member m) {
        MemberDto dto = new MemberDto();
        dto.setId(m.getId());
        dto.setExternalId(m.getExternalId());
        dto.setLastName(m.getLastName());
        dto.setFirstName(m.getFirstName());
        dto.setCompany(m.getCompany());
        dto.setStreet(m.getStreet());
        dto.setZipCode(m.getZipCode());
        dto.setCity(m.getCity());
        dto.setPhonePrivate(m.getPhonePrivate());
        dto.setPhoneMobile(m.getPhoneMobile());
        dto.setPaymentNote(m.getPaymentNote());
        dto.setStatus(m.getStatus().name());
        if (m.getCreatedAt() != null) dto.setCreatedAt(m.getCreatedAt().toString());
        if (m.getUpdatedAt() != null) dto.setUpdatedAt(m.getUpdatedAt().toString());
        return dto;
    }

    private Member toEntity(MemberDto dto) {
        return Member.builder()
                .externalId(dto.getExternalId())
                .lastName(dto.getLastName())
                .firstName(dto.getFirstName())
                .company(dto.getCompany())
                .street(dto.getStreet())
                .zipCode(dto.getZipCode())
                .city(dto.getCity())
                .phonePrivate(dto.getPhonePrivate())
                .phoneMobile(dto.getPhoneMobile())
                .paymentNote(dto.getPaymentNote())
                .build();
    }
}
