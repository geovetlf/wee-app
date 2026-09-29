import { Firestore } from 'firebase-admin/firestore';
import { requisitosDelServidor } from './requisitoDelServidor';

/**
 * WEË FILMMAKER · FASE 19 — LAS VOCES DEL DIÁLOGO: EL CATÁLOGO, LA ASIGNACIÓN Y SU COMPROBACIÓN, CERRADOS.
 *
 * Encargo del usuario (2026-09-28, «CERRAR EL FILMMAKER ENGINE»): voces para el diálogo, como canary y sin gastar
 * dinero real. F1-A ya sabe qué se dice y quién lo dice —cada línea de diálogo, voz en off o narración, con su
 * personaje y su idioma, es un requisito de audio `voice.tts`— y describe una voz SIN nombrar a nadie
 * (`VoiceReference`: una descripción, un audio de referencia de la producción, un idioma). Lo que falta para ponerle
 * voz de verdad es con qué voces, y eso NO es de F1-A: es un catálogo de Weë.
 *
 *   · EL CATÁLOGO (`CATALOGO_DE_VOCES`): las voces de Weë para Filmmaker, cada una con su identificador de Weë
 *     (`wv_…`, el único que viajaría), sus idiomas y sus usos. VACÍO: ninguna se ha comprobado todavía con un canary
 *     real —cómo suena, su licencia, lo que cobra el proveedor—. En el código: la configuración puede cerrar, nunca
 *     ampliar. El proveedor y su voz no aparecen aquí: son del adaptador.
 *   · LA ASIGNACIÓN, COMPROBADA (`comprobarAsignacion`, pura): a quién —un personaje de la producción, o el narrador—
 *     y qué voz; vale solo con la puerta de la cuenta abierta (`aiSettings/voces`, cerrada por defecto), una voz del
 *     catálogo, para ese uso y en los idiomas de SUS líneas.
 *   · EL PLAN (`planDeVoces`, solo lectura): qué líneas de la producción guardada necesitarían voz, de quién son y en
 *     qué idiomas, cuántas tendrían voz hoy (ninguna) y por qué.
 *
 * Y nada más: ni se guarda una asignación, ni se sintetiza una voz, ni se cobra, ni se llama a ningún proveedor. Lo
 * que falta para hacerlo de verdad, dicho: el catálogo necesita su canary con gasto, y GUARDAR una voz del catálogo en
 * un personaje necesita un campo que F1-A no tiene —cambiarlo pide autorización—.
 */

export const PUERTA_DE_VOCES = 'aiSettings/voces';

export type UsoDeVoz = 'dialogue' | 'voiceover' | 'narration';
export const USOS_DE_VOZ: readonly UsoDeVoz[] = Object.freeze(['dialogue', 'voiceover', 'narration']);

export interface VozDelCatalogo {
  /** El identificador de Weë (`wv_…`): el único que viajaría. Nunca el del proveedor. */
  readonly id: string;
  /** Los idiomas (BCP 47, la parte del idioma) en los que se ha COMPROBADO. */
  readonly idiomas: readonly string[];
  readonly usos: readonly UsoDeVoz[];
}

/** EL CATÁLOGO: VACÍO. Ninguna voz comprobada todavía. */
export const CATALOGO_DE_VOCES: readonly VozDelCatalogo[] = Object.freeze([]);

export const FORMA_DE_VOZ = /^wv_[a-z0-9_]{2,40}$/;
export const NARRADOR = 'narrator';

/**
 * Por qué una línea no tiene voz, o una asignación no vale. `not_stored`: hay voces y la puerta está abierta, pero una
 * asignación todavía no se guarda en ningún sitio —F1-A no tiene dónde, y dárselo pide autorización—.
 */
export type MotivoSinVoz =
  | 'no_lines' | 'gate_closed' | 'catalog_empty' | 'not_stored' | 'voice_invalid' | 'voice_not_in_catalog'
  | 'speaker_not_found' | 'speaker_has_no_lines' | 'use_not_supported' | 'language_not_supported';

/** Una línea que necesitaría voz, tal como la pide F1-A. */
export interface LineaConVoz {
  readonly lineId: string;
  readonly kind: UsoDeVoz;
  /** El personaje que habla; en la narración, nadie (se asigna al narrador). */
  readonly speakerId?: string;
  readonly language?: string;
  readonly chars: number;
}

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const idiomaCorto = (l: string | undefined): string | undefined => (typeof l === 'string' && l ? l.toLowerCase().split('-')[0] : undefined);

/** LAS LÍNEAS CON VOZ de unos requisitos de F1-A: sus requisitos de audio `voice.tts`, en su orden. Pura. */
export const lineasConVoz = (audio: readonly unknown[]): LineaConVoz[] => audio
  .filter(esObj)
  .filter((a) => a.capability === 'voice.tts' && typeof a.id === 'string' && a.id.startsWith('line:') && USOS_DE_VOZ.includes(a.kind as UsoDeVoz))
  .map((a) => {
    const i = esObj(a.input) ? a.input : {};
    return {
      lineId: (a.id as string).slice('line:'.length),
      kind: a.kind as UsoDeVoz,
      ...(typeof i.speakerId === 'string' ? { speakerId: i.speakerId } : {}),
      ...(typeof i.language === 'string' ? { language: i.language } : {}),
      chars: typeof i.text === 'string' ? i.text.length : 0,
    };
  });

/** De quién es una línea a efectos de voz: su personaje, o el narrador si no habla nadie. */
export const vozDeQuien = (l: LineaConVoz): string => l.speakerId ?? NARRADOR;

