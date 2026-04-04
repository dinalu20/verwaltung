package ch.moschee.config;

import ch.moschee.model.entity.AppUser;
import ch.moschee.model.enums.Role;
import ch.moschee.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.default-admin.username}")
    private String adminUsername;

    @Value("${app.default-admin.password}")
    private String adminPassword;

    @Value("${app.default-admin.full-name}")
    private String adminFullName;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername(adminUsername)) {
            AppUser admin = AppUser.builder()
                    .username(adminUsername)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .fullName(adminFullName)
                    .role(Role.ADMIN)
                    .active(true)
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created: {}", adminUsername);
        }
    }
}
