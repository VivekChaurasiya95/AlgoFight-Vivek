// packages/institutional-identity/src/core/enrollment-parser.ts

export interface ParsedInstitutionalName {
    /** The extracted enrollment number, strictly normalized to uppercase (e.g. "BTCD24O1016") */
    enrollmentNumber: string | null;
    /** The extracted actual name of the user with enrollment prefix removed (e.g. "ARIN GUPTA" or "Arin Gupta") */
    actualName: string | null;
    /** A normalized base username suitable for database storage (e.g. "arin_gupta" or "aringupta") */
    cleanUsernameBase: string;
    /** Whether an institutional enrollment prefix was identified */
    hasEnrollmentPrefix: boolean;
}

/**
 * Regex for separated enrollment code:
 * Matches codes like BTCD24O1016, BTCS23O0045, 0901CS211020, 24AI10AR16
 * followed by a space, dash, colon, underscore, or dot and the student's actual name.
 */
const SEPARATED_ENROLLMENT_REGEX =
    /^\s*([A-Za-z]{2,6}\d{2}[A-Za-z0-9]\d{3,5}|\d{4}[A-Za-z]{2}\d{6}|[A-Za-z0-9]{8,14})\s*[-_.:/\s]\s*(.+)$/i;

/**
 * Regex for contiguous/smashed enrollment code (e.g. "btcd24o1016aringupta" or "0901cs211020rahulsharma")
 */
const SMASHED_ENROLLMENT_REGEX_1 =
    /^\s*([a-zA-Z]{4}\d{2}[a-zA-Z0-9]\d{3,5})([a-zA-Z]{2,}.*)$/;

const SMASHED_ENROLLMENT_REGEX_2 =
    /^\s*(\d{4}[a-zA-Z]{2}\d{6})([a-zA-Z]{2,}.*)$/;

/**
 * Regex for standalone enrollment code without any following name (e.g. "BTCD24O1016")
 */
const STANDALONE_ENROLLMENT_REGEX =
    /^\s*([A-Za-z]{2,6}\d{2}[A-Za-z0-9]\d{3,5}|\d{4}[A-Za-z]{2}\d{6})\s*$/i;

/**
 * Parses raw display names, Google profile names, or existing usernames from institutional accounts.
 * Extracts the enrollment number into strict UPPERCASE (e.g. "BTCD24O1016") and strips it from the username.
 *
 * @param rawName The raw profile name or username (e.g. "BTCD24O1016 ARIN GUPTA" or "btcd24o1016aringupta")
 * @param rawEmail Optional user email address for additional fallback name or enrollment extraction
 */
export function parseInstitutionalName(
    rawName?: string | null,
    rawEmail?: string | null
): ParsedInstitutionalName {
    const input = (rawName || "").trim();

    // 1. Check for separated pattern: "BTCD24O1016 ARIN GUPTA" / "BTCD24O1016 - Arin Gupta"
    const separatedMatch = SEPARATED_ENROLLMENT_REGEX.exec(input);
    if (separatedMatch) {
        const enrollmentRaw = separatedMatch[1].trim();
        const actualNameRaw = separatedMatch[2].trim().replace(/^[-_.:/\s]+/, "");
        const enrollmentNumber = enrollmentRaw.toUpperCase();
        const actualName = actualNameRaw.length > 0 ? actualNameRaw : null;
        const cleanUsernameBase = generateCleanUsername(actualName, rawEmail, enrollmentNumber);

        return {
            enrollmentNumber,
            actualName,
            cleanUsernameBase,
            hasEnrollmentPrefix: true,
        };
    }

    // 2. Check for smashed/contiguous pattern: "btcd24o1016aringupta"
    const smashedMatch1 = SMASHED_ENROLLMENT_REGEX_1.exec(input);
    if (smashedMatch1) {
        const enrollmentNumber = smashedMatch1[1].trim().toUpperCase();
        const actualName = smashedMatch1[2].trim();
        const cleanUsernameBase = generateCleanUsername(actualName, rawEmail, enrollmentNumber);

        return {
            enrollmentNumber,
            actualName,
            cleanUsernameBase,
            hasEnrollmentPrefix: true,
        };
    }

    const smashedMatch2 = SMASHED_ENROLLMENT_REGEX_2.exec(input);
    if (smashedMatch2) {
        const enrollmentNumber = smashedMatch2[1].trim().toUpperCase();
        const actualName = smashedMatch2[2].trim();
        const cleanUsernameBase = generateCleanUsername(actualName, rawEmail, enrollmentNumber);

        return {
            enrollmentNumber,
            actualName,
            cleanUsernameBase,
            hasEnrollmentPrefix: true,
        };
    }

    // 3. Check for standalone enrollment code: "BTCD24O1016" (no actual name)
    const standaloneMatch = STANDALONE_ENROLLMENT_REGEX.exec(input);
    if (standaloneMatch) {
        const enrollmentNumber = standaloneMatch[1].trim().toUpperCase();
        const cleanUsernameBase = generateCleanUsername(null, rawEmail, enrollmentNumber);

        return {
            enrollmentNumber,
            actualName: null,
            cleanUsernameBase,
            hasEnrollmentPrefix: true,
        };
    }

    // 4. No enrollment prefix found: standard user name
    const actualName = input.length > 0 ? input : null;
    const cleanUsernameBase = generateCleanUsername(actualName, rawEmail, null);

    return {
        enrollmentNumber: null,
        actualName,
        cleanUsernameBase,
        hasEnrollmentPrefix: false,
    };
}

/**
 * Helper to generate a clean base username purely from the user's actual name
 * without enrollment codes.
 */
function generateCleanUsername(
    actualName: string | null,
    rawEmail?: string | null,
    enrollmentNumber?: string | null
): string {
    if (actualName) {
        // Turn "Arin Gupta" into "arin_gupta"
        const formatted = actualName
            .trim()
            .replace(/\s+/g, "_")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "");

        if (formatted.length >= 3) {
            return formatted;
        }
    }

    // Fallback for standalone enrollment without name: e.g. "student_1016"
    if (enrollmentNumber) {
        const digits = enrollmentNumber.replace(/\D/g, "");
        if (digits.length >= 3) {
            return `student_${digits.slice(-4)}`;
        }
    }

    // Fallback: try email local part if it does not look like an enrollment code
    if (rawEmail && rawEmail.includes("@")) {
        const local = rawEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (local && !STANDALONE_ENROLLMENT_REGEX.test(local) && local.length >= 3) {
            return local;
        }
    }

    return `player_${Math.floor(1000 + Math.random() * 9000)}`;
}
