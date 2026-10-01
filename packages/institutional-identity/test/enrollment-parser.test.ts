import test from "node:test";
import assert from "node:assert/strict";
import { parseInstitutionalName } from "../src/core/enrollment-parser";

test("EnrollmentParser: parses standard institutional name 'BTCD24O1016 ARIN GUPTA'", () => {
    const res = parseInstitutionalName("BTCD24O1016 ARIN GUPTA");
    assert.equal(res.hasEnrollmentPrefix, true);
    assert.equal(res.enrollmentNumber, "BTCD24O1016");
    assert.equal(res.actualName, "ARIN GUPTA");
    assert.equal(res.cleanUsernameBase, "arin_gupta");
});

test("EnrollmentParser: enforces uppercase for enrollment number on lowercase input 'btcd24o1016 arin gupta'", () => {
    const res = parseInstitutionalName("btcd24o1016 arin gupta");
    assert.equal(res.hasEnrollmentPrefix, true);
    assert.equal(res.enrollmentNumber, "BTCD24O1016"); // MUST BE IN CAPS!
    assert.equal(res.actualName, "arin gupta");
    assert.equal(res.cleanUsernameBase, "arin_gupta");
});

test("EnrollmentParser: parses hyphen-separated name 'BTCD24O0045 - Rahul Sharma'", () => {
    const res = parseInstitutionalName("BTCD24O0045 - Rahul Sharma");
    assert.equal(res.hasEnrollmentPrefix, true);
    assert.equal(res.enrollmentNumber, "BTCD24O0045");
    assert.equal(res.actualName, "Rahul Sharma");
    assert.equal(res.cleanUsernameBase, "rahul_sharma");
});

test("EnrollmentParser: parses RGPV-style college enrollment '0901CS211020 Priya Verma'", () => {
    const res = parseInstitutionalName("0901CS211020 Priya Verma");
    assert.equal(res.hasEnrollmentPrefix, true);
    assert.equal(res.enrollmentNumber, "0901CS211020");
    assert.equal(res.actualName, "Priya Verma");
    assert.equal(res.cleanUsernameBase, "priya_verma");
});

test("EnrollmentParser: parses legacy smashed username 'btcd24o1016aringupta'", () => {
    const res = parseInstitutionalName("btcd24o1016aringupta");
    assert.equal(res.hasEnrollmentPrefix, true);
    assert.equal(res.enrollmentNumber, "BTCD24O1016"); // ALWAYS IN CAPS!
    assert.equal(res.actualName, "aringupta");
    assert.equal(res.cleanUsernameBase, "aringupta");
});

test("EnrollmentParser: handles standalone enrollment number without name 'BTCD24O1016'", () => {
    const res = parseInstitutionalName("BTCD24O1016", "24ai10ar16@mitsgwl.ac.in");
    assert.equal(res.hasEnrollmentPrefix, true);
    assert.equal(res.enrollmentNumber, "BTCD24O1016");
    assert.equal(res.actualName, null);
    assert.equal(res.cleanUsernameBase, "student_1016");
});

test("EnrollmentParser: preserves regular non-institutional name 'John Doe'", () => {
    const res = parseInstitutionalName("John Doe");
    assert.equal(res.hasEnrollmentPrefix, false);
    assert.equal(res.enrollmentNumber, null);
    assert.equal(res.actualName, "John Doe");
    assert.equal(res.cleanUsernameBase, "john_doe");
});
