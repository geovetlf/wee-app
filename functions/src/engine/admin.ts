import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { AI_SECRETS } from '../secrets';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { CapabilityId } from '../creator/types';
import { engine } from './index';
import { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS } from './registry';
import { invalidateConfig } from './config';
import { ChainLink, RoutingPolicy } from './types';
import { assertAdmin } from '../shared/admin';

/**
 * Administración del engine sin tocar código (Firestore):
 *   aiProviders/{id}      { enabled, priority, models: { [modelo]: { enabled, quality, speed, cost, maxDurationSec } }, limits, note }
 *   aiRouting/{capacidad} { chain: [{ provider, model?, minQuality?, maxQuality? }], policy }
 *   aiSettings/global     { pricingMode, creditsPerUsd, margin, defaultPolicy, allowMockFallback, timeoutsMs, circuitBreaker }
 *
 * Solo administradores: custom claim `admin: true` o uid en WEE_ADMIN_UIDS.
 * Un panel visual puede construirse encima de esta función más adelante.
 */
const db = () => getFirestore();
const POLICIES: RoutingPolicy[] = ['quality-first', 'balanced', 'cost-first'];

const validateChain = (chain: unknown): ChainLink[] => {
  if (!Array.isArray(chain)) throw new HttpsError('invalid-argument', 'chain debe ser una lista');
  return chain.map((link) => {
    const provider = String((link as any)?.provider || '');
    if (!ADAPTERS[provider]) throw new HttpsError('invalid-argument', `Proveedor desconocido: ${provider}`);
    const out: ChainLink = { provider };
    if ((link as any).model) out.model = String((link as any).model);
    if ((link as any).minQuality) out.minQuality = (link as any).minQuality;
    if ((link as any).maxQuality) out.maxQuality = (link as any).maxQuality;
    return out;
  });
};

/**
 * Lo que se guarda aquí decide cuánto paga la persona, así que un valor imposible
 * se RECHAZA en vez de corregirse solo: nadie debe descubrir el error mirando una
 * factura. Por eso no hay conversión silenciosa ni valores por defecto de rescate.
 *
 * `margin` negativo dejaría el precio del modo real por debajo del coste del
 * proveedor en texto y vídeo, donde el suelo no está escrito de forma explícita
 * sino que descansa en que (1 + margin) nunca baje de 1.
 */
export const validateSettings = (data: Record<string, unknown>): void => {
  const esNumero = (v: unknown) => typeof v !== 'boolean' && v !== null && v !== '' && Number.isFinite(Number(v));
  if (data.pricingMode !== undefined && data.pricingMode !== 'simulated' && data.pricingMode !== 'real') {
    throw new HttpsError('invalid-argument', `pricingMode inválido: ${String(data.pricingMode)}. Solo "simulated" o "real"`);
  }
  if (data.margin !== undefined && (!esNumero(data.margin) || Number(data.margin) < 0)) {
    throw new HttpsError('invalid-argument', 'margin no puede ser negativo: vendería por debajo del coste del proveedor');
  }
  if (data.creditsPerUsd !== undefined && (!esNumero(data.creditsPerUsd) || Number(data.creditsPerUsd) <= 0)) {
    throw new HttpsError('invalid-argument', 'creditsPerUsd debe ser mayor que cero');
  }
};

export const engineAdmin = onCall({ region: 'us-central1', timeoutSeconds: 60, secrets: AI_SECRETS }, async (request) => {
  assertAdmin(request.auth as any);
  const data = (request.data || {}) as Record<string, any>;
  const action = String(data.action || 'status');

  switch (action) {
    case 'status':
      return engine.status();

    case 'seedDefaults': {
      const overwrite = data.overwrite === true;
      const batch = db().batch();
      let written = 0;
      for (const [id, conf] of Object.entries(DEFAULT_PROVIDERS)) {
        const ref = db().collection('aiProviders').doc(id);
        if (!overwrite && (await ref.get()).exists) continue;
        batch.set(ref, { ...conf, updatedAt: Timestamp.now() }, { merge: true });
        written++;
      }
      for (const [capability, routing] of Object.entries(DEFAULT_ROUTING)) {
        const ref = db().collection('aiRouting').doc(capability);
        if (!overwrite && (await ref.get()).exists) continue;
        batch.set(ref, { chain: routing.chain, policy: routing.policy, updatedAt: Timestamp.now() }, { merge: true });
        written++;
      }
      const settingsRef = db().collection('aiSettings').doc('global');
      if (overwrite || !(await settingsRef.get()).exists) {
        batch.set(settingsRef, { ...DEFAULT_SETTINGS, updatedAt: Timestamp.now() }, { merge: true });
        written++;
      }
      await batch.commit();
      invalidateConfig();
      return { written };
    }

    case 'setProvider': {
      const id = String(data.id || '');
      if (!ADAPTERS[id]) throw new HttpsError('invalid-argument', `Proveedor desconocido: ${id}`);
      const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (typeof data.enabled === 'boolean') patch.enabled = data.enabled;
      if (typeof data.priority === 'number') patch.priority = data.priority;
      if (data.models && typeof data.models === 'object') patch.models = data.models;
      if (data.limits && typeof data.limits === 'object') patch.limits = data.limits;
      if (typeof data.note === 'string') patch.note = data.note;
      await db().collection('aiProviders').doc(id).set(patch, { merge: true });
      invalidateConfig();
      return { ok: true };
    }

    case 'setRouting': {
      const capability = String(data.capability || '') as CapabilityId;
      if (!(capability in DEFAULT_ROUTING)) throw new HttpsError('invalid-argument', `Capacidad desconocida: ${capability}`);
      const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if (data.chain !== undefined) patch.chain = validateChain(data.chain);
      if (data.policy !== undefined) {
        if (!POLICIES.includes(data.policy)) throw new HttpsError('invalid-argument', 'policy inválida');
        patch.policy = data.policy;
      }
      await db().collection('aiRouting').doc(capability).set(patch, { merge: true });
      invalidateConfig();
      return { ok: true };
    }

    case 'setSettings': {
      validateSettings(data);
      const allowed = ['pricingMode', 'creditsPerUsd', 'margin', 'defaultPolicy', 'allowMockFallback', 'timeoutsMs', 'circuitBreaker'];
      const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
      for (const key of allowed) if (data[key] !== undefined) patch[key] = data[key];
      await db().collection('aiSettings').doc('global').set(patch, { merge: true });
      invalidateConfig();
      return { ok: true };
    }

    case 'resetHealth':
      engine.health.reset(data.id ? String(data.id) : undefined);
      return { ok: true };

    default:
      throw new HttpsError('invalid-argument', `Acción desconocida: ${action}`);
  }
});
