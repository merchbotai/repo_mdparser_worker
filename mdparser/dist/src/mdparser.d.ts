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
import { z } from 'zod';
declare const ProductSchema: z.ZodObject<{
    asin: z.ZodString;
    marketplace_id: z.ZodDefault<z.ZodNumber>;
    title: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    price: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    currency_code: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    rating: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    reviews_count: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bsr: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    bsr_30_days: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    product_url: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    image_urls: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    bullet_points: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    brand_name: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    product_type: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    publication_date: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    raw_data: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
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
    raw_data: Record<string, any>;
}, {
    asin: string;
    marketplace_id?: number | undefined;
    title?: string | null | undefined;
    price?: number | null | undefined;
    currency_code?: string | null | undefined;
    rating?: number | null | undefined;
    reviews_count?: number | null | undefined;
    bsr?: number | null | undefined;
    bsr_30_days?: number | null | undefined;
    product_url?: string | null | undefined;
    image_urls?: string[] | undefined;
    bullet_points?: string[] | undefined;
    brand_name?: string | null | undefined;
    product_type?: string | null | undefined;
    publication_date?: string | null | undefined;
    raw_data?: Record<string, any> | undefined;
}>;
export type ProductData = z.infer<typeof ProductSchema>;
export declare function parseAndSave(html: string, supabase: any, options?: {
    marketplace_id: number;
    dry_run: boolean;
}): Promise<{
    products: number;
    saved: number;
    errors: Array<{
        index?: number;
        asin?: string;
        error: string;
    }>;
}>;
/**
 * Parsuje HTML i zwraca kompletne produkty (url, title, brand_name, bsr) oraz błędy
 */
export declare function parseHtml(html: string, options?: {
    marketplace_id: number;
}): {
    products: ProductData[];
    errors: Array<{
        index?: number;
        asin?: string;
        error: string;
    }>;
};
export { parseAndSave as parseMerchDominatorHtml };
