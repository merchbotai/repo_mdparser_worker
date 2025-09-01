"use strict";
/**
 * MerchDominator Parser - Uproszczona wersja
 * ==========================================
 *
 * Kompletny parser i saver w jednym pliku (~250 linii)
 * Prosty, niezawodny, łatwy w debugowaniu
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 3.0.0
 * Licencja: MIT
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
exports.parseAndSave = parseAndSave;
exports.parseMerchDominatorHtml = parseAndSave;
exports.parseHtml = parseHtml;
const cheerio = __importStar(require("cheerio"));
const zod_1 = require("zod");
// PROSTA walidacja - permisywna, nie odrzuca danych
const ProductSchema = zod_1.z.object({
    asin: zod_1.z.string(),
    marketplace_id: zod_1.z.number().default(1),
    title: zod_1.z.string().nullable().default(null),
    price: zod_1.z.number().nullable().default(null),
    currency_code: zod_1.z.string().nullable().default(null),
    rating: zod_1.z.number().nullable().default(null),
    reviews_count: zod_1.z.number().nullable().default(null),
    bsr: zod_1.z.number().nullable().default(null),
    bsr_30_days: zod_1.z.number().nullable().default(null),
    product_url: zod_1.z.string().nullable().default(null),
    image_urls: zod_1.z.array(zod_1.z.string()).default([]),
    bullet_points: zod_1.z.array(zod_1.z.string()).default([]),
    brand_name: zod_1.z.string().nullable().default(null),
    product_type: zod_1.z.string().nullable().default(null),
    publication_date: zod_1.z.string().nullable().default(null),
    raw_data: zod_1.z.record(zod_1.z.any()).default({})
});
// GŁÓWNA FUNKCJA - parse + save w jednym
async function parseAndSave(html, supabase, options = { marketplace_id: 1, dry_run: false }) {
    const { products, errors } = parseHtml(html, { marketplace_id: options.marketplace_id });
    // SAVE - prosty batch insert
    if (!options.dry_run && products.length > 0) {
        const saved = await saveBatch(products, supabase);
        return { products: products.length, saved, errors };
    }
    return { products: products.length, saved: 0, errors };
}
/**
 * Parsuje HTML i zwraca kompletne produkty (url, title, brand_name, bsr) oraz błędy
 */
