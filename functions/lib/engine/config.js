"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateConfig = exports.defaultConfig = void 0;
exports.loadConfig = loadConfig;
const firestore_1 = require("firebase-admin/firestore");
const registry_1 = require("./registry");
const CACHE_MS = 60000;
let cache = null;
const db = () => (0, firestore_1.getFirestore)();
const defaultConfig = () => ({
    providers: Object.assign({}, registry_1.DEFAULT_PROVIDERS),
    routing: Object.assign({}, registry_1.DEFAULT_ROUTING),
    settings: Object.assign({}, registry_1.DEFAULT_SETTINGS),
    source: 'defaults',
});
exports.defaultConfig = defaultConfig;
async function loadConfig(force = false) {
    if (!force && cache && Date.now() - cache.at < CACHE_MS)
        return cache.config;
    const config = (0, exports.defaultConfig)();
    try {
        const [providers, routing, settings] = await Promise.all([
            db().collection('aiProviders').get(),
            db().collection('aiRouting').get(),
            db().collection('aiSettings').doc('global').get(),
        ]);
        providers.forEach((doc) => {
            const data = doc.data();
            const base = config.providers[doc.id] || { enabled: true, priority: 50 };
            config.providers[doc.id] = Object.assign(Object.assign(Object.assign({}, base), data), { models: Object.assign(Object.assign({}, (base.models || {})), (data.models || {})) });
        });
        routing.forEach((doc) => {
            const data = doc.data();
            const capability = doc.id;
            const base = config.routing[capability];
            if (Array.isArray(data.chain)) {
                config.routing[capability] = { capability, chain: data.chain, policy: data.policy || (base === null || base === void 0 ? void 0 : base.policy) || config.settings.defaultPolicy };
            }
            else if (data.policy && base) {
                config.routing[capability] = Object.assign(Object.assign({}, base), { policy: data.policy });
            }
        });
        if (settings.exists) {
            const data = settings.data();
            config.settings = Object.assign(Object.assign(Object.assign({}, config.settings), data), { timeoutsMs: Object.assign(Object.assign({}, config.settings.timeoutsMs), (data.timeoutsMs || {})), circuitBreaker: Object.assign(Object.assign({}, config.settings.circuitBreaker), (data.circuitBreaker || {})) });
        }
        config.source = 'firestore';
    }
    catch (error) {
        console.warn('WEË AI ENGINE: no se pudo leer la configuración, se usan los valores por defecto:', error);
    }
    cache = { at: Date.now(), config };
    return config;
}
const invalidateConfig = () => {
    cache = null;
};
exports.invalidateConfig = invalidateConfig;
//# sourceMappingURL=config.js.map