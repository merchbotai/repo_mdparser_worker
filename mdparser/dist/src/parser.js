"use strict";
/**
 * MerchDominator Parser
 * =====================
 *
 * Parser HTML do ekstrakcji danych produktów z merchdominator.com.
 * Używa biblioteki cheerio do parsowania HTML i Zod do walidacji danych.
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 2.0.0
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMerchDominatorHtml = parseMerchDominatorHtml;
const cheerio = __importStar(require("cheerio"));
const zod_1 = require("zod");
const dayjs_1 = __importDefault(require("dayjs"));
const customParseFormat_1 = __importDefault(require("dayjs/plugin/customParseFormat"));
dayjs_1.default.extend(customParseFormat_1.default);
/**
 * Schema Zod definiująca strukturę danych produktu
 * Waliduje i typuje wszystkie pola produktu
 */
const ProductDataSchema = zod_1.z.object({
    // Identyfikatory
    asin: zod_1.z.string().regex(/^[A-Z0-9]{10}$/),
    marketplace_id: zod_1.z.number().int().positive(),
    // Dane podstawowe
    title: zod_1.z.string().nullable(),
    price: zod_1.z.number().positive().nullable(),
    currency_code: zod_1.z.string().length(3).nullable(),
    // Oceny i recenzje
    rating: zod_1.z.number().min(0).max(5).nullable(),
    reviews_count: zod_1.z.number().int().min(0).nullable(),
    // Rankingi
    bsr: zod_1.z.number().int().positive().nullable(),
    bsr_30_days: zod_1.z.number().int().positive().nullable(), // Średni BSR z 30 dni
    // Linki i media
    product_url: zod_1.z.string().url().nullable(),
    image_urls: zod_1.z.array(zod_1.z.string().url()),
    // Szczegóły produktu
    bullet_points: zod_1.z.array(zod_1.z.string()),
    brand_name: zod_1.z.string().nullable(),
    product_type: zod_1.z.string().nullable(),
    publication_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    // Dodatkowe metadane
    scraped_at: zod_1.z.string().datetime(),
    data_product_id: zod_1.z.string().nullable(), // ID wewnętrzne merchdominator
    // Surowe dane (rozszerzone)
    raw_data: zod_1.z.object({
        html_fragment: zod_1.z.string(), // Fragment HTML produktu
        extracted_values: zod_1.z.record(zod_1.z.unknown()), // Wszystkie wyekstraktowane wartości
        selectors_used: zod_1.z.record(zod_1.z.string()), // Które selektory zadziałały
        extraction_warnings: zod_1.z.array(zod_1.z.string()) // Ostrzeżenia z parsowania
    })
});
/**
 * Mapa selektorów CSS z priorytetami dla każdego pola
 * Umożliwia elastyczne dopasowanie do różnych struktur HTML
 */
const SELECTOR_MAP = {
    /** Selektory dla karty produktu */
    product_card: [
        '[data-product-card]',
        '.product-card',
        'div[data-product_id]',
        '.show-wrapper'
    ],
    /** Selektory dla ASIN (funkcje i selektory) */
    asin: [
        (el) => el.attr('data-asin'),
        (el) => el.find('[data-asin]').first().attr('data-asin'),
        (el) => {
            const href = el.find('a[href*="/dp/"]').attr('href') || '';
            return href.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
        }
    ],
    /** Selektory dla tytułu produktu */
    title: [
        '[data-title]',
        '.item-name a',
        'h6.item-name > a',
        'h5 .title',
        '.title'
    ],
    /** Selektory dla ceny produktu */
    price: [
        'div[title="Price"] span',
        '.price',
        '[data-price]'
    ],
    /** Selektory dla oceny produktu */
    rating: [
        'div[title="Ratings"] span',
        '.rating span',
        '[data-rating]'
    ],
    /** Selektory dla liczby recenzji */
    reviews: [
        'div[title="Reviews"] span',
        '.reviews-count',
        '[data-reviews]'
    ],
    /** Selektory dla BSR (Best Sellers Rank) */
    bsr: [
        'div[title="Current BSR"] span',
        '.bsr span',
        '[data-bsr]'
    ],
    /** Selektory dla 30-dniowego średniego BSR */
    bsr30: [
        '.average-bsr-30-days',
        'div[title="Average BSR over 30 days"] span',
        '[data-bsr-30]'
    ],
    /** Selektory dla marki produktu */
    brand: [
        '.item-company',
        '.brand-name',
        '[data-brand]'
    ],
    /** Selektory dla zdjęć produktu */
    image: [
        'img[data-url]',
        '.product-image img',
        'div[data-product_type] img'
    ]
};
/**
 * Ekstrahuje tekst z elementu Cheerio
 *
 * @param $el - Element Cheerio
 * @param $ - Instancja CheerioAPI
 * @returns Wyekstrahowany tekst lub null
 */
