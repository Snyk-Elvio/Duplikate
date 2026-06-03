import { describe, expect, it } from "vitest";

import { type CaseContext, resolve } from "./resolver";

const fullContext: CaseContext = {
  customerFullName: "Ada Lovelace",
  customerFirstName: "Ada",
  caseNumber: "00012345",
};

describe("resolve", () => {
  it("resolvesAllPlaceholders", () => {
    const html =
      "<p>Hi {{CUSTOMER_FIRST_NAME}} ({{CUSTOMER_FULL_NAME}}), re case {{CASE_NUMBER}}.</p>";
    expect(resolve(html, fullContext)).toBe(
      "<p>Hi Ada (Ada Lovelace), re case 00012345.</p>",
    );
  });

  it("leavesUnknownPlaceholders", () => {
    const html = "<p>Hi {{CUSTOMER_FIRST_NAME}}, your {{ORDER_ID}} shipped.</p>";
    expect(resolve(html, fullContext)).toBe(
      "<p>Hi Ada, your {{ORDER_ID}} shipped.</p>",
    );
  });

  it("noPlaceholders", () => {
    const html = "<p>Thanks for reaching out, we're on it.</p>";
    expect(resolve(html, fullContext)).toBe(html);
  });

  it("emptyContext (no crash)", () => {
    const html = "<p>Hi {{CUSTOMER_FIRST_NAME}}, case {{CASE_NUMBER}}.</p>";
    // null, undefined, and {} must all be safe and leave placeholders intact.
    expect(() => resolve(html, null)).not.toThrow();
    expect(resolve(html, null)).toBe(html);
    expect(resolve(html, undefined)).toBe(html);
    expect(resolve(html, {})).toBe(html);
  });

  it("caseNumber", () => {
    expect(resolve("Case #{{CASE_NUMBER}}", { caseNumber: "00098765" })).toBe(
      "Case #00098765",
    );
  });

  it("customerFirstName", () => {
    // Explicit first name.
    expect(resolve("Hi {{CUSTOMER_FIRST_NAME}}", { customerFirstName: "Grace" })).toBe(
      "Hi Grace",
    );
    // Derived from full name when first name is absent.
    expect(
      resolve("Hi {{CUSTOMER_FIRST_NAME}}", { customerFullName: "Grace Hopper" }),
    ).toBe("Hi Grace");
  });
});
