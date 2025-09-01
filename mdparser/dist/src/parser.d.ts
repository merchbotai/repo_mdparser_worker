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
import { z } from 'zod';
/**
 * Schema Zod definiująca strukturę danych produktu
 * Waliduje i typuje wszystkie pola produktu
 */
declare const ProductDataSchema: z.ZodObject<{
    asin: z.ZodString;
    marketplace_id: z.ZodNumber;
    title: z.ZodNullable<z.ZodString>;
    price: z.ZodNullable<z.ZodNumber>;
    currency_code: z.ZodNullable<z.ZodString>;
    rating: z.ZodNullable<z.ZodNumber>;
    reviews_count: z.ZodNullable<z.ZodNumber>;
    bsr: z.ZodNullable<z.ZodNumber>;
    bsr_30_days: z.ZodNullable<z.ZodNumber>;
    product_url: z.ZodNullable<z.ZodString>;
    image_urls: z.ZodArray<z.ZodString, "many">;
    bullet_points: z.ZodArray<z.ZodString, "many">;
    brand_name: z.ZodNullable<z.ZodString>;
    product_type: z.ZodNullable<z.ZodString>;
    publication_date: z.ZodNullable<z.ZodString>;
    scraped_at: z.ZodString;
    data_product_id: z.ZodNullable<z.ZodString>;
    raw_data: z.ZodObject<{
        html_fragment: z.ZodString;
        extracted_values: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        selectors_used: z.ZodRecord<z.ZodString, z.ZodString>;
        extraction_warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        html_fragment: string;
        extracted_values: Record<string, unknown>;
        selectors_used: Record<string, string>;
        extraction_warnings: string[];
    }, {
        html_fragment: string;
        extracted_values: Record<string, unknown>;
        selectors_used: Record<string, string>;
        extraction_warnings: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    asin: string;
    marketplace_id: number;
    title: string | null;
    price: number | null;
    currency_code: string | null;
    rating: number | null;
    reviews_count: number | null;
    bsr: number | null;
    bsr_30_days: number | null;
    product_url: string | null;
    image_urls: string[];
    bullet_points: string[];
    brand_name: string | null;
    product_type: string | null;
    publication_date: string | null;
    scraped_at: string;
    data_product_id: string | null;
    raw_data: {
        html_fragment: string;
        extracted_values: Record<string, unknown>;
        selectors_used: Record<string, string>;
        extraction_warnings: string[];
    };
}, {
    asin: string;
    marketplace_id: number;
    title: string | null;
    price: number | null;
    currency_code: string | null;
    rating: number | null;
    reviews_count: number | null;
    bsr: number | null;
    bsr_30_days: number | null;
    product_url: string | null;
    image_urls: string[];
    bullet_points: string[];
    brand_name: string | null;
    product_type: string | null;
    publication_date: string | null;
    scraped_at: string;
    data_product_id: string | null;
    raw_data: {
        html_fragment: string;
        extracted_values: Record<string, unknown>;
        selectors_used: Record<string, string>;
        extraction_warnings: string[];
    };
}>;
/**
 * Typ ProductData generowany automatycznie na podstawie schematu Zod
 * Zawiera wszystkie pola i ich typy
 */
export type ProductData = z.infer<typeof ProductDataSchema>;
/**
 * Opcje konfiguracyjne parsera
 */
export interface ParserOptions {
    /** ID rynku (1=US, 2=UK, itd.) */
    marketplace_id: number;
    /** Maksymalna liczba produktów do sparsowania */
    max_products?: number;
    /** Czy odrzucać produkty z brakującymi polami */
    strict_mode?: boolean;
    /** Czy zapisywać surowy fragment HTML */
    capture_html?: boolean;
}
/**
 * Główna funkcja parsująca HTML z merchdominator.com
 *
 * @param html - Surowy HTML do sparsowania
 * @param options - Opcje konfiguracyjne parsera
 * @returns Tablica sparsowanych produktów
 */
export declare function parseMerchDominatorHtml(html: string, options: ParserOptions): ProductData[];
export {};
