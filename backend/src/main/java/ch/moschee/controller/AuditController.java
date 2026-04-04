package ch.moschee.controller;

import ch.moschee.model.entity.AuditLog;
import ch.moschee.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','VORSTAND')")
    public ResponseEntity<Page<AuditLog>> getAuditLog(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(auditService.getAuditLog(pageable));
    }

    @GetMapping("/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN','VORSTAND')")
    public ResponseEntity<Page<AuditLog>> getEntityAudit(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(auditService.getAuditLogForEntity(entityType, entityId, pageable));
    }
}
