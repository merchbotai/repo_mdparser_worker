/**
 * MerchDominator Database Saver
 * =============================
 *
 * Moduł odpowiedzialny za zapis sparsowanych produktów do bazy danych Supabase.
 * Zawiera funkcje do zapisywania produktów, historii cen, BSR i recenzji.
 * Oferuje zaawansowane funkcje jak batch processing i inteligentna deduplikacja.
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 2.0.0
 * Licencja: MIT
 */
import { ProductData } from './parser';
/**
 * Typ dla SupabaseClient - uproszczona wersja
 * Możesz zastąpić ten typ importując oficjalny z '@supabase/supabase-js'
 */
interface SupabaseClient {
    from(table: string): {
        select(columns?: string): any;
        insert(data: any): any;
        update(data: any): any;
        upsert(data: any, options?: any): any;
        eq(column: string, value: any): any;
        single(): any;
        order(column: string, options?: any): any;
        limit(limit: number): any;
    };
}
/**
 * Wynik operacji zapisu do bazy danych
 */
export interface SaveResult {
    /** Liczba nowo zapisanych produktów */
    saved: number;
    /** Liczba produktów z błędami */
    failed: number;
    /** Liczba zaktualizowanych istniejących produktów */
    updated: number;
    /** Liczba pominiętych produktów */
    skipped: number;
    /** Szczegóły błędów */
    errors: Array<{
        asin: string;
        reason: string;
        error?: unknown;
    }>;
    /** Metryki wydajności */
    performance: {
        totalTime: number;
        avgTimePerProduct: number;
        batchSize: number;
    };
}
/**
 * Opcje dla operacji zapisu do bazy danych
 */
export interface SaveOptions {
    /** Ile produktów przetwarzać w jednej partii */
    batchSize?: number;
    /** Czy pomijać duplikaty w historii */
    skipHistoryDuplicates?: boolean;
    /** Czy aktualizować istniejące produkty */
    updateExisting?: boolean;
    /** Limit równoległych operacji */
    concurrencyLimit?: number;
    /** Tryb testowy - bez faktycznego zapisu */
    dryRun?: boolean;
}
/**
 * Główna funkcja zapisująca produkty do bazy danych
 * Obsługuje batch processing, aktualizacje i deduplikację
 *
 * @param products - Tablica produktów do zapisania
 * @param supabase - Klient Supabase
 * @param options - Opcje konfiguracyjne
 * @returns Wynik operacji zapisu
 */
export declare function saveProductsToDatabase(products: ProductData[], supabase: SupabaseClient, options?: SaveOptions): Promise<SaveResult>;
/**
 * Analizuje wyniki zapisów i generuje statystyki
 * Przydatne do monitorowania i optymalizacji procesu
 *
 * @param results - Tablica wyników zapisów
 */
export declare function analyzeResults(results: SaveResult[]): void;
export {};
