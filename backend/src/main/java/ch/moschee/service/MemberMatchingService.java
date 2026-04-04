package ch.moschee.service;

import ch.moschee.model.entity.Member;
import ch.moschee.model.enums.MemberStatus;
import ch.moschee.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.text.similarity.JaroWinklerSimilarity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberMatchingService {

    private final MemberRepository memberRepository;
    private final JaroWinklerSimilarity similarity = new JaroWinklerSimilarity();

    public record MatchResult(Member member, int confidence) {}

    public MatchResult findBestMatch(String bookingText, BigDecimal amount) {
        if (bookingText == null || bookingText.isBlank()) return null;

        String textLower = bookingText.toLowerCase();
        boolean hasKeyword = textLower.contains("antarsia") || textLower.contains("mitglied")
                || textLower.contains("beitrag") || textLower.contains("antarsie");

        boolean likelyMembershipFee = isLikelyMembershipAmount(amount);

        List<Member> members = memberRepository.findByStatusOrderByLastNameAscFirstNameAsc(MemberStatus.ACTIVE);

        Member bestMember = null;
        double bestScore = 0;

        for (Member m : members) {
            double nameScore = calculateNameScore(textLower, m);
            if (nameScore > bestScore) {
                bestScore = nameScore;
                bestMember = m;
            }
        }

        if (bestMember == null || bestScore < 0.5) return null;

        int confidence = (int) (bestScore * 60);
        if (hasKeyword) confidence += 20;
        if (likelyMembershipFee) confidence += 20;

        confidence = Math.min(confidence, 100);

        if (confidence < 30) return null;

        return new MatchResult(bestMember, confidence);
    }

    private double calculateNameScore(String text, Member member) {
        String lastName = member.getLastName().toLowerCase();
        String firstName = member.getFirstName().toLowerCase();
        String fullName = lastName + " " + firstName;
        String fullNameReversed = firstName + " " + lastName;

        double directLastName = text.contains(lastName) ? 0.8 : similarity.apply(text, lastName);
        double directFirstName = text.contains(firstName) ? 0.7 : similarity.apply(text, firstName) * 0.5;

        double fullNameScore = Math.max(
                similarity.apply(text, fullName),
                similarity.apply(text, fullNameReversed)
        );

        if (text.contains(lastName) && text.contains(firstName)) {
            return 0.95;
        }
        if (text.contains(lastName)) {
            return 0.75 + (text.contains(firstName.substring(0, Math.min(3, firstName.length()))) ? 0.15 : 0);
        }

        return Math.max(fullNameScore, (directLastName + directFirstName) / 2);
    }

    private boolean isLikelyMembershipAmount(BigDecimal amount) {
        if (amount == null) return false;
        double val = amount.doubleValue();
        return val == 300 || val == 600 || val == 900 || val == 25 || val == 50 || val == 150;
    }
}
