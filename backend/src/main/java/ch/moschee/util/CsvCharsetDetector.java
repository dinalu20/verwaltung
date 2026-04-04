package ch.moschee.util;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

public final class CsvCharsetDetector {

    private CsvCharsetDetector() {}

    private static final Charset WINDOWS_1252 = Charset.forName("Windows-1252");

    /**
     * Detects the charset of CSV byte data.
     * Checks for UTF-8 BOM first, then validates UTF-8 encoding,
     * and falls back to Windows-1252 (covers all German umlauts and Swiss bank exports).
     */
    public static Charset detect(byte[] data) {
        if (hasUtf8Bom(data)) {
            return StandardCharsets.UTF_8;
        }
        if (isValidUtf8(data)) {
            return StandardCharsets.UTF_8;
        }
        return WINDOWS_1252;
    }

    /**
     * Returns an InputStream for the data, skipping the BOM if present.
     */
    public static InputStream inputStream(byte[] data, Charset charset) {
        int offset = (charset == StandardCharsets.UTF_8 && hasUtf8Bom(data)) ? 3 : 0;
        return new ByteArrayInputStream(data, offset, data.length - offset);
    }

    private static boolean hasUtf8Bom(byte[] data) {
        return data.length >= 3
                && (data[0] & 0xFF) == 0xEF
                && (data[1] & 0xFF) == 0xBB
                && (data[2] & 0xFF) == 0xBF;
    }

    private static boolean isValidUtf8(byte[] data) {
        CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            decoder.decode(ByteBuffer.wrap(data));
            return true;
        } catch (CharacterCodingException e) {
            return false;
        }
    }
}
