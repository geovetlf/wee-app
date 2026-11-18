import { createHash } from 'node:crypto';
import { direccionDeLaCuenta } from '../engine/http';
import type { AssetDoc } from '../content';
import { crearMaterialDesdeUrl } from '../content';
import type { ProductionReference } from '../filmmaker/modelo';
import { derivarId } from '../filmmaker/modelo';

/**
 * WEË FILMMAKER · LAS REFERENCIAS CON LAS QUE NACE UNA PRODUCCIÓN.
 *
 * `productions.create` acepta `references: [{ role, url }]`. La persona sube una imagen (de un personaje, del mundo o
 * una general) y Weë la convierte en MATERIAL de su cuenta y en una `ProductionReference` de la producción: el modelo
 * guarda ids de material, nunca URLs (una URL ahí sería una puerta a cualquier sitio), así que la URL se queda en esta
 * frontera y no sale de ella.
 *
 *   · SOLO URLs de `users/{uid}/creator-inputs/` de quien llama (la regla de `creator/inputs.ts`): ni de otra cuenta, ni de
 *     `ai-generations`, ni de internet.
 *   · El papel de la app (`reference` | `character` | `world`) se traduce al del dominio (`general` | `character` |
 *     `location`). Un papel fuera de esos tres no se acepta: no se adivina.
 *   · La identidad del material se CALCULA (cuenta + objeto), así que repetir la misma creación da el mismo material y la
 *     misma producción: crear dos veces lo mismo sigue siendo crear una.
 *
 * Dependencias inyectables para probarlo sin red ni Firebase.
 */

/** Los papeles que la app manda y a qué papel del dominio corresponde cada uno. */
export const PAPEL_DE_ENTRADA_A_DOMINIO = Object.freeze({
  reference: 'general',
  character: 'character',
  world: 'location',
} as const);
export type PapelDeEntrada = keyof typeof PAPEL_DE_ENTRADA_A_DOMINIO;

/** Cuántas referencias admite una creación. Las demás se añaden después, con operaciones. */
export const MAX_REFERENCIAS_AL_CREAR = 30;

export type MotivoDeReferenciaAlCrear =
  | 'references_not_a_list'
  | 'references_too_many'
  | 'reference_malformed'
  | 'reference_role_unknown'
  | 'reference_url_not_allowed'
  | 'reference_unavailable';

export type ResultadoDeReferenciasAlCrear =
  | { readonly ok: true; readonly references: readonly ProductionReference[] }
  | { readonly ok: false; readonly reason: MotivoDeReferenciaAlCrear; readonly index?: number };

export interface DepsDeReferenciasAlCrear {
  /** Crea la ficha del material desde la URL (por defecto, la del Content Core). `null` si no es posible. */
  readonly crear?: (d: { ownerAccountId: string; assetId: string; url: string; name: string }) => Promise<Pick<AssetDoc, 'assetId'> | null>;
  /** Valida y reescribe la URL (por defecto, la de la cuenta). */
  readonly direccion?: (url: string, uid: string) => { ok: true; url: string; path: string } | { ok: false };
}

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const direccionPorDefecto = (url: string, uid: string): { ok: true; url: string; path: string } | { ok: false } => {
  const d = direccionDeLaCuenta(url, uid);
  return d.ok ? { ok: true, url: d.url, path: d.path } : { ok: false };
};

const crearPorDefecto: NonNullable<DepsDeReferenciasAlCrear['crear']> = async (d) =>
  crearMaterialDesdeUrl({
    ownerAccountId: d.ownerAccountId,
    assetId: d.assetId,
    url: d.url,
    kind: 'image',
    name: d.name,
    provenance: { createdAt: Date.now() },
  });

/** La identidad del material de una referencia: la misma cuenta y el mismo objeto dan la misma. */
export const idDeMaterialDeReferencia = (accountId: string, objeto: string): string =>
  `asset_${createHash('sha256').update(`${accountId}|${objeto}`).digest('hex').slice(0, 32)}`;

/**
 * DE LO QUE LLEGA A LAS REFERENCIAS DE LA PRODUCCIÓN. Pura salvo las dos dependencias. `ocupados` son los ids que ya
 * usa la producción (para no chocar con ellos).
 */
export const materializarReferenciasAlCrear = async (
  p: { readonly uid: string; readonly accountId: string; readonly references: unknown; readonly ocupados?: ReadonlySet<string> },
  deps: DepsDeReferenciasAlCrear = {},
): Promise<ResultadoDeReferenciasAlCrear> => {
  if (p.references === undefined) return { ok: true, references: [] };
  if (!Array.isArray(p.references)) return { ok: false, reason: 'references_not_a_list' };
  if (p.references.length > MAX_REFERENCIAS_AL_CREAR) return { ok: false, reason: 'references_too_many' };
  const direccion = deps.direccion ?? direccionPorDefecto;
  const crear = deps.crear ?? crearPorDefecto;
  const ocupados = new Set(p.ocupados ?? []);
  const salida: ProductionReference[] = [];
  for (let i = 0; i < p.references.length; i++) {
    const r: unknown = p.references[i];
    if (!esObj(r) || typeof r.url !== 'string' || r.url.length === 0 || r.url.length > 2000) return { ok: false, reason: 'reference_malformed', index: i };
    if (typeof r.role !== 'string' || !Object.prototype.hasOwnProperty.call(PAPEL_DE_ENTRADA_A_DOMINIO, r.role)) return { ok: false, reason: 'reference_role_unknown', index: i };
    const d = direccion(r.url, p.uid);
    /* Solo lo que la persona sube: `users/{uid}/creator-inputs/`. Lo generado por Weë se referencia por su material, no por URL. */
    if (!d.ok || !d.path.startsWith(`users/${p.uid}/creator-inputs/`)) return { ok: false, reason: 'reference_url_not_allowed', index: i };
    const assetId = idDeMaterialDeReferencia(p.accountId, d.path);
    const ficha = await crear({ ownerAccountId: p.accountId, assetId, url: d.url, name: d.path.split('/').pop() ?? 'referencia' });
    if (!ficha) return { ok: false, reason: 'reference_unavailable', index: i };
    const id = derivarId('ref', ocupados);
    ocupados.add(id);
    salida.push({ id, kind: 'image', role: PAPEL_DE_ENTRADA_A_DOMINIO[r.role as PapelDeEntrada], assetId: ficha.assetId });
  }
  return { ok: true, references: salida };
};
