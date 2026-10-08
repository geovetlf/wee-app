/**
 * WEË DESIGN · 3D: world.generate DESDE EL COMPOSER Y LAS VERSIONES (bloque 3D, 2026-10-07).
 *
 * Lógica pura (sin React, sin Firebase, sin red ni reloj), probada en Node por
 * `functions/test/design-referencia.mjs` (grupo I22).
 *
 * ── world.generate desde Design ──────────────────────────────────────────────
 *
 * Weë Design usa la capacidad que ya existe (decisión del dueño) como CONTEXTO de
 * ejecución del Composer, sin engine nuevo: la petición es la canónica del
 * contrato (`peticionDelMundo3D`, el mismo lector que el servidor), la puerta es
 * la de siempre (`generateWorld` → Router → Gateway → Credit Engine → Job →
 * Asset `world` con su linaje), y la pantalla es la de Weë Studio (`Mundo3D`).
 * Lo único que añade Design es de dónde se viene. El contrato del mundo rechaza
 * campos desconocidos, así que el contexto NO viaja dentro de la petición: va
 * aparte, como en cualquier otra caja (CLAUDE.md §10).
 *
 * Y está APAGADO: `world.generate` es ROUTABLE pero ningún modelo es elegible
 * hasta que su licencia se apruebe y se active (lo decide el servidor), y la
 * referencia de Design vive tras su puerta cerrada. Aquí solo se prepara y se
 * dice su estado real; nada lo ejecuta.
 *
 * ── Versiones ────────────────────────────────────────────────────────────────
 *
 * La línea de versiones vive en el Content Core (`core/content/linaje.ts`:
 * `lineaDeVersiones`, `derivadosDe`, `volver_a_una_version`), pero hoy NO hay un
 * camino legítimo para que la app la use: no está en el espejo del cliente (ampliar
 * el espejo de Filmmaker no está autorizado) y ninguna puerta del servidor la
 * expone. Por eso aquí no se recorre ninguna cadena de `previousVersionId` (sería
 * un segundo sistema de versiones): la línea, restaurar y crear un derivado quedan
 * NO DISPONIBLES, con la dependencia que falta dicha (`DEPENDENCIA_DE_VERSIONES`).
 */
import { CAPABILITY_CATALOG, CAPACIDAD_DE_MUNDO } from '../services/escena3d';
import type { CatalogEntry } from '../services/escena3d';
import { DESIGN_REFERENCIA_EN_LA_APP } from '../constants/designReferencia';
import { clasificar3D } from '../constants/design3d';
import { peticionDelMundo3D } from './crearMundo3D';
import type { EntradaDelMundo3D, ResultadoDeLaPeticion } from './crearMundo3D';

/* ── world.generate ───────────────────────────────────────────────────────── */

/** El contexto con el que Design abre la capacidad: de dónde se viene, nunca qué modelo. */
export const CONTEXTO_DEL_MUNDO_EN_DESIGN = Object.freeze({
  experienceId: 'design' as const,
  workspace: 'design' as const,
  fila: 'environment' as const,
  capacidad: CAPACIDAD_DE_MUNDO,
});

/** La petición, la MISMA de Weë Studio: si el contrato la rechaza, aquí también. */
export const peticionDeMundoDesdeDesign = (entrada: EntradaDelMundo3D, cuenta: string): ResultadoDeLaPeticion =>
  peticionDelMundo3D(entrada, cuenta);

/** A dónde iría la persona: la pantalla de siempre, con lo que escribió y su foto. Sin pantalla nueva. */
export const destinoDelMundoDesdeDesign = (texto: string, imageUri?: string | null) => Object.freeze({
  pantalla: 'Mundo3D' as const,
  params: Object.freeze({ descripcion: texto.trim(), ...(imageUri ? { imageUri } : {}) }),
});

export type MotivoDelMundoApagado = 'referencia_cerrada' | 'no_enrutable' | 'gobernado_por_el_servidor';

export const CLAVE_DEL_MOTIVO_DEL_MUNDO: Readonly<Record<MotivoDelMundoApagado, string>> = Object.freeze({
  referencia_cerrada: 'designRef.worldGateClosed',
  no_enrutable: 'designRef.worldNotRoutable',
  gobernado_por_el_servidor: 'designRef.worldGoverned',
});

/**
 * EL ESTADO REAL, sin adivinar lo que solo sabe el servidor: si el catálogo no la
 * enruta, no hay nada; si la enruta, quién puede hacerla (licencia, jurisdicción,
 * activación) lo decide el servidor al cotizar, así que desde la app siempre es
 * «gobernado». Disponible: nunca desde aquí.
 */
export const estadoDelMundoEnDesign = (
  puertaDeLaReferencia: boolean = DESIGN_REFERENCIA_EN_LA_APP,
  catalogo: readonly CatalogEntry[] = CAPABILITY_CATALOG,
): { capacidad: string; enrutable: boolean; disponible: false; motivos: readonly MotivoDelMundoApagado[] } => {
  /* La fuente única de las capacidades 3D: enrutable = PARCIAL o IMPLEMENTADA en su clasificación. */
  const clase = clasificar3D(CAPACIDAD_DE_MUNDO, catalogo);
  const enrutable = clase === 'PARCIAL' || clase === 'IMPLEMENTADA';
  const motivos: MotivoDelMundoApagado[] = [];
  if (!puertaDeLaReferencia) motivos.push('referencia_cerrada');
  motivos.push(enrutable ? 'gobernado_por_el_servidor' : 'no_enrutable');
  return Object.freeze({ capacidad: CAPACIDAD_DE_MUNDO, enrutable, disponible: false as const, motivos: Object.freeze(motivos) });
};

/* ── Versiones ────────────────────────────────────────────────────────────── */

/** Lo que falta para enseñar versiones de verdad. Identificadores, no frases. */
export const DEPENDENCIA_DE_VERSIONES = Object.freeze({
  linea: 'servidor:lectura_de_linea_de_versiones' as const,
  restaurar: 'servidor:volver_a_una_version' as const,
  derivar: 'servidor:capacidad_que_deriva' as const,
});

export type DisponibilidadDeVersion = 'no_disponible';

/**
 * LAS OPERACIONES DE VERSIÓN, COMO CONTRATO Y PUERTA: las tres NO DISPONIBLES hasta
 * que exista su backend. Nunca un éxito local: no hay nada que la app pueda hacer
 * sola con una versión (ni recorrer la línea, ni restaurar, ni derivar).
 */
export const OPERACIONES_DE_VERSION: Readonly<Record<'linea' | 'restaurar' | 'derivar', DisponibilidadDeVersion>> = Object.freeze({
  linea: 'no_disponible',
  restaurar: 'no_disponible',
  derivar: 'no_disponible',
});
