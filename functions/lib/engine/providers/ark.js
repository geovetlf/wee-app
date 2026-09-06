"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArkConfigured = exports.arkHeaders = exports.arkBase = exports.ARK_KEY = void 0;
const http_1 = require("../http");
/**
 * BytePlus ModelArk: la puerta de ByteDance para Seedance (video) y Seedream (imagen).
 * Clave ARK_API_KEY; región por ARK_BASE_URL (por defecto ap-southeast).
 */
exports.ARK_KEY = 'ARK_API_KEY';
const arkBase = () => (0, http_1.env)('ARK_BASE_URL') || 'https://ark.ap-southeast.bytepluses.com/api/v3';
exports.arkBase = arkBase;
const arkHeaders = (provider) => {
    const apiKey = (0, http_1.env)(exports.ARK_KEY);
    if (!apiKey)
        throw new http_1.NotConfiguredError(provider, exports.ARK_KEY);
    return { Authorization: `Bearer ${apiKey}` };
};
exports.arkHeaders = arkHeaders;
const isArkConfigured = () => !!(0, http_1.env)(exports.ARK_KEY);
exports.isArkConfigured = isArkConfigured;
//# sourceMappingURL=ark.js.map