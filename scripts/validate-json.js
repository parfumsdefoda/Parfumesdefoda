/**
 * JSON Schema Validator — Parfums De Foda
 *
 * Validates all JSON data and content files against their expected schemas.
 * Run with: node scripts/validate-json.js
 *
 * Future: Replace with full JSON Schema validation (using Ajv or similar).
 */

const fs = require("fs");
const path = require("path");

const FILES = [
  { path: "data/products.json", type: "array-or-object", required: true },
  { path: "data/categories.json", type: "array", required: true },
  { path: "data/sizes.json", type: "array", required: true },
  { path: "data/filters.json", type: "array", required: true },
  { path: "data/badges.json", type: "array", required: true },
  { path: "data/settings.json", type: "object", required: true },
  { path: "data/theme.json", type: "object", required: true },
  { path: "data/contact.json", type: "object", required: true },
  { path: "data/social.json", type: "object", required: false },
  { path: "data/navigation.json", type: "array", required: true },
  { path: "data/footer.json", type: "object", required: true },
  { path: "data/seo.json", type: "object", required: true },
  { path: "content/homepage.json", type: "object", required: false },
  { path: "content/hero.json", type: "object", required: false },
  { path: "content/about.json", type: "object", required: false },
  { path: "content/faq.json", type: "array", required: true },
  { path: "content/policies.json", type: "object", required: true },
  { path: "locales/ar.json", type: "object", required: true },
];

let hasErrors = false;

for (const file of FILES) {
  const fullPath = path.resolve(__dirname, "..", file.path);

  if (!fs.existsSync(fullPath)) {
    if (file.required) {
      console.error(`❌ Missing required file: ${file.path}`);
      hasErrors = true;
    } else {
      console.log(`⚠ Optional file not found: ${file.path}`);
    }
    continue;
  }

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    const parsed = JSON.parse(content);

    if (file.type === "array" && !Array.isArray(parsed)) {
      console.error(`❌ ${file.path}: Expected array, got ${typeof parsed}`);
      hasErrors = true;
    } else if (file.type === "array-or-object" && !Array.isArray(parsed) && typeof parsed !== "object") {
      console.error(`❌ ${file.path}: Expected array or object, got ${typeof parsed}`);
      hasErrors = true;
    } else if (file.type === "object" && (typeof parsed !== "object" || Array.isArray(parsed))) {
      console.error(`❌ ${file.path}: Expected object, got ${typeof parsed}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${file.path} — valid`);
    }
  } catch (err) {
    console.error(`❌ ${file.path}: Invalid JSON — ${err.message}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\n❌ Validation failed. Fix errors above.");
  process.exit(1);
} else {
  console.log("\n✅ All JSON files valid.");
}
