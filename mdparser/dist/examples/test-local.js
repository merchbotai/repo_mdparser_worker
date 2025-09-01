"use strict";
/**
 * MerchDominator Parser - Test lokalny
 * ====================================
 *
 * Skrypt do testowania parsera lokalnie z pliku HTML
 *
 * Użycie:
 * npm run parse -- --html ../Best\ Sellers.html --marketplace 1
 * npm run parse -- --html ../Best\ Sellers.html --dry-run
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 3.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const mdparser_1 = require("../src/mdparser");
const supabase_js_1 = require("@supabase/supabase-js");
// Parsuj argumenty CLI
const args = process.argv.slice(2);
const htmlFile = args.find((_, i) => args[i - 1] === '--html') || '../Best Sellers.html';
const marketplaceId = parseInt(args.find((_, i) => args[i - 1] === '--marketplace') || '1');
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const outPath = args.find((_, i) => args[i - 1] === '--out');
// Konfiguracja
const CONFIG = {
    htmlFile,
    marketplaceId,
    dryRun,
    verbose
};
// Inicjalizacja Supabase
function initSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.log('⚠️  Brak konfiguracji Supabase - dostępny tylko tryb dry-run');
        return null;
    }
    return (0, supabase_js_1.createClient)(url, key);
}
// Główna funkcja
async function main() {
    console.log('=== MerchDominator Parser - Test Lokalny ===\n');
    // Wyświetl konfigurację
    console.log('Konfiguracja:');
    console.log(`  HTML: ${CONFIG.htmlFile}`);
    console.log(`  Marketplace ID: ${CONFIG.marketplaceId}`);
    console.log(`  Tryb: ${CONFIG.dryRun ? 'DRY RUN' : 'ZAPIS DO BAZY'}`);
    if (outPath)
        console.log(`  Wyjście: ${outPath}`);
    console.log('');
    try {
        // Wczytaj HTML
        console.log('[1/3] Wczytywanie pliku HTML...');
        const html = (0, fs_1.readFileSync)(CONFIG.htmlFile, 'utf-8');
        console.log(`  ✓ Wczytano ${(html.length / 1024).toFixed(1)} KB\n`);
        // Parsuj
        console.log('[2/3] Parsowanie produktów...');
        const startTime = Date.now();
        let productCount = 0;
        let durationMs = 0;
        let savedCount = 0;
        if (outPath) {
            // Tylko parsowanie i zapis do pliku JSONL
            const { products } = (0, mdparser_1.parseHtml)(html, { marketplace_id: CONFIG.marketplaceId });
            durationMs = Date.now() - startTime;
            productCount = products.length;
            console.log(`  ✓ Znaleziono ${productCount} produktów w ${durationMs}ms`);
            // JSONL zapis
            try {
                (0, fs_1.writeFileSync)(outPath, '');
            }
            catch { }
            for (const p of products) {
                (0, fs_1.appendFileSync)(outPath, JSON.stringify(p) + '\n');
            }
            console.log(`  ✓ Zapisano do pliku: ${outPath}`);
        }
        else {
            const supabase = CONFIG.dryRun ? null : initSupabase();
            const result = await (0, mdparser_1.parseAndSave)(html, supabase, {
                marketplace_id: CONFIG.marketplaceId,
                dry_run: CONFIG.dryRun
            });
            durationMs = Date.now() - startTime;
            productCount = result.products;
            savedCount = result.saved;
            console.log(`  ✓ Znaleziono ${productCount} produktów w ${durationMs}ms`);
            if (savedCount > 0)
                console.log(`  ✓ Zapisano ${savedCount} produktów do bazy`);
            if (result.errors.length > 0) {
                console.log(`  ⚠ Błędy: ${result.errors.length}`);
                if (CONFIG.verbose)
                    result.errors.forEach(err => console.log(`    - ${err.error}`));
            }
        }
        // Statystyki
        console.log('[3/3] Statystyki:');
        if (productCount > 0) {
            console.log(`  • Produkty/sekundę: ${(productCount / (durationMs / 1000)).toFixed(1)}`);
            console.log(`  • Średni czas/produkt: ${(durationMs / productCount).toFixed(1)}ms`);
        }
        else {
            console.log('  • Produkty/sekundę: 0.0');
            console.log('  • Średni czas/produkt: N/A');
        }
        if (!CONFIG.dryRun && !outPath) {
            console.log(`  • Skuteczność zapisu: ${((savedCount / Math.max(productCount, 1)) * 100).toFixed(1)}%`);
        }
    }
    catch (error) {
        console.error('\n❌ Błąd:', error);
        process.exit(1);
    }
    console.log('\n✅ Zakończono pomyślnie!');
}
// Uruchom
main().catch(console.error);
//# sourceMappingURL=test-local.js.map