package ch.moschee.service;

import ch.moschee.model.entity.AuditLog;
import ch.moschee.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void logAction(String entityType, Long entityId, String action, Object oldValue, Object newValue) {
        try {
            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .oldValues(oldValue != null ? objectMapper.writeValueAsString(oldValue) : null)
                    .newValues(newValue != null ? objectMapper.writeValueAsString(newValue) : null)
                    .userId(getCurrentUserId())
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log for {} {} {}", entityType, entityId, action, e);
        }
    }

    public Page<AuditLog> getAuditLog(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<AuditLog> getAuditLogForEntity(String entityType, Long entityId, Pageable pageable) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId, pageable);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof String) {
            return null; // userId resolved in controller layer if needed
        }
        return null;
    }
}
