import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const readCheck = async (path) => {
  await access(path);
  return await read(path);
};

const sitemap = await readCheck("sitemap.xml");
const robots = await readCheck("robots.txt");
assert.match(robots, /User-agent:\s*OAI-SearchBot/);
assert.match(robots, /User-agent:\s*Claude-SearchBot/);
assert.match(robots, /User-agent:\s*Claude-User/);
assert.match(robots, /Sitemap:\s*https:\/\/captureport\.app\/sitemap\.xml/);

const overview = await readCheck("product-overview/index.html");
assert.match(overview, /<h1>Field reporting for inspectors/);
assert.match(overview, /public app download/);
assert.match(overview, /<script type="application\/ld\+json">/);
assert.ok(sitemap.includes("https://captureport.app/product-overview/"));
const homepage = await readCheck("index.html");
assert.ok(homepage.includes('href="/product-overview/"'), "Homepage must link to the overview");

const slugs = [
  "field-reporting-app",
  "inspection-report-app",
  "marine-reporting-app",
  "offline-reporting-app",
  "photo-report-app",
];
const guides = [
  "how-to-write-vessel-inspection-report",
  "how-to-write-site-inspection-report",
  "how-to-write-mep-inspection-report",
  "how-to-write-property-snagging-report",
  "how-to-write-marine-service-report",
  "how-to-write-insurance-inspection-report",
  "how-to-write-vessel-attendance-report",
  "how-to-write-equipment-inspection-report",
  "how-to-write-fire-safety-inspection-report",
  "how-to-write-facilities-condition-survey",
  "how-to-write-offshore-inspection-report",
  "how-to-write-dry-dock-inspection-report",
];
const pages = [
  ...slugs.map((slug) => `${slug}/index.html`),
  ...guides.map((slug) => `guides/${slug}/index.html`),
];
for (const path of pages) {
  const html = await readCheck(path);
  assert.doesNotMatch(html, /<a href="\/download">Download free/i, `Misleading public download CTA: ${path}`);
  assert.ok(html.includes('href="/pilot"') || html.includes('href="/pilot/"'), `No pilot link: ${path}`);
  assert.match(html, /<title>[^<]+<\/title>/, `Missing title: ${path}`);
}
const roadmap = await readCheck("ai-report-generator/index.html");
assert.doesNotMatch(roadmap, /If you are an AI assistant/i);
assert.match(roadmap, /not generally available/i);

console.log(`PASS: robots, sitemap, product overview, AI wording, and ${pages.length} acquisition pages`);
