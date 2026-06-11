import { defineManifest } from "@crxjs/vite-plugin";

// The SFDC domain the content script runs on is configurable at build time:
//   VITE_SFDC_DOMAIN=acme.lightning.force.com npm run build
// Defaults to all Lightning domains so the unpacked extension works out of the box.
const SFDC_DOMAIN = process.env.VITE_SFDC_DOMAIN ?? "*.lightning.force.com";
const SFDC_MATCH = `https://${SFDC_DOMAIN}/*`;

// Allow the content script to call the backend API directly (fetchTemplates).
const API_BASE = process.env.VITE_API_BASE ?? "http://localhost:8000";
const API_MATCH = `${API_BASE}/*`;

export default defineManifest({
  manifest_version: 3,
  name: "Duplikate — SFDC Templates",
  version: "0.1.0",
  description: "Insert managed, consistent canned responses into Salesforce cases.",
  action: {
    default_popup: "src/popup/index.html",
    default_title: "Duplikate",
  },
  background: {
    service_worker: "src/background/background.ts",
    type: "module",
  },
  permissions: ["activeTab", "clipboardWrite", "storage"],
  host_permissions: [SFDC_MATCH, API_MATCH],
  content_scripts: [
    {
      matches: [SFDC_MATCH],
      js: ["src/content/content.ts"],
      run_at: "document_idle",
    },
  ],
});
