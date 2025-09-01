"use strict";
/**
 * MerchDominator Parser - Export główny
 * =====================================
 *
 * Uproszczony parser w jednym pliku
 *
 * Autor: Merch Nexus AI Team
 * Wersja: 3.0.0
 * Licencja: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = exports.parseMerchDominatorHtml = exports.parseAndSave = void 0;
// Export wszystkich funkcji z uproszczonego parsera
var mdparser_1 = require("./mdparser");
Object.defineProperty(exports, "parseAndSave", { enumerable: true, get: function () { return mdparser_1.parseAndSave; } });
Object.defineProperty(exports, "parseMerchDominatorHtml", { enumerable: true, get: function () { return mdparser_1.parseMerchDominatorHtml; } });
// Wersja biblioteki
exports.version = '3.0.0';
//# sourceMappingURL=index.js.map