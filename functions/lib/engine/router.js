"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryHealth = void 0;
exports.resolveQuality = resolveQuality;
exports.pickModel = pickModel;
exports.createRouter = createRouter;
const pricing_1 = require("./pricing");
const http_1 = require("./http");
const types_1 = require("./types");
const memoryHealth = (now = () => Date.now()) => {
    const state = {};
    const entry = (provider) => (state[provider] = state[provider] || { failures: [] });
    return {
        isOpen: (provider) => {
            const e = state[provider];
            return !!(e === null || e === void 0 ? void 0 : e.openUntil) && e.openUntil > now();
        },
        failure: (provider, settings) => {
            const e = entry(provider);
            const t = now();
            e.failures = e.failures.filter((at) => t - at < settings.circuitBreaker.windowMs);
            e.failures.push(t);
            if (e.failures.length >= settings.circuitBreaker.failures) {
                e.openUntil = t + settings.circuitBreaker.openMs;
                e.failures = [];
                console.warn(`WEË AI ENGINE: ${provider} en pausa ${Math.round(settings.circuitBreaker.openMs / 1000)} s por fallos repetidos`);
            }
        },
        success: (provider) => {
            const e = entry(provider);
            e.failures = [];
            e.openUntil = undefined;
        },
        reset: (provider) => {
            if (provider)
                delete state[provider];
            else
                for (const key of Object.keys(state))
                    delete state[key];
        },
        snapshot: () => Object.fromEntries(Object.entries(state).map(([k, v]) => [k, { failures: v.failures.length, openUntil: v.openUntil }])),
    };
};
exports.memoryHealth = memoryHealth;
// ── Calidad exigida por la tarea ────────────────────────────────────────────
const DEFAULT_QUALITY = { text: 'standard', vision: 'standard', doc: 'standard', image: 'high', video: 'high', voice: 'high', music: 'high' };
const MAX_HINT = /cinematogr|premium|m[aá]xima calidad|4k|profesional|ultra|obra maestra|hiperrealista/i;
const LIGHT_HINT = /r[aá]pido|borrador|boceto|de prueba|simple|sencillo|barato|econ[oó]mico/i;
function resolveQuality(request) {
    var _a, _b, _c, _e, _f, _g;
    const wanted = (_a = request.prefs) === null || _a === void 0 ? void 0 : _a.quality;
    if (wanted && wanted !== 'auto')
        return wanted;
    const explicit = String((_b = request.input.quality) !== null && _b !== void 0 ? _b : '');
    if (explicit === 'max' || explicit === 'high' || explicit === 'standard')
        return explicit;
    const text = `${(_c = request.input.prompt) !== null && _c !== void 0 ? _c : ''} ${(_e = request.input.brief) !== null && _e !== void 0 ? _e : ''} ${(_f = request.goal) !== null && _f !== void 0 ? _f : ''} ${(_g = request.input.style) !== null && _g !== void 0 ? _g : ''}`;
    const modality = (0, types_1.modalityOf)(request.capability);
    if ((modality === 'video' || modality === 'image') && MAX_HINT.test(text))
        return 'max';
    if (LIGHT_HINT.test(text))
        return 'standard';
    return DEFAULT_QUALITY[modality] || 'standard';
}
// ── Elección de modelo dentro de un proveedor ──────────────────────────────
const applyOverrides = (model, config) => {
    var _a;
    const override = (_a = config === null || config === void 0 ? void 0 : config.models) === null || _a === void 0 ? void 0 : _a[model.id];
    return Object.assign(Object.assign(Object.assign({}, model), (override || {})), { cost: (override === null || override === void 0 ? void 0 : override.cost) || model.cost, enabled: (override === null || override === void 0 ? void 0 : override.enabled) !== false });
};
function pickModel(adapter, capability, quality, policy, config, modelId) {
    const models = adapter.models.filter((m) => m.capabilities.includes(capability)).map((m) => applyOverrides(m, config)).filter((m) => m.enabled);
    if (modelId)
        return models.find((m) => m.id === modelId) || null;
    if (!models.length)
        return null;
    const meeting = models.filter((m) => m.quality >= types_1.QUALITY_MIN_SCORE[quality]);
    const pool = meeting.length ? meeting : models;
    const sorted = [...pool].sort((a, b) => policy === 'quality-first' ? b.quality - a.quality || a.cost.usd - b.cost.usd : a.cost.usd - b.cost.usd || b.quality - a.quality);
    return sorted[0];
}
const withTimeout = (promise, ms, provider) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new http_1.ProviderError(`${provider}: tardó más de ${Math.round(ms / 1000)} s`, provider)), ms);
    promise.then((value) => {
        clearTimeout(timer);
        resolve(value);
    }, (error) => {
        clearTimeout(timer);
        reject(error);
    });
});
function createRouter(deps) {
    const now = deps.now || (() => Date.now());
    const linksFor = (capability, config) => {
        const routing = config.routing[capability];
        if (routing && routing.chain.length)
            return { links: routing.chain, policy: routing.policy || config.settings.defaultPolicy };
        // Sin cadena configurada: todos los proveedores reales que atienden la capacidad, por prioridad
        const links = Object.values(deps.adapters)
            .filter((a) => a.id !== 'mock' && a.supports(capability))
            .sort((a, b) => { var _a, _b, _c, _e; return ((_b = (_a = config.providers[a.id]) === null || _a === void 0 ? void 0 : _a.priority) !== null && _b !== void 0 ? _b : 50) - ((_e = (_c = config.providers[b.id]) === null || _c === void 0 ? void 0 : _c.priority) !== null && _e !== void 0 ? _e : 50); })
            .map((a) => ({ provider: a.id }));
        return { links, policy: (routing === null || routing === void 0 ? void 0 : routing.policy) || config.settings.defaultPolicy };
    };
    const route = async (request, preloaded) => {
        const config = preloaded || (await deps.loadConfig());
        const { settings } = config;
        const { capability, input } = request;
        const prefs = request.prefs || {};
        const quality = resolveQuality(request);
        const { links, policy } = linksFor(capability, config);
        const excluded = new Set(prefs.excludeProviders || []);
        const candidates = [];
        const skipped = [];
        links.forEach((link, index) => {
            const skip = (reason) => {
                skipped.push({ provider: link.provider, model: link.model, reason });
            };
            const adapter = deps.adapters[link.provider];
            if (!adapter)
                return skip('no existe');
            const providerConfig = config.providers[link.provider] || { enabled: true, priority: 50 };
            if (!providerConfig.enabled)
                return skip('desactivado por administración');
            if (excluded.has(link.provider))
                return skip('excluido en esta petición');
            if (!adapter.isConfigured())
                return skip('sin clave configurada');
            if (!adapter.supports(capability))
                return skip('no atiende esta capacidad');
            if (deps.health.isOpen(link.provider))
                return skip('en pausa por fallos recientes');
            if (link.minQuality && types_1.QUALITY_RANK[quality] < types_1.QUALITY_RANK[link.minQuality])
                return skip('reservado para tareas de más calidad');
            if (link.maxQuality && types_1.QUALITY_RANK[quality] > types_1.QUALITY_RANK[link.maxQuality])
                return skip('no alcanza la calidad que pide la tarea');
            const model = pickModel(adapter, capability, quality, policy, providerConfig, link.model);
            if (!model)
                return skip('sin modelo disponible para esta capacidad');
            const estimatedUsd = (0, pricing_1.estimateUsd)(model, capability, input, prefs);
            const estimatedCredits = (0, pricing_1.creditsFor)(capability, estimatedUsd, settings, adapter.id === 'mock');
            if (prefs.maxCredits !== undefined && estimatedCredits > prefs.maxCredits)
                return skip(`supera el tope de ${prefs.maxCredits} Credits`);
            const durationOk = !(prefs.durationSec && model.maxDurationSec && model.maxDurationSec < prefs.durationSec);
            const meetsQuality = model.quality >= types_1.QUALITY_MIN_SCORE[quality];
            candidates.push({
                provider: link.provider,
                model,
                priority: index,
                estimatedUsd,
                estimatedCredits,
                durationOk,
                meetsQuality,
                reason: [meetsQuality ? `calidad ${model.quality}/5` : `calidad ${model.quality}/5 (por debajo de lo pedido)`, durationOk ? '' : 'clip más corto que lo pedido', `≈ $${estimatedUsd.toFixed(3)}`].filter(Boolean).join(' · '),
            });
        });
        const byPolicy = (a, b) => {
            if (a.durationOk !== b.durationOk)
                return a.durationOk ? -1 : 1;
            if (a.meetsQuality !== b.meetsQuality)
                return a.meetsQuality ? -1 : 1;
            if (policy === 'quality-first')
                return b.model.quality - a.model.quality || a.priority - b.priority;
            if (policy === 'cost-first' || prefs.preferCheaper)
                return a.estimatedUsd - b.estimatedUsd || a.priority - b.priority;
            return a.priority - b.priority;
        };
        candidates.sort(byPolicy);
        // Último recurso: modo demo (siempre en modo prueba; en modo real solo si nadie más puede)
        const mock = deps.adapters.mock;
        if (mock && settings.allowMockFallback && !candidates.some((c) => c.provider === 'mock') && (settings.pricingMode === 'simulated' || candidates.length === 0)) {
            const model = pickModel(mock, capability, quality, policy, config.providers.mock);
            if (model) {
                candidates.push({ provider: 'mock', model, priority: 999, estimatedUsd: 0, estimatedCredits: (0, pricing_1.creditsFor)(capability, 0, settings, true), durationOk: true, meetsQuality: false, reason: 'modo demo (sin IA real)' });
            }
        }
        return {
            capability,
            quality,
            policy,
            candidates: candidates.map((_a) => {
                var { durationOk: _d, meetsQuality: _m } = _a, c = __rest(_a, ["durationOk", "meetsQuality"]);
                return c;
            }),
            skipped,
        };
    };
    const execute = async (request) => {
        var _a;
        const config = await deps.loadConfig();
        const { settings } = config;
        const decision = await route(request, config);
        const { capability, input } = request;
        const modality = (0, types_1.modalityOf)(capability);
        const ctx = { userId: request.userId, jobId: request.jobId, stepId: request.stepId, experienceId: request.experienceId, goal: request.goal };
        const prefs = request.prefs || {};
        const timeoutMs = (_a = settings.timeoutsMs[modality]) !== null && _a !== void 0 ? _a : 120000;
        if (!decision.candidates.length) {
            const why = decision.skipped.map((s) => `${s.provider}: ${s.reason}`).join('; ');
            throw new http_1.ProviderError(`Ningún proveedor disponible para ${capability}${why ? ` (${why})` : ''}`, 'engine', undefined, false);
        }
        let lastError = null;
        let attempt = 0;
        for (const candidate of decision.candidates) {
            attempt++;
            const adapter = deps.adapters[candidate.provider];
            const generationId = await deps.ledger.open(Object.assign(Object.assign({}, ctx), { capability,
                modality, provider: candidate.provider, model: candidate.model.id, attempt, estimatedUsd: candidate.estimatedUsd, pricingMode: settings.pricingMode }));
            const start = now();
            try {
                const result = await withTimeout(adapter.run({ capability, model: candidate.model, input, ctx, prefs, timeoutMs }), timeoutMs, candidate.provider);
                const durationMs = now() - start;
                const demo = candidate.provider === 'mock';
                const credits = (0, pricing_1.creditsFor)(capability, result.costUSD, settings, demo);
                await deps.ledger.close(generationId, { status: 'done', actualUsd: result.costUSD, credits, durationMs, usage: result.usage });
                deps.health.success(candidate.provider);
                console.log(`WEË AI ENGINE: ${candidate.provider}/${result.model || candidate.model.id} atendió ${capability} en ${durationMs} ms (${credits} Credits, registro ${generationId}, intento ${attempt})`);
                if (request.record) {
                    await request.record({ capability, provider: candidate.provider, costUSD: result.costUSD, latencyMs: result.latencyMs, usage: result.usage || {} });
                }
                return Object.assign(Object.assign({}, result), { provider: candidate.provider, modelId: result.model || candidate.model.id, credits, generationId, attempts: attempt, demo, decision });
            }
            catch (error) {
                lastError = error;
                const message = error instanceof Error ? error.message : String(error);
                await deps.ledger.close(generationId, { status: 'failed', actualUsd: 0, credits: 0, durationMs: now() - start, error: message.slice(0, 500) });
                const countsAsFailure = !(error instanceof http_1.NotConfiguredError) && (!(error instanceof http_1.ProviderError) || error.retryable);
                if (countsAsFailure)
                    deps.health.failure(candidate.provider, settings);
                console.warn(`WEË AI ENGINE: ${candidate.provider}/${candidate.model.id} falló en ${capability} (intento ${attempt}): ${message}`);
            }
        }
        throw lastError instanceof Error ? lastError : new Error(`Todos los proveedores fallaron para ${capability}`);
    };
    return { route, execute };
}
//# sourceMappingURL=router.js.map