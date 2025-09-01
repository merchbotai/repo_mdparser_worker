"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveProductsToDatabase = saveProductsToDatabase;
exports.analyzeResults = analyzeResults;
/**
 * Prosty fallback dla p-limit jeśli nie jest zainstalowany
 * Implementuje limit współbieżności dla operacji asynchronicznych
 *
 * @param limit - Maksymalna liczba równoczesnych operacji
 */
const pLimit = (limit) => {
    const queue = [];
    let activeCount = 0;
    const run = async () => {
        activeCount++;
        const fn = queue.shift();
        if (fn) {
            await fn();
        }
        activeCount--;
        if (queue.length > 0) {
            run();
        }
    };
    return (fn) => {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                try {
                    const result = await fn();
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            };
            if (activeCount < limit) {
                run();
                execute();
            }
            else {
                queue.push(execute);
            }
        });
    };
};
/**
 * Cache dla słowników w celu uniknięcia redundantnych zapytań
 */
class DictionaryCache {
    constructor() {
        this.brands = new Map();
        this.productTypes = new Map();
    }
    /**
     * Pobiera lub tworzy ID marki na podstawie nazwy
     * Używa cache dla zoptymalizowania zapytań do bazy
     *
     * @param supabase - Klient Supabase
     * @param name - Nazwa marki
     * @returns ID marki lub null w przypadku błędu
     */
    async getBrandId(supabase, name) {
        // Sprawdź cache
        if (this.brands.has(name)) {
            return this.brands.get(name);
        }
        // Sprawdź w bazie
        const { data: existing } = await supabase
            .from('brands')
            .select('id')
            .eq('name', name)
            .single();
        if (existing) {
            this.brands.set(name, existing.id);
            return existing.id;
        }
        // Stwórz nowy
        const { data: created, error } = await supabase
            .from('brands')
            .insert({
            name,
            normalized_name: name.toLowerCase().trim()
        })
            .select('id')
            .single();
        if (error || !created) {
            console.error(`Błąd tworzenia marki ${name}:`, error);
            return null;
        }
        this.brands.set(name, created.id);
        return created.id;
    }
    /**
     * Pobiera lub tworzy ID typu produktu na podstawie nazwy
     * Używa cache dla zoptymalizowania zapytań do bazy
     *
     * @param supabase - Klient Supabase
     * @param name - Nazwa typu produktu
     * @returns ID typu produktu lub null w przypadku błędu
     */
    async getProductTypeId(supabase, name) {
        if (this.productTypes.has(name)) {
            return this.productTypes.get(name);
        }
        const { data: existing } = await supabase
            .from('product_types')
            .select('id')
            .eq('name', name)
            .single();
        if (existing) {
            this.productTypes.set(name, existing.id);
            return existing.id;
        }
        const { data: created, error } = await supabase
            .from('product_types')
            .insert({ name })
            .select('id')
            .single();
        if (error || !created) {
            console.error(`Błąd tworzenia typu produktu ${name}:`, error);
            return null;
        }
        this.productTypes.set(name, created.id);
        return created.id;
    }
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
async function saveProductsToDatabase(products, supabase, options = {}) {
    const { batchSize = 10, skipHistoryDuplicates = true, updateExisting = true, concurrencyLimit = 5, dryRun = false } = options;
    const startTime = Date.now();
    const cache = new DictionaryCache();
    const limit = pLimit(concurrencyLimit);
    let saved = 0;
    let failed = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];
    console.log(`[Saver] Rozpoczynam zapis ${products.length} produktów (batch: ${batchSize}, concurrent: ${concurrencyLimit})`);
    // Przetwarzaj produkty w partiach dla lepszej wydajności
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        console.log(`[Saver] Przetwarzam partię ${i / batchSize + 1}/${Math.ceil(products.length / batchSize)}`);
        // Równoległe przetwarzanie w ramach partii
        const batchPromises = batch.map(product => limit(async () => {
            try {
                // Dry run - tylko logowanie
                if (dryRun) {
                    console.log(`[DryRun] Zapisałbym produkt ${product.asin}`);
                    saved++;
                    return;
                }
                // 1. Rozwiąż słowniki (marki, typy produktów)
                const brand_id = product.brand_name
                    ? await cache.getBrandId(supabase, product.brand_name)
                    : null;
                const product_type_id = product.product_type
                    ? await cache.getProductTypeId(supabase, product.product_type)
                    : null;
                // 2. Sprawdź czy produkt już istnieje w bazie
                const { data: existing } = await supabase
                    .from('products')
                    .select('id, bsr, price, rating, reviews_count, updated_at')
                    .eq('asin', product.asin)
                    .eq('marketplace_id', product.marketplace_id)
                    .single();
                // 3. Przygotuj dane do zapisu
                const productRecord = {
                    asin: product.asin,
                    marketplace_id: product.marketplace_id,
                    title: product.title,
                    price: product.price,
                    currency_code: product.currency_code,
                    rating: product.rating,
                    reviews_count: product.reviews_count,
                    bsr: product.bsr,
                    product_url: product.product_url,
                    images: product.image_urls,
                    bullet_points: product.bullet_points,
                    brand_id,
                    product_type_id,
                    published_at: product.publication_date,
                    raw_data: product.raw_data,
                    updated_at: new Date().toISOString()
                };
                // 4. Zapisz lub zaktualizuj produkt
                if (existing) {
                    if (!updateExisting) {
                        skipped++;
                        return;
                    }
                    // Aktualizuj tylko jeśli coś się zmieniło
                    const hasChanges = existing.bsr !== product.bsr ||
                        existing.price !== product.price ||
                        existing.rating !== product.rating ||
                        existing.reviews_count !== product.reviews_count;
                    if (hasChanges) {
                        const { error } = await supabase
                            .from('products')
                            .update(productRecord)
                            .eq('id', existing.id);
                        if (error)
                            throw error;
                        updated++;
                    }
                    else {
                        skipped++;
                    }
                }
                else {
                    // Nowy produkt
                    const { error } = await supabase
                        .from('products')
                        .insert(productRecord);
                    if (error)
                        throw error;
                    saved++;
                }
                // 5. Zapisz historię (z inteligentną deduplikacją)
                await saveProductHistory(supabase, product, existing, skipHistoryDuplicates);
            }
            catch (error) {
                failed++;
                errors.push({
                    asin: product.asin,
                    reason: error instanceof Error ? error.message : 'Nieznany błąd',
                    error
                });
            }
        }));
        // Czekaj na zakończenie wszystkich zapisów w partii
        await Promise.all(batchPromises);
    }
    const totalTime = Date.now() - startTime;
    const result = {
        saved,
        failed,
        updated,
        skipped,
        errors,
        performance: {
            totalTime,
            avgTimePerProduct: totalTime / products.length,
            batchSize
        }
    };
    // Logowanie podsumowania
    console.log('[Saver] Zakończono zapis:');
    console.log(`  - Zapisano nowych: ${saved}`);
    console.log(`  - Zaktualizowano: ${updated}`);
    console.log(`  - Pominięto: ${skipped}`);
    console.log(`  - Błędy: ${failed}`);
    console.log(`  - Czas: ${(totalTime / 1000).toFixed(2)}s (${result.performance.avgTimePerProduct.toFixed(0)}ms/produkt)`);
    return result;
}
/**
 * Zapisuje historyczne dane produktu (BSR, cena, oceny)
 * z inteligentnym pomijaniem duplikatów
 *
 * @param supabase - Klient Supabase
 * @param product - Produkt do zapisania
 * @param existing - Istniejący rekord produktu (jeśli istnieje)
 * @param skipDuplicates - Czy pomijać duplikaty
 */
