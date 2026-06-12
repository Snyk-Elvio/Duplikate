/**
 * Initialises Quill rich-text editors for every .quill-widget-root element
 * on the page. Each root carries a data-field-id attribute pointing to the
 * hidden <textarea> that holds the raw HTML submitted with the form.
 *
 * Toolbar intentionally limited to what template authors need:
 *   bold / italic / underline | inline-code | ordered + bullet lists | link | clear
 *
 * Quill stores inline code as <code>…</code> and paragraphs as <p>…</p>,
 * which is exactly what the Chrome extension expects for rich clipboard copies.
 */
(function () {
  "use strict";

  var TOOLBAR = [
    ["bold", "italic", "underline"],
    ["code"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ];

  function initWidget(root) {
    var fieldId = root.getAttribute("data-field-id");
    var textarea = document.getElementById(fieldId);
    if (!textarea) return;

    var quill = new Quill(root, {
      theme: "snow",
      placeholder: "Write your template here…",
      modules: { toolbar: TOOLBAR },
    });

    // Load existing value from the textarea into Quill.
    var existing = textarea.value;
    if (existing) {
      quill.clipboard.dangerouslyPasteHTML(existing);
    }

    // Strip Dark Reader browser-extension artefacts before saving.
    // Dark Reader injects --darkreader-* CSS custom properties and
    // data-darkreader-* attributes into every DOM element it touches.
    // Reading quill.root.innerHTML while Dark Reader is active would store
    // those artefacts in the DB; this function removes them first.
    function cleanForSave(html) {
      var div = document.createElement("div");
      div.innerHTML = html;
      div.querySelectorAll("*").forEach(function (el) {
        var toRemove = [];
        for (var i = 0; i < el.attributes.length; i++) {
          if (el.attributes[i].name.startsWith("data-darkreader")) {
            toRemove.push(el.attributes[i].name);
          }
        }
        toRemove.forEach(function (name) { el.removeAttribute(name); });
        var style = el.getAttribute("style");
        if (style) {
          var cleaned = style.replace(/\s*--darkreader-[^;:]+:[^;]+;?/g, "").trim();
          if (cleaned) el.setAttribute("style", cleaned);
          else el.removeAttribute("style");
        }
      });
      return div.innerHTML;
    }

    // Keep textarea in sync on every change so Django sees the latest HTML.
    quill.on("text-change", function () {
      textarea.value = cleanForSave(quill.root.innerHTML);
    });

    // Final sync just before the admin form submits.
    var form = textarea.form;
    if (form) {
      form.addEventListener("submit", function () {
        textarea.value = cleanForSave(quill.root.innerHTML);
      });
    }
  }

  function initAll() {
    document.querySelectorAll(".quill-widget-root").forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
