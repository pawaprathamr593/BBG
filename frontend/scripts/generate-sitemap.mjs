import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(directory, '../public');
const publicOriginValue = process.env.BBG_PUBLIC_ORIGIN;
const apiBaseValue = process.env.BBG_API_BASE_URL;

if (!publicOriginValue || !apiBaseValue) {
  throw new Error('Set BBG_PUBLIC_ORIGIN and BBG_API_BASE_URL before generating the public sitemap.');
}

const publicOrigin = new URL(publicOriginValue);
const apiBase = new URL(apiBaseValue);
if (!['http:', 'https:'].includes(publicOrigin.protocol) || !['http:', 'https:'].includes(apiBase.protocol)) {
  throw new Error('Sitemap origins must use HTTP or HTTPS.');
}
const origin = publicOrigin.origin.replace(/\/$/, '');
const pageSize = 50;
const urls = new Set([
  '/',
  '/businesses',
  '/promotions',
]);

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

async function post(pathname, envelope, actionType, actionData) {
  const response = await fetch(new URL(pathname, apiBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ [envelope]: { actionType, actionData } }),
  });
  const payload = await response.json();
  if (!response.ok || payload.status !== 'SUCCESS' || !payload.data || Array.isArray(payload.data)) {
    const message = Array.isArray(payload.msgArr) ? payload.msgArr.join(' ') : '';
    throw new Error(message || `Public sitemap request failed: ${pathname} (${response.status})`);
  }
  return payload.data;
}

async function collectPages(pathname, actionType, actionData = {}) {
  const first = await post(pathname, 'marketplaceParam', actionType, { ...actionData, page: 1, page_size: pageSize });
  const items = Array.isArray(first.items) ? [...first.items] : [];
  const total = Number(first.pagination?.total ?? items.length);
  const pages = Math.min(100, Math.ceil(total / pageSize));
  for (let page = 2; page <= pages; page += 1) {
    const next = await post(pathname, 'marketplaceParam', actionType, { ...actionData, page, page_size: pageSize });
    if (Array.isArray(next.items)) items.push(...next.items);
  }
  return items;
}

const businesses = await collectPages('/api/v1/marketplace/businesses/list', 'listBusinesses');
for (const business of businesses) {
  if (!business?.business_slug) continue;
  const base = `/businesses/${encodeURIComponent(business.business_slug)}`;
  [base, `${base}/about`, `${base}/products`, `${base}/promotions`, `${base}/contact`].forEach((url) => urls.add(url));

  const products = await collectPages('/api/v1/marketplace/products/list', 'listProducts', {
    business_slug: business.business_slug,
  });
  for (const product of products) {
    if (Number.isInteger(Number(product?.id)) && Number(product.id) > 0) {
      urls.add(`${base}/products/${Number(product.id)}`);
    }
  }
}

const promotions = await collectPages('/api/v1/marketplace/promotions/list', 'listPublicPromotions');
for (const promotion of promotions) {
  if (Number.isInteger(Number(promotion?.id)) && Number(promotion.id) > 0) {
    urls.add(`/promotions/${Number(promotion.id)}`);
  }
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...[...urls].sort().map((url) => `  <url><loc>${escapeXml(new URL(url, origin).toString())}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

await mkdir(publicDirectory, { recursive: true });
await writeFile(path.join(publicDirectory, 'sitemap.xml'), xml, 'utf8');

const robotsPath = path.join(publicDirectory, 'robots.txt');
const existingRobots = await readFile(robotsPath, 'utf8').catch(() => 'User-agent: *\nAllow: /\nDisallow: /api/\n');
const robots = existingRobots.split(/\r?\n/).filter((line) => !/^\s*sitemap:/i.test(line));
robots.push(`Sitemap: ${origin}/sitemap.xml`);
await writeFile(robotsPath, `${robots.filter(Boolean).join('\n')}\n`, 'utf8');

console.log(`Generated sitemap.xml with ${urls.size} public URLs.`);
