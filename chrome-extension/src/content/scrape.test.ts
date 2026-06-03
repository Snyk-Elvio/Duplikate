import { describe, expect, it } from "vitest";

import { scrapeCaseContext } from "./scrape";

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("scrapeCaseContext", () => {
  it("reads case number and contact from Lightning record fields", () => {
    const doc = docFrom(`
      <div data-target-selection-name="sfdc:RecordField.Case.CaseNumber">00012345</div>
      <div data-target-selection-name="sfdc:RecordField.Case.Contact">Ada Lovelace</div>
    `);
    const ctx = scrapeCaseContext(doc);
    expect(ctx.caseNumber).toBe("00012345");
    expect(ctx.customerFullName).toBe("Ada Lovelace");
    expect(ctx.customerFirstName).toBe("Ada");
  });

  it("falls back to labelled form elements", () => {
    const doc = docFrom(`
      <div class="slds-form-element">
        <span class="slds-form-element__label">Case Number</span>
        <div class="slds-form-element__control">00098765</div>
      </div>
      <div class="slds-form-element">
        <span class="slds-form-element__label">Contact Name</span>
        <div class="slds-form-element__control">Grace Hopper</div>
      </div>
    `);
    const ctx = scrapeCaseContext(doc);
    expect(ctx.caseNumber).toBe("00098765");
    expect(ctx.customerFirstName).toBe("Grace");
  });

  it("returns an empty context when nothing matches", () => {
    const ctx = scrapeCaseContext(docFrom("<div>Not a case page</div>"));
    expect(ctx).toEqual({});
  });
});
