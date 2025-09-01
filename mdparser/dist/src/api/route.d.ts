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
import type { NextRequest } from 'next/server';
/**
 * GET - Health check i dokumentacja API
 */
export declare function GET(): Promise<any>;
/**
 * POST - Parsuj HTML i zapisz do bazy
 */
export declare function POST(req: NextRequest): Promise<any>;
