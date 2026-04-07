package ch.moschee.service;

import ch.moschee.model.entity.Member;
import ch.moschee.model.enums.MemberStatus;
import ch.moschee.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MemberMatchingService {

    private final MemberRepository memberRepository;
    private final JaroWinklerSimilarity similarity = new JaroWinklerSimilarity();

    public record MatchResult(Member member, int confidence) {}

    private static final Pattern NAME_LINE_PATTERN = Pattern.compile(
            "^[A-ZÄÖÜÉÈÊËÇÀ][a-zäöüéèêëçà]+(?:\\s+[A-ZÄÖÜÉÈÊËÇÀ][a-zäöüéèêëçà]+)+$"
    );

    public MatchResult findBestMatch(String bookingText, BigDecimal amount) {
        if (bookingText == null || bookingText.isBlank()) return null;

        String textLower = bookingText.toLowerCase();
        boolean hasKeyword = textLower.contains("antarsia") || textLower.contains("mitglied")
                || textLower.contains("beitrag") || textLower.contains("antarsie")
                || textLower.contains("moschee") || textLower.contains("verein");

        boolean likelyMembershipFee = isLikelyMembershipAmount(amount);

        List<Member> members = memberRepository.findByStatusOrderByLastNameAscFirstNameAsc(MemberStatus.ACTIVE);

        // Extract potential name lines from structured bank text (TKB format)
        List<String> nameLines = extractNameCandidates(bookingText);

        Member bestMember = null;
        double bestScore = 0;

        for (Member m : members) {
            double nameScore = calculateNameScore(textLower, nameLines, m);
            if (nameScore > bestScore) {
                bestScore = nameScore;
                bestMember = m;
            }
        }

        if (bestMember == null || bestScore < 0.45) return null;

        int confidence = (int) (bestScore * 70);
        if (hasKeyword) confidence += 15;
        if (likelyMembershipFee) confidence += 15;

        confidence = Math.min(confidence, 100);

        if (confidence < 25) return null;

        log.debug("Match: {} {} → {} (score={}, conf={})",
                bestMember.getFirstName(), bestMember.getLastName(),
                bookingText.substring(0, Math.min(50, bookingText.length())),
                bestScore, confidence);

        return new MatchResult(bestMember, confidence);
    }

    /**
     * Extract lines from multi-line booking text that look like person names.
     * TKB format typically has: Reference line, TYPE, Name, Street, PLZ City, Mitteilung
     */
    private List<String> extractNameCandidates(String bookingText) {
        List<String> candidates = new ArrayList<>();
        String[] lines = bookingText.split("[\\n\\r|]+");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || line.length() < 4 || line.length() > 60) continue;
            // Skip lines that look like addresses, references, amounts, or technical text
            if (line.matches(".*\\d{4,}.*") && !NAME_LINE_PATTERN.matcher(line).matches()) continue;
            if (line.toLowerCase().startsWith("mitteilung")) continue;
            if (line.matches("^\\d+.*")) continue; // starts with number (PLZ, ref nr)
            if (line.contains("Ref.") || line.contains("ref.")) continue;
            if (line.toUpperCase().equals(line) && line.length() > 3) continue; // all caps = type label

            if (NAME_LINE_PATTERN.matcher(line).matches()) {
                candidates.add(0, line); // name-looking lines first
            } else if (line.contains(" ") && !line.contains("/") && !line.contains("(")) {
                candidates.add(line);
            }
        }
        return candidates;
    }

    private double calculateNameScore(String fullTextLower, List<String> nameLines, Member member) {
        String lastName = member.getLastName().toLowerCase();
        String firstName = member.getFirstName().toLowerCase();

        // Direct full-text contains check (most reliable)
        if (fullTextLower.contains(lastName) && fullTextLower.contains(firstName)) {
            return 0.95;
        }
        if (fullTextLower.contains(lastName)) {
            String firstPrefix = firstName.substring(0, Math.min(3, firstName.length()));
            return 0.75 + (fullTextLower.contains(firstPrefix) ? 0.15 : 0);
        }

        // Check extracted name candidate lines with higher precision
        double bestLineScore = 0;
        for (String nameLine : nameLines) {
            String lineLower = nameLine.toLowerCase();

            if (lineLower.contains(lastName) && lineLower.contains(firstName)) {
                return 0.97;
            }
            if (lineLower.contains(lastName)) {
                bestLineScore = Math.max(bestLineScore, 0.80);
            }

            // Jaro-Winkler on short extracted name lines is much more accurate than on full text
            String fullName = firstName + " " + lastName;
            String fullNameReversed = lastName + " " + firstName;
            double jw = Math.max(
                    similarity.apply(lineLower, fullName),
                    similarity.apply(lineLower, fullNameReversed)
            );
            bestLineScore = Math.max(bestLineScore, jw);
        }

        if (bestLineScore > 0) {
            return bestLineScore;
        }

        // Fallback: Jaro-Winkler on full text (less accurate for long text)
        String fullName = lastName + " " + firstName;
        String fullNameReversed = firstName + " " + lastName;
        return Math.max(
                similarity.apply(fullTextLower, fullName),
                similarity.apply(fullTextLower, fullNameReversed)
        );
    }

    /**
     * Direct name-to-name matching for Excel fee imports.
     * Weights last name higher (70%) than first name (30%).
     */
    public MatchResult findBestMatchByName(String lastName, String firstName) {
        if (lastName == null || lastName.isBlank()) return null;

        String normLast = normalize(lastName);
        String normFirst = normalize(firstName != null ? firstName : "");

        List<Member> members = memberRepository.findByStatusOrderByLastNameAscFirstNameAsc(MemberStatus.ACTIVE);

        Member bestMember = null;
        double bestScore = 0;

        for (Member m : members) {
            String mLast = normalize(m.getLastName());
            String mFirst = normalize(m.getFirstName());

            double lastScore;
            if (mLast.equals(normLast)) {
                lastScore = 1.0;
            } else if (mLast.contains(normLast) || normLast.contains(mLast)) {
                lastScore = 0.9;
            } else {
                lastScore = similarity.apply(normLast, mLast);
            }

            double firstScore;
            if (normFirst.isEmpty() || mFirst.isEmpty()) {
                firstScore = 0.3;
            } else if (mFirst.equals(normFirst)) {
                firstScore = 1.0;
            } else if (mFirst.startsWith(normFirst.substring(0, Math.min(3, normFirst.length())))
                    || normFirst.startsWith(mFirst.substring(0, Math.min(3, mFirst.length())))) {
                firstScore = Math.max(0.85, similarity.apply(normFirst, mFirst));
            } else {
                firstScore = similarity.apply(normFirst, mFirst);
            }

            double combined = lastScore * 0.7 + firstScore * 0.3;

            if (combined > bestScore) {
                bestScore = combined;
                bestMember = m;
            }
        }

        if (bestMember == null || bestScore < 0.55) return null;

        int confidence = (int) Math.round(bestScore * 100);
        confidence = Math.min(confidence, 100);

        return new MatchResult(bestMember, confidence);
    }

    static String normalize(String input) {
        if (input == null) return "";
        String s = input.trim().toLowerCase();
        s = s.replace("ü", "ue")
             .replace("ö", "oe")
             .replace("ä", "ae")
             .replace("ß", "ss");
        s = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return s.replaceAll("\\s+", " ").trim();
    }

    private boolean isLikelyMembershipAmount(BigDecimal amount) {
        if (amount == null) return false;
        double val = amount.doubleValue();
        return val == 300 || val == 600 || val == 900 || val == 25 || val == 50 || val == 150;
    }
}