function extractText($el, $) {
    const text = $el.text().trim();
    return text || null;
}
/**
 * Ekstrahuje liczbę z tekstu
 * Obsługuje różne formaty (przecinki, kropki, symbole)
 *
 * @param text - Tekst zawierający liczbę
 * @returns Wyekstrahowana liczba lub null
 */
function extractNumber(text) {
    if (!text)
        return null;
    // Usuń wszystko oprócz cyfr i kropki/przecinka
    const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
}
/**
 * Ekstrahuje kod waluty z tekstu ceny
 *
 * @param priceText - Tekst zawierający cenę i symbol waluty
 * @returns Kod waluty (np. "USD") lub null
 */
function extractCurrency(priceText) {
    if (!priceText)
        return null;
    // Mapa symboli walut na kody ISO
    const currencyMap = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY'
    };
    // Szukaj symbolu waluty
    for (const [symbol, code] of Object.entries(currencyMap)) {
        if (priceText.includes(symbol))
            return code;
    }
    // Szukaj kodu ISO
    const isoMatch = priceText.match(/[A-Z]{3}/);
    return isoMatch?.[0] || 'USD'; // Domyślnie USD
}
/**
 * Główna funkcja parsująca HTML z merchdominator.com
 *
 * @param html - Surowy HTML do sparsowania
 * @param options - Opcje konfiguracyjne parsera
 * @returns Tablica sparsowanych produktów
 */
