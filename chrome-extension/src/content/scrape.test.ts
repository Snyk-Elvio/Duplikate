import { describe, expect, it } from "vitest";

import { scrapeCaseContext } from "./scrape";

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("scrapeCaseContext", () => {
  it("reads case number and contact from Lightning record fields (plain text)", () => {
    const doc = docFrom(`
      <div data-target-selection-name="sfdc:RecordField.Case.CaseNumber">
        <span class="slds-form-element__label">Case Number</span>
        <div class="slds-form-element__control">00012345</div>
      </div>
      <div data-target-selection-name="sfdc:RecordField.Case.Contact">
        <span class="slds-form-element__label">Contact Name</span>
        <div class="slds-form-element__control">Ada Lovelace</div>
      </div>
    `);
    const ctx = scrapeCaseContext(doc);
    expect(ctx.caseNumber).toBe("00012345");
    expect(ctx.customerFullName).toBe("Ada Lovelace");
    expect(ctx.customerFirstName).toBe("Ada");
  });

  it("does not include label text in value for byFieldName lookup fields", () => {
    // SFDC renders Contact as a link; the container holds both the label and the link.
    // Without targeted extraction, textContent returns "Contact Name Ada Lovelace Edit".
    const doc = docFrom(`
      <div data-target-selection-name="sfdc:RecordField.Case.Contact">
        <span class="slds-form-element__label">Contact Name</span>
        <div class="slds-form-element__control">
          <a href="/001xx000003Gn4l">Ada Lovelace</a>
          <button>Edit</button>
        </div>
      </div>
    `);
    const ctx = scrapeCaseContext(doc);
    expect(ctx.customerFullName).toBe("Ada Lovelace");
  });

  it("does not include label text in value for byOutputLabel lookup fields", () => {
    const doc = docFrom(`
      <force-record-layout-item>
        <div class="slds-form-element">
          <span class="slds-form-element__label">Contact Name</span>
          <div class="slds-form-element__control">
            <a href="/003xx000004Tz0y">Grace Hopper</a>
            <button>Edit</button>
          </div>
        </div>
      </force-record-layout-item>
    `);
    const ctx = scrapeCaseContext(doc);
    expect(ctx.customerFullName).toBe("Grace Hopper");
    expect(ctx.customerFirstName).toBe("Grace");
  });

  it("reads value from lightning-formatted-text", () => {
    const doc = docFrom(`
      <div data-target-selection-name="sfdc:RecordField.Case.CaseNumber">
        <span class="slds-form-element__label">Case Number</span>
        <div class="slds-form-element__control">
          <lightning-formatted-text>00099999</lightning-formatted-text>
        </div>
      </div>
    `);
    const ctx = scrapeCaseContext(doc);
    expect(ctx.caseNumber).toBe("00099999");
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