async function saveProductHistory(supabase, product, existing, skipDuplicates) {
    const today = new Date().toISOString().slice(0, 10);
    // BSR History
    if (product.bsr !== null) {
        if (!skipDuplicates || !existing || existing.bsr !== product.bsr) {
            // Sprawdź ostatni wpis
            const { data: lastBsr } = await supabase
                .from('bsr_history')
                .select('bsr, date')
                .eq('asin', product.asin)
                .eq('date', today)
                .single();
            if (!lastBsr || lastBsr.bsr !== product.bsr) {
                await supabase
                    .from('bsr_history')
                    .upsert({
                    asin: product.asin,
                    date: today,
                    bsr: product.bsr
                }, {
                    onConflict: 'asin,date'
                });
            }
        }
    }
    // Price History
    if (product.price !== null) {
        if (!skipDuplicates || !existing || existing.price !== product.price) {
            const { data: lastPrice } = await supabase
                .from('price_history')
                .select('price, date')
                .eq('asin', product.asin)
                .eq('date', today)
                .single();
            if (!lastPrice || lastPrice.price !== product.price) {
                await supabase
                    .from('price_history')
                    .upsert({
                    asin: product.asin,
                    date: today,
                    price: product.price
                }, {
                    onConflict: 'asin,date'
                });
            }
        }
    }
    // Review History
    if (product.rating !== null || product.reviews_count !== null) {
        const hasRatingChange = !existing || existing.rating !== product.rating;
        const hasReviewChange = !existing || existing.reviews_count !== product.reviews_count;
        if (!skipDuplicates || hasRatingChange || hasReviewChange) {
            const { data: lastReview } = await supabase
                .from('review_history')
                .select('rating, reviews_count, date')
                .eq('asin', product.asin)
                .eq('date', today)
                .single();
            const shouldInsert = !lastReview ||
                lastReview.rating !== product.rating ||
                lastReview.reviews_count !== product.reviews_count;
            if (shouldInsert) {
                await supabase
                    .from('review_history')
                    .upsert({
                    asin: product.asin,
                    date: today,
                    rating: product.rating,
                    reviews_count: product.reviews_count
                }, {
                    onConflict: 'asin,date'
                });
            }
        }
    }
}
/**
 * Analizuje wyniki zapisów i generuje statystyki
 * Przydatne do monitorowania i optymalizacji procesu
 *
 * @param results - Tablica wyników zapisów
 */
function analyzeResults(results) {
    const totalProducts = results.reduce((sum, r) => sum + r.saved + r.updated + r.skipped + r.failed, 0);
    const totalTime = results.reduce((sum, r) => sum + r.performance.totalTime, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    console.log('\n=== PODSUMOWANIE ANALIZY ===');
    console.log(`Przetworzone produkty: ${totalProducts}`);
    console.log(`Całkowity czas: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Średni czas/produkt: ${(totalTime / totalProducts).toFixed(0)}ms`);
    console.log(`Błędy: ${totalErrors} (${((totalErrors / totalProducts) * 100).toFixed(1)}%)`);
    // Top 5 błędów
    const errorTypes = new Map();
    results.forEach(r => {
        r.errors.forEach(e => {
            const key = e.reason.split(':')[0];
            errorTypes.set(key, (errorTypes.get(key) || 0) + 1);
        });
    });
    console.log('\nNajczęstsze błędy:');
    Array.from(errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
    });
}
//# sourceMappingURL=database.js.map