function parseMerchDominatorHtml(html, options) {
    const $ = cheerio.load(html);
    const products = [];
    const warnings = [];
    // Znajdź wszystkie karty produktów
    const $productCards = $(SELECTOR_MAP.product_card.join(', '));
    console.log(`[Parser] Znaleziono ${$productCards.length} kart produktów`);
    // Iteruj po wszystkich znalezionych kartach produktów
    $productCards.each((index, element) => {
        // Sprawdź limit produktów
        if (options.max_products && products.length >= options.max_products) {
            return false; // Przerwij pętlę
        }
        const $card = $(element);
        const productWarnings = [];
        const selectorsUsed = {};
        try {
            // ASIN - krytyczne pole
            let asin = null;
            for (const selector of SELECTOR_MAP.asin) {
                asin = typeof selector === 'function'
                    ? selector($card)
                    : $card.attr('data-asin');
                if (asin) {
                    selectorsUsed.asin = selector.toString();
                    break;
                }
            }
            // Jeśli brak ASIN, pomiń ten produkt
            if (!asin) {
                productWarnings.push('Brak ASIN - pomijam produkt');
                return; // Kontynuuj z następnym produktem
            }
            // Tytuł
            let title = null;
            for (const selector of SELECTOR_MAP.title) {
                const $el = $card.find(selector).first();
                title = extractText($el, $);
                if (title) {
                    selectorsUsed.title = selector;
                    break;
                }
            }
            // Cena i waluta
            let price = null;
            let currency_code = null;
            for (const selector of SELECTOR_MAP.price) {
                const $el = $card.find(selector).first();
                const priceText = extractText($el, $);
                if (priceText) {
                    price = extractNumber(priceText);
                    currency_code = extractCurrency(priceText);
                    selectorsUsed.price = selector;
                    break;
                }
            }
            // Rating
            let rating = null;
            for (const selector of SELECTOR_MAP.rating) {
                const $el = $card.find(selector).first();
                const ratingText = extractText($el, $);
                rating = extractNumber(ratingText);
                if (rating !== null) {
                    selectorsUsed.rating = selector;
                    break;
                }
            }
            // Reviews
            let reviews_count = null;
            for (const selector of SELECTOR_MAP.reviews) {
                const $el = $card.find(selector).first();
                const reviewsText = extractText($el, $);
                reviews_count = extractNumber(reviewsText);
                if (reviews_count !== null) {
                    selectorsUsed.reviews = selector;
                    break;
                }
            }
            // BSR
            let bsr = null;
            for (const selector of SELECTOR_MAP.bsr) {
                const $el = $card.find(selector).first();
                const bsrText = extractText($el, $);
                bsr = extractNumber(bsrText);
                if (bsr !== null) {
                    selectorsUsed.bsr = selector;
                    break;
                }
            }
            // BSR 30 dni
            let bsr_30_days = null;
            for (const selector of SELECTOR_MAP.bsr30) {
                const $el = $card.find(selector).first();
                const bsr30Text = extractText($el, $);
                bsr_30_days = extractNumber(bsr30Text);
                if (bsr_30_days !== null) {
                    selectorsUsed.bsr30 = selector;
                    break;
                }
            }
            // Brand
            let brand_name = null;
            for (const selector of SELECTOR_MAP.brand) {
                const $el = $card.find(selector).first();
                let brandText = extractText($el, $);
                // Usuń "By " z początku
                if (brandText?.startsWith('By ')) {
                    brandText = brandText.substring(3);
                }
                if (brandText) {
                    brand_name = brandText;
                    selectorsUsed.brand = selector;
                    break;
                }
            }
            // Obrazki
            const image_urls = [];
            $card.find(SELECTOR_MAP.image.join(', ')).each((_, img) => {
                const src = $(img).attr('src') || $(img).attr('data-src');
                if (src && !image_urls.includes(src)) {
                    image_urls.push(src);
                }
            });
            // URL produktu
            const product_url = $card.find('a[href*="amazon.com"]').first().attr('href') || null;
            // Typ produktu z data-product_type
            const product_type = $card.find('[data-product_type]').attr('data-product_type') ||
                $card.attr('data-product_type') ||
                null;
            // Data publikacji (może być trudna do znalezienia)
            const publication_date = null; // TODO: Dodać logikę jeśli znajdziemy selektor
            // ID wewnętrzne merchdominator
            const data_product_id = $card.attr('data-product_id') ||
                $card.find('[data-product_id]').attr('data-product_id') ||
                null;
            // Surowe dane
            const raw_data = {
                html_fragment: options.capture_html ? $card.html() || '' : '',
                extracted_values: {
                    asin,
                    title,
                    price,
                    currency_code,
                    rating,
                    reviews_count,
                    bsr,
                    bsr_30_days,
                    brand_name,
                    product_type,
                    image_count: image_urls.length,
                    data_product_id
                },
                selectors_used: selectorsUsed,
                extraction_warnings: productWarnings
            };
            // Tworzenie obiektu produktu
            const productData = {
                asin,
                marketplace_id: options.marketplace_id,
                title,
                price,
                currency_code,
                rating,
                reviews_count,
                bsr,
                bsr_30_days,
                product_url,
                image_urls,
                bullet_points: [], // TODO: Dodać ekstrakcję jeśli są dostępne
                brand_name,
                product_type,
                publication_date,
                scraped_at: new Date().toISOString(),
                data_product_id,
                raw_data
            };
            // Walidacja danych za pomocą Zod
            try {
                const validated = ProductDataSchema.parse(productData);
                products.push(validated);
            }
            catch (validationError) {
                if (options.strict_mode) {
                    productWarnings.push(`Walidacja nieudana: ${validationError}`);
                    warnings.push(`Produkt ${asin}: ${productWarnings.join('; ')}`);
                }
                else {
                    // W trybie nieścisłym dodaj mimo błędów walidacji
                    products.push(productData);
                }
            }
        }
        catch (error) {
            warnings.push(`Błąd parsowania produktu ${index}: ${error}`);
        }
    });
    // Logowanie podsumowania
    console.log(`[Parser] Sparsowano ${products.length} produktów`);
    if (warnings.length > 0) {
        console.warn(`[Parser] Ostrzeżenia (${warnings.length}):`, warnings.slice(0, 5));
    }
    return products;
}
//# sourceMappingURL=parser.js.map