function parseHtml(html, options = { marketplace_id: 1 }) {
    const $ = cheerio.load(html);
    const products = [];
    const errors = [];
    const seenAsins = new Set();
    // PARSE - prosty i niezawodny
    // Szerszy wybór kafelków: nie wymagamy data-asin na kontenerze
    const $cards = $('.card.ecommerce-card, .show-wrapper, .ecommerce-card, [data-product_id], [data-asin]');
    $cards.each((i, card) => {
        try {
            const $card = $(card);
            // Pomiń ukryte karty (modale/szablony)
            if (isHidden($card))
                return;
            // ASIN - multiple fallbacks
            const asin = $card.attr('data-asin') ||
                $card.find('[data-asin]').attr('data-asin') ||
                $card.find('.copy-product-asin').attr('data-asin') ||
                extractAsin($card.find('a[href*="/dp/"]').attr('href')) ||
                extractAsin($card.find('[id*="-asin"]').text()) ||
                extractAsin($card.html() || '');
            if (!asin)
                return; // Skip bez ASIN
            if (seenAsins.has(asin))
                return; // Deduplikacja po ASIN
            seenAsins.add(asin);
            // Proste ekstrakcje z fallbacks
            const product = {
                asin,
                marketplace_id: options.marketplace_id,
                title: extractFirst($card, [
                    'h6.item-name a',
                    '[data-title]',
                    '.title',
                    'h5 .title',
                    '.item-name'
                ]) || null,
                price: parseFloat(extractFirst($card, [
                    'div[title="Price"] span',
                    '.price',
                    '[data-price]'
                ])?.replace(/[^0-9.,]/g, '').replace(',', '.') || '') || null,
                currency_code: detectCurrency(extractFirst($card, [
                    'div[title="Price"] span',
                    '.price',
                    '[data-price]'
                ]) || ''),
                rating: parseFloat(extractFirst($card, [
                    'div[title="Ratings"] span',
                    '.rating span',
                    '[data-rating]'
                ]) || '') || null,
                reviews_count: parseInt((extractFirst($card, [
                    'div[title="Reviews"] span',
                    '.reviews-count',
                    '[data-reviews]'
                ]) || '').replace(/\D/g, '')) || null,
                bsr: parseInt((extractFirst($card, [
                    'div[title="Current BSR"] span',
                    '.bsr span',
                    '[data-bsr]'
                ]) || '').replace(/,/g, '')) || null,
                bsr_30_days: parseInt((extractFirst($card, [
                    '.average-bsr-30-days',
                    'div[title="Average BSR over 30 days"] span',
                    '[data-bsr-30]'
                ]) || '').replace(/,/g, '')) || null,
                product_url: extractFirstAttr($card, [
                    `a[href*="/dp/${asin}"]`,
                    'a[href*="/dp/"]',
                    'a[title="More Info"]'
                ], 'href') || `https://www.amazon.com/dp/${asin}`,
                image_urls: extractImages($card, $),
                bullet_points: $card.find('.item-bulletpoints li').map((_, el) => $(el).text().trim()).get(),
                brand_name: cleanBrand($card.find('.item-company, .brand, .brand-name').first().text()),
                product_type: $card.find('[data-product_type]').attr('data-product_type') || 't-shirt',
                publication_date: normalizeDate(extractFirst($card, [
                    '.item-date-first-available span',
                    '[title="Published Date"] span'
                ]) || ''),
                raw_data: {
                    html: $.html($card).substring(0, 1000)
                }
            };
            // Permisywna walidacja
            const validated = ProductSchema.parse(product);
            // Wymagana kompletność: url, title, brand_name, bsr
            const isComplete = Boolean(validated.product_url &&
                validated.title &&
                validated.brand_name &&
                validated.bsr !== null);
            if (!isComplete) {
                return; // pomiń niekompletne rekordy
            }
            products.push(validated);
        }
        catch (err) {
            errors.push({ index: i, error: String(err) });
        }
    });
    return { products, errors };
}
// Helper do wyciągania pierwszego niepustego tekstu
function extractFirst($el, selectors) {
    for (const sel of selectors) {
        const text = $el.find(sel).first().text().trim();
        if (text)
            return text;
    }
    return null;
}
function extractFirstAttr($el, selectors, attr) {
    for (const sel of selectors) {
        const val = $el.find(sel).first().attr(attr);
        if (val)
            return val;
    }
    return null;
}
// PROSTE HELPERY - bez over-engineering
function extractAsin(text) {
    if (!text)
        return null;
    const match = text.match(/\b([A-Z0-9]{10})\b/);
    return match?.[1] || null;
}
function detectCurrency(text) {
    if (text.includes('$'))
        return 'USD';
    if (text.includes('£'))
        return 'GBP';
    if (text.includes('€'))
        return 'EUR';
    if (text.includes('C$'))
        return 'CAD';
    if (text.includes('A$'))
        return 'AUD';
    if (text.includes('¥'))
        return 'JPY';
    if (text.includes('₹'))
        return 'INR';
    return null;
}
function cleanBrand(text) {
    if (!text)
        return null;
    const cleaned = text.replace(/^By\s+/i, '').trim();
    return cleaned || null;
}
function normalizeDate(text) {
    if (!text)
        return null;
    // ISO format już jest ok
    if (/^\d{4}-\d{2}-\d{2}$/.test(text))
        return text;
    // Prosty parser dla "Jul 18, 2025"
    const months = {
        Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
        Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
    };
    const match = text.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
    if (match) {
        const [_, month, day, year] = match;
        const monthNum = months[month];
        if (monthNum) {
            return `${year}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    return null;
}
function extractImages($card, $) {
    const images = new Set();
    // Z background-image
    const bgStyle = $card.find('.item-img, [style*="background-image"]').attr('style') || '';
    const bgMatch = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (bgMatch)
        images.add(bgMatch[1]);
    // Z data-url
    $card.find('[data-url]').each((_, el) => {
        const url = $(el).attr('data-url');
        if (url)
            images.add(url);
    });
    // Z img src
    $card.find('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('placeholder'))
            images.add(src);
    });
    return Array.from(images);
}
function isHidden($card) {
    // Sam element
    if ($card.is('.template, .hidden, .d-none'))
        return true;
    if ($card.attr('hidden') !== undefined)
        return true;
    if ($card.attr('aria-hidden') === 'true')
        return true;
    const style = ($card.attr('style') || '').toLowerCase();
    if (style.includes('display:none'))
        return true;
    // Rodzice
    const hiddenParent = $card.closest('.modal, .template, .hidden, .d-none, [hidden], [aria-hidden="true"], [style*="display:none"]');
    return hiddenParent && hiddenParent.length > 0;
}
// PROSTY BATCH SAVE - bez p-limit i skomplikowanych transakcji
async function saveBatch(products, supabase) {
    const BATCH_SIZE = 50;
    let saved = 0;
    try {
        // Odfiltruj już istniejące produkty (po asin + marketplace_id)
        const uniqueAsins = [...new Set(products.map(p => p.asin))];
        let existingKeys = new Set();
        if (uniqueAsins.length) {
            const { data: existing } = await supabase
                .from('products')
                .select('asin, marketplace_id')
                .in('asin', uniqueAsins);
            if (existing) {
                for (const row of existing) {
                    existingKeys.add(`${row.asin}::${row.marketplace_id}`);
                }
            }
        }
        const newProducts = products.filter(p => !existingKeys.has(`${p.asin}::${p.marketplace_id}`));
        if (newProducts.length === 0)
            return 0;
        // 1. Najpierw brands i types (unikalne)
        const uniqueBrands = [...new Set(newProducts.map(p => p.brand_name).filter(Boolean))];
        const uniqueTypes = [...new Set(newProducts.map(p => p.product_type).filter(Boolean))];
        if (uniqueBrands.length) {
            await supabase.from('brands')
                .upsert(uniqueBrands.map(name => ({ name })), { onConflict: 'name' });
        }
        if (uniqueTypes.length) {
            await supabase.from('product_types')
                .upsert(uniqueTypes.map(name => ({ name })), { onConflict: 'name' });
        }
        // 2. Cache dla ID
        const brandIds = await getCachedIds('brands', uniqueBrands, supabase);
        const typeIds = await getCachedIds('product_types', uniqueTypes, supabase);
        // 3. Produkty w batch'ach (tylko nowe)
        for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
            const batch = newProducts.slice(i, i + BATCH_SIZE);
            const productsToSave = batch.map(p => ({
                asin: p.asin,
                marketplace_id: p.marketplace_id,
                title: p.title,
                price: p.price,
                currency_code: p.currency_code,
                rating: p.rating,
                reviews_count: p.reviews_count,
                bsr: p.bsr,
                bullet_points: p.bullet_points,
                images: p.image_urls,
                product_url: p.product_url,
                published_at: p.publication_date,
                raw_data: p.raw_data,
                brand_id: p.brand_name ? brandIds[p.brand_name] : null,
                product_type_id: p.product_type ? typeIds[p.product_type] : null,
                updated_at: new Date().toISOString()
            }));
            const { error } = await supabase.from('products')
                .insert(productsToSave);
            if (!error)
                saved += batch.length;
            // 4. Historia - prosty insert, bez deduplikacji
            const now = new Date().toISOString();
            const histories = batch.flatMap(p => {
                const items = [];
                if (p.bsr)
                    items.push({ asin: p.asin, bsr: p.bsr, recorded_at: now });
                if (p.price)
                    items.push({ asin: p.asin, price: p.price, currency_code: p.currency_code, recorded_at: now });
                if (p.reviews_count !== null || p.rating !== null)
                    items.push({ asin: p.asin, reviews_count: p.reviews_count, rating: p.rating, recorded_at: now });
                return items;
            });
            const bsrHistories = histories.filter(h => 'bsr' in h);
            const priceHistories = histories.filter(h => 'price' in h);
            const reviewHistories = histories.filter(h => 'reviews_count' in h);
            if (bsrHistories.length)
                await supabase.from('bsr_history').insert(bsrHistories);
            if (priceHistories.length)
                await supabase.from('price_history').insert(priceHistories);
            if (reviewHistories.length)
                await supabase.from('review_history').insert(reviewHistories);
        }
        return saved;
    }
    catch (error) {
        console.error('Save error:', error);
        return saved;
    }
}
// Prosty cache dla ID
async function getCachedIds(table, names, supabase) {
    if (!names.length)
        return {};
    const { data } = await supabase
        .from(table)
        .select('id, name')
        .in('name', names);
    const map = {};
    if (data) {
        for (const item of data) {
            map[item.name] = item.id;
        }
    }
    return map;
}
//# sourceMappingURL=mdparser.js.map