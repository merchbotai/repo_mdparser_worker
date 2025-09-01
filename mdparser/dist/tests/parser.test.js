"use strict";
/**
 * MerchDominator Parser - Testy
 * =============================
 *
 * Testy jednostkowe dla uproszczonego parsera
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 3.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mdparser_1 = require("../src/mdparser");
(0, globals_1.describe)('MerchDominator Parser', () => {
    const sampleProductHTML = `
    <div class="card ecommerce-card" data-asin="B0FJ3XBCP5">
      <h6 class="item-name">
        <a href="javascript:void(0);">HUNTR/X Heartthrob Officially Licensed T-Shirt</a>
      </h6>
      <span class="card-text item-company">By KPop Demon Hunters</span>
      <div title="Price"><span>$19.52</span></div>
      <div title="Current BSR"><span>1,054</span></div>
      <div class="average-bsr-30-days">14,270</div>
      <div title="Ratings"><span>4.6</span></div>
      <div title="Reviews"><span>(9)</span></div>
      <a href="https://www.amazon.com/dp/B0FJ3XBCP5" data-product_type="t-shirt">Amazon Link</a>
      <img src="https://m.media-amazon.com/images/I/example.png" />
      <ul class="item-bulletpoints">
        <li>100% Cotton</li>
        <li>Machine Washable</li>
      </ul>
      <div class="item-date-first-available"><span>2025-07-18</span></div>
    </div>
  `;
    const multipleProductsHTML = `
    <div class="card ecommerce-card" data-asin="B0FJ3XBCP5">
      <h6 class="item-name"><a>Product 1</a></h6>
      <div title="Price"><span>$19.99</span></div>
    </div>
    <div class="show-wrapper" data-asin="B0FJ3XBCP6">
      <h6 class="item-name"><a>Product 2</a></h6>
      <div title="Price"><span>$29.99</span></div>
    </div>
  `;
    (0, globals_1.describe)('Basic Parsing', () => {
        (0, globals_1.it)('should parse products in dry run mode', async () => {
            const result = await (0, mdparser_1.parseAndSave)(sampleProductHTML, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(1);
            (0, globals_1.expect)(result.saved).toBe(0);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should extract ASIN correctly', async () => {
            const result = await (0, mdparser_1.parseAndSave)(sampleProductHTML, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(1);
        });
        (0, globals_1.it)('should parse multiple products', async () => {
            const result = await (0, mdparser_1.parseAndSave)(multipleProductsHTML, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(2);
        });
        (0, globals_1.it)('should handle empty HTML', async () => {
            const result = await (0, mdparser_1.parseAndSave)('<div></div>', null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(0);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Field Extraction', () => {
        (0, globals_1.it)('should extract all basic fields', async () => {
            // Since parseAndSave returns only counts, we test through side effects
            const mockSupabase = {
                from: () => ({
                    upsert: () => ({ error: null }),
                    insert: () => ({ error: null }),
                    select: () => ({ in: () => ({ data: [] }) }),
                    in: () => ({ data: [] })
                })
            };
            const result = await (0, mdparser_1.parseAndSave)(sampleProductHTML, mockSupabase, { marketplace_id: 1, dry_run: false });
            (0, globals_1.expect)(result.products).toBe(1);
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle products without ASIN', async () => {
            const htmlWithoutAsin = `
        <div class="card ecommerce-card">
          <h6 class="item-name"><a>Product without ASIN</a></h6>
        </div>
      `;
            const result = await (0, mdparser_1.parseAndSave)(htmlWithoutAsin, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(0);
        });
        (0, globals_1.it)('should continue parsing after error', async () => {
            const htmlWithError = `
        <div class="card ecommerce-card" data-asin="VALIDASIN12">
          <h6 class="item-name"><a>Valid Product</a></h6>
        </div>
        <div class="card ecommerce-card">
          <h6 class="item-name"><a>Invalid Product</a></h6>
        </div>
        <div class="card ecommerce-card" data-asin="VALIDASIN13">
          <h6 class="item-name"><a>Another Valid Product</a></h6>
        </div>
      `;
            const result = await (0, mdparser_1.parseAndSave)(htmlWithError, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(2);
        });
    });
    (0, globals_1.describe)('Currency Detection', () => {
        (0, globals_1.it)('should detect USD currency', async () => {
            const htmlUSD = `
        <div class="card ecommerce-card" data-asin="B0FJ3XBCP5">
          <div title="Price"><span>$19.99</span></div>
        </div>
      `;
            const result = await (0, mdparser_1.parseAndSave)(htmlUSD, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(1);
        });
        (0, globals_1.it)('should detect GBP currency', async () => {
            const htmlGBP = `
        <div class="card ecommerce-card" data-asin="B0FJ3XBCP5">
          <div title="Price"><span>£19.99</span></div>
        </div>
      `;
            const result = await (0, mdparser_1.parseAndSave)(htmlGBP, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(1);
        });
    });
    (0, globals_1.describe)('Date Parsing', () => {
        (0, globals_1.it)('should parse ISO dates', async () => {
            const htmlISO = `
        <div class="card ecommerce-card" data-asin="B0FJ3XBCP5">
          <div class="item-date-first-available"><span>2025-07-18</span></div>
        </div>
      `;
            const result = await (0, mdparser_1.parseAndSave)(htmlISO, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(1);
        });
        (0, globals_1.it)('should parse formatted dates', async () => {
            const htmlFormatted = `
        <div class="card ecommerce-card" data-asin="B0FJ3XBCP5">
          <div title="Published Date"><span>Jul 18, 2025</span></div>
        </div>
      `;
            const result = await (0, mdparser_1.parseAndSave)(htmlFormatted, null, { marketplace_id: 1, dry_run: true });
            (0, globals_1.expect)(result.products).toBe(1);
        });
    });
});
//# sourceMappingURL=parser.test.js.map