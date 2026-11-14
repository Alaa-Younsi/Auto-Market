// Builds src/data/communes.json — every commune (baladiya) of the 69 wilayas,
// French + Arabic names, grouped by wilaya — from the geoalgeria dataset.
//
//   1. download https://cdn.jsdelivr.net/npm/geoalgeria@2.4.1/data/ecommerce/communes.json
//      and .../data/wilayas.json into a folder
//   2. node scripts/build-communes.mjs <that folder>
//
// Source: geoalgeria 2.4.1 (https://github.com/yasserstudio/geoalgeria). The
// names/codes compilation is MIT-licensed (Copyright (c) 2025-2026 Yasser's
// studio); only names are used here, no OpenStreetMap-derived fields.
//
// Communes don't affect the delivery price (that is per wilaya) — this list
// only powers the checkout dropdown so couriers get a real commune name.
import { readFileSync, writeFileSync } from "node:fs";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/build-communes.mjs <geoalgeria data folder>");
  process.exit(1);
}

const communes = JSON.parse(readFileSync(`${dir}/data/ecommerce/communes.json`, "utf8"));
const wilayas = JSON.parse(readFileSync(`${dir}/data/wilayas.json`, "utf8")).wilayas;
if (communes.length !== 1541 || wilayas.length !== 69) {
  throw new Error(`unexpected counts: ${communes.length} communes, ${wilayas.length} wilayas`);
}

const out = {};
for (const w of wilayas) {
  out[w.code] = { fr: w.name_fr, ar: w.name_ar, communes: [] };
}
for (const c of communes) {
  out[c.wilaya_code].communes.push([c.commune_name_fr, c.commune_name_ar]);
}
for (const w of Object.values(out)) {
  w.communes.sort((a, b) => a[0].localeCompare(b[0], "fr"));
}

writeFileSync(
  "src/data/communes.json",
  `${JSON.stringify({ source: "geoalgeria@2.4.1 (MIT) — scripts/build-communes.mjs", wilayas: out })}\n`
);
console.log(`wrote ${communes.length} communes for ${wilayas.length} wilayas`);
