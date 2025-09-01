"use strict";
/**
 * MerchDominator Parser - Test JSON (API Response)
 * ================================================
 *
 * Użycie:
 * npx ts-node examples/test-json.ts --file "../response copy.txt" --out "../parsed-api.jsonl"
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const cheerio = __importStar(require("cheerio"));
const args = process.argv.slice(2);
const filePath = args.find((_, i) => args[i - 1] === '--file') || '../response copy.txt';
const outPath = args.find((_, i) => args[i - 1] === '--out');
function currencyFromSymbol(sym) {
    if (!sym)
        return null;
    switch (sym) {
        case '$': return 'USD';
        case '£': return 'GBP';
        case '€': return 'EUR';
        case 'C$': return 'CAD';
        case 'A$': return 'AUD';
        case '¥': return 'JPY';
        case '₹': return 'INR';
        default: return null;
    }
}
function stripHtmlList(html) {
    if (!html)
        return [];
    try {
        const $ = cheerio.load(html);
        return $('li').map((_, li) => $(li).text().trim()).get();
    }
    catch {
        return [];
    }
}
function parseBulletpointsJson(text) {
    if (!text)
        return [];
    try {
        const arr = JSON.parse(text);
        if (Array.isArray(arr))
            return arr.map(v => String(v));
        return [];
    }
    catch {
        return [];
    }
}
function mapItemToProduct(item) {
    const asin = item?.asin ?? null;
    if (!asin)
        return null;
    const title = item?.title ?? null;
    const brand = item?.brand ?? null;
    const product_url = (item?.amazon_link ?? item?.amazon_listing_url) ?? null;
    const bsr = Number.isFinite(+item?.current_rank) ? +item.current_rank :
        (Number.isFinite(+item?.best_seller_rank) ? +item.best_seller_rank :
            (Number.isFinite(+item?.keepa_rank) ? +item.keepa_rank : null));
    const priceNum = Number.parseFloat(String(item?.price ?? '').replace(',', '.'));
    const currency_code = currencyFromSymbol(item?.currency_symbol ?? null);
    const ratingNum = Number.parseFloat(String(item?.rating ?? '').replace(',', '.'));
    const reviewsNum = Number.isFinite(+item?.reviews) ? +item.reviews : null;
    const bsr30 = Number.isFinite(+item?.last_month_product_bsr_history_avg_rank) ? +item.last_month_product_bsr_history_avg_rank : null;
    const marketplaceId = Number.isFinite(+item?.market_place_id) ? +item.market_place_id : 1;
    const publication_date = item?.date_first_available ?? null;
    const images = [item?.image_url, item?.image_design_url].filter(Boolean);
    const bp = parseBulletpointsJson(item?.bulletpoints) || [];
    const bpHtml = stripHtmlList(item?.productBulletPoints) || [];
    const bullet_points = bp.length ? bp : bpHtml;
    const product = {
        asin,
        marketplace_id: marketplaceId,
        title,
        price: Number.isFinite(priceNum) ? priceNum : null,
        currency_code,
        rating: Number.isFinite(ratingNum) ? ratingNum : null,
        reviews_count: reviewsNum,
        bsr,
        bsr_30_days: bsr30,
        product_url,
        image_urls: images,
        bullet_points,
        brand_name: brand,
        product_type: item?.product_type ?? null,
        publication_date,
        raw_data: {
            api: true,
            product_id: item?.product_id ?? null,
            previous_rank: item?.previous_rank ?? null,
            rank_diff: item?.rank_diff ?? null,
            estimated_sales: item?.estimated_sales ?? null,
            climate_pledge_friendly: item?.amazon_climate_pledge_friendly ?? null,
            keepa_rank: item?.keepa_rank ?? null,
            keepa_rank_update: item?.keepa_rank_update ?? null,
            scraper_source: item?.scraper_source ?? null,
            amazon_listing_url: item?.amazon_listing_url ?? null
        }
    };
    // wymagana kompletność
    if (!product.product_url || !product.title || !product.brand_name || product.bsr === null) {
        return null;
    }
    return product;
}
function main() {
    console.log('=== MerchDominator Parser - Test JSON ===');
    console.log(`Plik: ${filePath}`);
    const raw = (0, fs_1.readFileSync)(filePath, 'utf-8');
    let json;
    try {
        json = JSON.parse(raw);
    }
    catch (e) {
        console.error('❌ Niepoprawny JSON w pliku');
        process.exit(1);
    }
    const list = Array.isArray(json) ? json : (Array.isArray(json?.result) ? json.result : []);
    if (!Array.isArray(list)) {
        console.error('❌ Nie znaleziono tablicy wyników');
        process.exit(1);
    }
    const seen = new Set();
    const products = [];
    let complete = 0;
    for (const item of list) {
        const p = mapItemToProduct(item);
        if (!p)
            continue;
        if (seen.has(p.asin))
            continue;
        seen.add(p.asin);
        products.push(p);
        complete++;
    }
    console.log(`Znaleziono w JSON: ${list.length} rekordów, kompletne: ${complete}`);
    if (outPath) {
        try {
            (0, fs_1.writeFileSync)(outPath, '');
        }
        catch { }
        for (const p of products)
            (0, fs_1.appendFileSync)(outPath, JSON.stringify(p) + '\n');
        console.log(`Zapisano JSONL: ${outPath}`);
    }
}
main();
//# sourceMappingURL=test-json.js.map