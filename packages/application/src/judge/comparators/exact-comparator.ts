import { Comparator } from "./comparator.interface";

export function normalizeOutput(raw: string): string {
    return (raw || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map(line => line.trimEnd())
        .join("\n")
        .trim();
}

export class ExactComparator implements Comparator {
    compare(
        expectedOutput: string,
        actualOutput: string,
    ): boolean {
        const expected = normalizeOutput(expectedOutput);
        const actual = normalizeOutput(actualOutput);

        return expected === actual;
    }
}