/**
 * UNA ASIGNACIÓN, COMPROBADA. Pura. En este orden: la puerta; el catálogo; la forma y la existencia de la voz; que
 * quien habla exista y tenga líneas; que la voz sirva para ESOS usos y en ESOS idiomas. El primer motivo que falla, y
 * solo ese.
 */
export const comprobarAsignacion = (e: {
  readonly puertaAbierta: boolean;
  readonly catalogo: readonly VozDelCatalogo[];
  readonly lineas: readonly LineaConVoz[];
  readonly personajes: readonly string[];
  readonly quien: string;
  readonly vozId: unknown;
}): { readonly ok: true } | { readonly ok: false; readonly motivo: MotivoSinVoz } => {
  if (!e.puertaAbierta) return { ok: false, motivo: 'gate_closed' };
  if (!e.catalogo.length) return { ok: false, motivo: 'catalog_empty' };
  if (typeof e.vozId !== 'string' || !FORMA_DE_VOZ.test(e.vozId)) return { ok: false, motivo: 'voice_invalid' };
  const voz = e.catalogo.find((v) => v.id === e.vozId);
  if (!voz) return { ok: false, motivo: 'voice_not_in_catalog' };
  if (e.quien !== NARRADOR && !e.personajes.includes(e.quien)) return { ok: false, motivo: 'speaker_not_found' };
  const suyas = e.lineas.filter((l) => vozDeQuien(l) === e.quien);
  if (!suyas.length) return { ok: false, motivo: 'speaker_has_no_lines' };
  if (suyas.some((l) => !voz.usos.includes(l.kind))) return { ok: false, motivo: 'use_not_supported' };
  const idiomas = voz.idiomas.map((x) => x.toLowerCase());
  if (suyas.some((l) => { const i = idiomaCorto(l.language); return i !== undefined && !idiomas.includes(i); })) return { ok: false, motivo: 'language_not_supported' };
  return { ok: true };
};

/** ¿Está abierta la puerta de las voces para esta cuenta? Sin documento, sin el sí o sin a quién: cerrada. */
export const leerPuertaDeVoces = async (db: Firestore, accountId: string): Promise<boolean> => {
  const snap = await db.doc(PUERTA_DE_VOCES).get().catch(() => null);
  const d = snap && snap.exists ? snap.data() : undefined;
  if (!esObj(d) || d.vocesDeDialogo !== true) return false;
  if (d.todas === true) return true;
  return Array.isArray(d.cuentas) && d.cuentas.some((c) => c === accountId);
};

/** El plan, contado: cuántas líneas, de qué clase, quién habla y en qué idiomas; cuántas tendrían voz y por qué no. */
export interface PlanDeVoces {
  readonly lines: number;
  readonly byKind: Readonly<Record<UsoDeVoz, number>>;
  readonly speakers: readonly string[];
  readonly languages: readonly string[];
  readonly voiced: number;
  readonly reason?: MotivoSinVoz;
  /** Si se pidió comprobar asignaciones: el veredicto de cada una. */
  readonly checks?: readonly { readonly speaker: string; readonly ok: boolean; readonly reason?: MotivoSinVoz }[];
}

export type RespuestaDelPlanDeVoces = { readonly ok: true; readonly plan: PlanDeVoces } | { readonly ok: false; readonly motivo: 'production_not_found' | 'production_changed' };

/**
 * EL PLAN DE VOCES de una producción GUARDADA, en esa revisión: sus requisitos de F1-A calculados en el servidor,
 * por la puerta de siempre (`requisitosDelServidor`) —el dominio de Filmmaker no entra por ningún otro sitio—.
 * Solo lectura. Con `asignar`, comprueba —sin guardar nada— cada asignación pedida (quien → voz).
 */
export const planDeVoces = async (
  db: Firestore,
  quien: { accountId: string },
  u: { productionId: string; revision: number; asignar?: unknown },
  opciones: { catalogo?: readonly VozDelCatalogo[] } = {},
): Promise<RespuestaDelPlanDeVoces> => {
  const todos = await requisitosDelServidor(db, quien.accountId, { productionId: u.productionId, revision: u.revision });
  if (!todos.ok) return { ok: false, motivo: todos.motivo === 'production_not_found' ? 'production_not_found' : 'production_changed' };
  const lineas = lineasConVoz(todos.audio);
  const catalogo = opciones.catalogo ?? CATALOGO_DE_VOCES;
  const byKind = { dialogue: 0, voiceover: 0, narration: 0 } as Record<UsoDeVoz, number>;
  for (const l of lineas) byKind[l.kind]++;
  const speakers = [...new Set(lineas.map(vozDeQuien))];
  const languages = [...new Set(lineas.map((l) => idiomaCorto(l.language)).filter((x): x is string => !!x))].sort();
  const puertaAbierta = lineas.length ? await leerPuertaDeVoces(db, quien.accountId) : false;
  const reason: MotivoSinVoz = !lineas.length ? 'no_lines' : !puertaAbierta ? 'gate_closed' : !catalogo.length ? 'catalog_empty' : 'not_stored';
  const personajes = todos.personajes;
  const pedidas = esObj(u.asignar) ? Object.entries(u.asignar).slice(0, 32) : [];
  const checks = pedidas.map(([speaker, vozId]) => {
    const r = comprobarAsignacion({ puertaAbierta, catalogo, lineas, personajes, quien: speaker, vozId });
    return r.ok ? { speaker, ok: true } : { speaker, ok: false, reason: r.motivo };
  });
  return {
    ok: true,
    plan: {
      lines: lineas.length, byKind, speakers, languages,
      /* Nada tiene voz todavía: ni hay voces en el catálogo, ni una asignación se guarda. */
      voiced: 0,
      reason,
      ...(pedidas.length ? { checks } : {}),
    },
  };
};
