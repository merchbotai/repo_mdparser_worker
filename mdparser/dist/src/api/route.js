"use strict";
/**
 * MerchDominator Parser - API Route
 * =================================
 *
 * Prosty endpoint Next.js do parsowania HTML
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 3.0.0
 * Licencja: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const supabase_js_1 = require("@supabase/supabase-js");
const mdparser_1 = require("../mdparser");
/**
 * GET - Health check i dokumentacja API
 */
async function GET() {
    return NextResponse.json({
        name: 'MerchDominator Parser API',
        version: '3.0.0',
        endpoints: {
            POST: {
                description: 'Parsuj HTML i zapisz produkty do bazy',
                body: {
                    html: 'string (required)',
                    marketplace_id: 'number (default: 1)',
                    dry_run: 'boolean (default: false)'
                },
                response: {
                    success: 'boolean',
                    products: 'number',
                    saved: 'number',
                    errors: 'array'
                }
            }
        }
    });
}
/**
 * POST - Parsuj HTML i zapisz do bazy
 */
async function POST(req) {
    try {
        const body = await req.json();
        const { html, marketplace_id = 1, dry_run = false } = body;
        // Walidacja
        if (!html || typeof html !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'HTML is required and must be a string'
            }, { status: 400 });
        }
        // Inicjalizacja Supabase tylko jeśli nie dry_run
        const supabase = dry_run ? null : (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '');
        // Parsuj i zapisz
        const result = await (0, mdparser_1.parseAndSave)(html, supabase, {
            marketplace_id,
            dry_run
        });
        return NextResponse.json({
            success: true,
            ...result,
            dry_run
        });
    }
    catch (error) {
        console.error('Parser API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map