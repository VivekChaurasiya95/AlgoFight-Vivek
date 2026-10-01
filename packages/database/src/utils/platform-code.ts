import crypto from "crypto";

export function generatePlatformCode(
    userType?: "STUDENT" | "FACULTY" | "INDIVIDUAL"
): string {
    const prefix =
        userType === "STUDENT"
            ? "AF-STU"
            : userType === "FACULTY"
            ? "AF-FAC"
            : "AF-USR";

    // Alphanumeric character pool (unambiguous uppercase characters: 32 distinct symbols)
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(7);
    let alphanumericPart = "";

    for (let i = 0; i < 7; i++) {
        alphanumericPart += charset[bytes[i] % charset.length];
    }

    return `${prefix}-${alphanumericPart}`;
}

export function ensureFacultyPlatformCode(currentCode?: string | null): string {
    if (currentCode && currentCode.startsWith("AF-FAC-")) {
        return currentCode;
    }
    if (currentCode && (currentCode.startsWith("AF-USR-") || currentCode.startsWith("AF-STU-"))) {
        return currentCode.replace(/^AF-(?:USR|STU)-/, "AF-FAC-");
    }
    if (currentCode && currentCode.includes("-")) {
        const parts = currentCode.split("-");
        const suffix = parts.slice(1).join("-");
        if (suffix) return `AF-FAC-${suffix}`;
    }
    return `AF-FAC-${Math.floor(10000 + Math.random() * 90000)}`;
}
