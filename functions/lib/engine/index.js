"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.limiter = exports.assertText = exports.classifyError = exports.toEngineHttpsError = exports.EngineError = exports.friendlyFailure = exports.progressTextFor = exports.engine = void 0;
const firestore_1 = require("firebase-admin/firestore");
const registry_1 = require("./registry");
const config_1 = require("./config");
const ledger_1 = require("./ledger");
const router_1 = require("./router");
const limits_1 = require("./limits");
/**
 * WEË AI ENGINE — punto de entrada (docs/AI-ENGINE.md).
 *
 *   Weë → WEË AI ENGINE → AI ROUTER → proveedor especializado
 *
 * engine.generate(): ejecuta una capacidad eligiendo el mejor proveedor
 * disponible con fallback automático y registro en aiGenerations.
 * engine.route(): solo decide (para estimar Credits antes de crear).
 * engine.status(): estado de proveedores, cadenas y salud (administración).
 */
const health = (0, router_1.memoryHealth)();
let usageCache = null;
const usageToday = async () => {
    const day = (0, limits_1.dayKey)();
    if (usageCache && usageCache.day === day && Date.now() - usageCache.at < 60000)
        return usageCache.data;
    const snap = await (0, firestore_1.getFirestore)().collection('aiUsage').doc(day).get();
    usageCache = { day, at: Date.now(), data: snap.data() };
    return usageCache.data;
};
const router = (0, router_1.createRouter)({ adapters: registry_1.ADAPTERS, loadConfig: config_1.loadConfig, ledger: ledger_1.firestoreLedger, health, usageToday });
exports.engine = {
    generate: (request) => router.execute(request),
    route: (request) => router.route(request),
    health,
    async status() {
        const config = await (0, config_1.loadConfig)(true);
        const snapshot = health.snapshot();
        const providers = Object.values(registry_1.ADAPTERS).map((adapter) => {
            const conf = config.providers[adapter.id] || { enabled: true, priority: 50 };
            return {
                id: adapter.id,
                name: adapter.name,
                modalities: adapter.modalities,
                configured: adapter.isConfigured(),
                enabled: conf.enabled,
                priority: conf.priority,
                note: conf.note,
                health: snapshot[adapter.id] || null,
                models: adapter.models.map((m) => ({
                    id: m.id,
                    capabilities: m.capabilities,
                    quality: m.quality,
                    speed: m.speed,
                    cost: `$${m.cost.usd}/${m.cost.unit}${m.cost.usdOutput ? ` (+$${m.cost.usdOutput} salida)` : ''}`,
                    maxDurationSec: m.maxDurationSec,
                    verified: !!m.verified,
                })),
            };
        });
        return {
            source: config.source,
            settings: config.settings,
            providers,
            routing: Object.values(config.routing).map((r) => ({ capability: r.capability, policy: r.policy, chain: r.chain })),
        };
    },
};
__exportStar(require("./types"), exports);
var humanize_1 = require("./humanize");
Object.defineProperty(exports, "progressTextFor", { enumerable: true, get: function () { return humanize_1.progressTextFor; } });
Object.defineProperty(exports, "friendlyFailure", { enumerable: true, get: function () { return humanize_1.friendlyFailure; } });
var errors_1 = require("./errors");
Object.defineProperty(exports, "EngineError", { enumerable: true, get: function () { return errors_1.EngineError; } });
Object.defineProperty(exports, "toEngineHttpsError", { enumerable: true, get: function () { return errors_1.toEngineHttpsError; } });
Object.defineProperty(exports, "classifyError", { enumerable: true, get: function () { return errors_1.classifyError; } });
Object.defineProperty(exports, "assertText", { enumerable: true, get: function () { return errors_1.assertText; } });
var limits_2 = require("./limits");
Object.defineProperty(exports, "limiter", { enumerable: true, get: function () { return limits_2.limiter; } });
//# sourceMappingURL=index.js.map