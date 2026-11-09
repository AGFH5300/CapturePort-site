import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";

const ROOT="."; const SITE="https://captureport.app";
const read=p=>readFileSync(p,"utf8");
function htmlFiles(dir="") {
  const result=[];
  for(const entry of readdirSync(dir||ROOT,{withFileTypes:true})) {
    const name=dir?posix.join(dir,entry.name):entry.name;
    if(entry.isDirectory() && ![".github",".git","node_modules","assets","scripts"].includes(entry.name)) result.push(...htmlFiles(name));
    if(entry.isFile() && name.endsWith(".html")) result.push(name);
  }
  return result;
}
function get(source,re){return source.match(re)?.[1]||null}
const pages=htmlFiles().sort();
const siteRoutes=new Set(pages.map(p=>p==="index.html"?"/":"/"+p.replace(/\/index\.html$/,"")+"/"));
const sitemap=read("sitemap.xml");
const errors=[],warnings=[];
const titles=new Map(),canons=new Map();
for(const path of pages){
  const source=read(path);
  const route=path==="index.html"?"/":"/"+path.replace(/\/index\.html$/,"")+"/";
  const expectedCanon=SITE+route;
  const title=get(source,/<title[^>]*>([^<]+)<\/title>/i);
  const description=get(source,/<meta[^>]+name="description"[^>]*content="([^"]*)"/i);
  const canonical=get(source,/<link[^>]+rel="canonical"[^>]*href="([^"]*)"/i);
  const h1=(source.match(/<h1(?:\s|>)/gi)||[]).length;
  if(!title||!title.trim())errors.push(`${path}: no title`);
  if(!description||description.length<35)errors.push(`${path}: missing or short description`);
  if(canonical!==expectedCanon)errors.push(`${path}: canonical ${canonical} expected ${expectedCanon}`);
  if(h1!==1)errors.push(`${path}: expected 1 h1, found ${h1}`);
  if(title){if(titles.has(title))errors.push(`${path}: duplicate title with ${titles.get(title)}`);else titles.set(title,path)}
  if(canonical){if(canons.has(canonical))errors.push(`${path}: duplicate canonical with ${canons.get(canonical)}`);else canons.set(canonical,path)}
  if(!sitemap.includes(`<loc>${expectedCanon}</loc>`))errors.push(`${path}: not listed in sitemap.xml`);

  for(const match of source.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)){
    try{JSON.parse(match[1])}catch(e){errors.push(`${path}: invalid JSON-LD ${String(e).slice(0,100)}`)}
  }
  for(const match of source.matchAll(/<img\b[^>]*>/gi)){
    if(!/\balt=/.test(match[0]))errors.push(`${path}: image without alt attribute`);
  }
  for(const match of source.matchAll(/<a\b[^>]*href="([^"]+)"/gi)){
    const href=match[1]; if(!href.startsWith("/")||href.startsWith("//"))continue;
    const pathname=href.split(/[?#]/)[0];if(!pathname)continue;
    if(pathname.endsWith(".txt")||pathname.endsWith(".xml")||pathname.endsWith(".webmanifest")){
      if(!existsSync(pathname.slice(1)))errors.push(`${path}: missing referenced ${pathname}`);
      continue;
    }
    const target=pathname.endsWith("/")?pathname:pathname+"/";
    if(!siteRoutes.has(target))errors.push(`${path}: invalid internal link ${href}`);
  }
  if(!["/privacy/","/terms/","/delete-account/","/delete-data/"].includes(route)){
    if(!source.includes('src="/traffic.js"'))errors.push(`${path}: visitor tracker missing`);
  }
  if(/(?:lorem ipsum|\bTODO\b|\bTBD\b|\[insert (?:text|name|company))/i.test(source.replace(/<script[\s\S]*?<\/script>/gi," ")))warnings.push(`${path}: editorial placeholder text`);
}
const home=read("index.html");
if(home.includes('href="/pilot" class="btn-primary"')&&home.includes('href="/pilot" class="btn-ghost"'))errors.push("Homepage duplicate pilot CTA destinations");
if(home.includes("No login required")||home.includes("No signal needed at any stage"))errors.push("Homepage has an unqualified offline or login claim");
const contact=read("contact/index.html");
if(!contact.includes('src="/traffic.js"'))errors.push("Contact visits not tracked");
console.log(`AUDITED ${pages.length} HTML pages; ${siteRoutes.size} site routes, ${titles.size} unique titles, ${canons.size} canonical links.`);
if(warnings.length)console.log("WARNINGS:",warnings.join("\n"));
if(errors.length){console.error("AUDIT FAILURES:",errors.join("\n"));process.exitCode=1}else console.log("PASS site navigation, accessibility basics, SEO metadata, JSON-LD, sitemap coverage and tracking.");
