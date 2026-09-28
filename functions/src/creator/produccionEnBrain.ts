import { Firestore } from 'firebase-admin/firestore';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import type { FilmmakerProduction, ProductionScene, ProductionShot, DialogueLine } from '../filmmaker/modelo';
import { FilmmakerOperation, OPERACIONES, PendingRegeneration, aplicarOperaciones } from '../filmmaker/operaciones';
import { recomendar } from '../filmmaker/recomendaciones';
import { leerProduccion } from '../productions/index';
import { MARCA_DE_CAMBIOS, MAX_OPERACIONES_POR_PROPUESTA } from './prompts';

/**
 * WEË FILMMAKER ENGINE · FASE 9 (F2 DEL ROADMAP) — WEË BRAIN CON UNA PRODUCCIÓN ABIERTA.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * La caja del editor de una producción es Weë Brain —el mismo, por `brainChat`—
 * y lo único que cambia es el CONTEXTO (CLAUDE.md §10; decisión del usuario del
 * 2026-09-28). Este módulo es ese contexto y nada más:
 *
 *   leer       la producción guardada, de la cuenta de la sesión;
 *   contarla   un resumen para el prompt, con sus identificadores y sus
 *              recomendaciones, sin nada que pueda hacerse pasar por una marca;
 *   separar    del texto que ve la persona, el bloque con la propuesta;
 *   comprobar  la propuesta con el lenguaje de F1-A, EN MEMORIA.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No aplica nada ni escribe nada: la propuesta se ENSEÑA, y quien la aplica es la
 * persona, desde la app, por `productions` —con la revisión en la que se basa, así
 * que si la producción cambió entre medias, el CAS lo dice—. No llama a ningún
 * modelo ni cobra: eso sigue siendo de `brainChat`, con el mismo precio y el mismo
 * bloque de doce que cualquier mensaje. Y no es otro intérprete: el significado lo
 * pone Weë Brain; aquí solo se comprueba que lo que propone es el idioma de F1-A.
 */

/** Lo que cabe del resumen. Una producción enorme se cuenta hasta aquí y se dice que sigue. */
export const MAX_RESUMEN = 12_000;
/** Lo que se cuenta de cada texto de la persona: un título, una descripción, una línea de diálogo. */
const MAX_TEXTO = 240;
/** Cuántas recomendaciones se le cuentan: las primeras, que son las más graves. */
const MAX_RECOMENDACIONES = 10;
/** Lo más largo que se acepta leer de un bloque. Más que esto no es una propuesta de doce operaciones. */
export const MAX_BLOQUE = 24_000;

export interface ProduccionParaBrain {
  readonly productionId: string;
  readonly revision: number;
  readonly production: FilmmakerProduction;
  /** Lo que se le cuenta a Weë Brain. */
  readonly resumen: string;
}

/**
 * LO QUE ESCRIBIÓ LA PERSONA, LISTO PARA IR DENTRO DE UN PROMPT. Una línea, acotada,
 * y sin corchetes dobles: ni una descripción con `[[WEE-CAMBIOS]]` ni una con
 * `[[WEE:studio]]` pueden hacerse pasar por lo que escribe Weë Brain.
 */
const limpio = (v: unknown, max = MAX_TEXTO): string =>
  typeof v === 'string' ? v.replace(/\[\[|\]\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

const entre = (s: string): string => (s ? `«${s}»` : '');

/** Lo que tiene fijado de cámara, luz, movimiento y transición, contado corto. */
const creativo = (v: { readonly creative?: object } | undefined): string => {
  const c = (v?.creative ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const partes: string[] = [];
  if (c.shot?.type) partes.push(`plano ${String(c.shot.type)}`);
  if (c.camera?.type) partes.push(`cámara ${String(c.camera.type)}`);
  if (c.camera?.perspective) partes.push(`perspectiva ${String(c.camera.perspective)}`);
  if (c.lens?.type) partes.push(`óptica ${String(c.lens.type)}`);
  if (c.movement?.type) partes.push(`movimiento ${String(c.movement.type)}${c.movement.speed ? ` ${String(c.movement.speed)}` : ''}`);
  if (c.lighting?.type) partes.push(`luz ${String(c.lighting.type)}`);
  if (c.composition?.type) partes.push(`composición ${String(c.composition.type)}`);
  if (c.transition?.type) partes.push(`transición ${String(c.transition.type)}`);
  return partes.join(', ');
};

const dialogo = (d: readonly DialogueLine[] | undefined, sangria: string): string[] =>
  (d ?? []).map((l) => `${sangria}Línea [${l.id}] ${l.kind}${l.characterId ? ` de [${l.characterId}]` : ''}: ${entre(limpio(l.text))}`);

const plano = (p: ProductionShot): string[] => {
  const extra = [
    p.durationSec !== undefined ? `${p.durationSec} s` : 'sin duración',
    creativo(p.visual),
    p.subject?.focus ? `enfoque ${p.subject.focus}${p.subject.characterId ? ` en [${p.subject.characterId}]` : ''}` : '',
    p.characterIds?.length ? `salen ${p.characterIds.map((id) => `[${id}]`).join(' ')}` : '',
  ].filter(Boolean).join(' · ');
  return [`  Plano [${p.id}] ${extra}${p.description ? ` — ${limpio(p.description)}` : ''}`, ...dialogo(p.dialogue, '    ')];
};

const escena = (s: ProductionScene): string[] => {
  const extra = [
    s.weather ? `clima ${s.weather}` : '',
    s.timeOfDay ? `momento ${s.timeOfDay}` : '',
    s.locationId ? `lugar [${s.locationId}]` : '',
    creativo(s.visual),
  ].filter(Boolean).join(' · ');
  return [
    `Escena [${s.id}] ${entre(limpio(s.title, 120))}${extra ? ` (${extra})` : ''}${s.description ? ` — ${limpio(s.description)}` : ''}`,
    ...dialogo(s.dialogue, '  '),
    ...(s.shots.length ? s.shots.flatMap(plano) : ['  (sin planos)']),
  ];
};

/**
 * LA PRODUCCIÓN, CONTADA PARA WEË BRAIN. Pura: lo mismo da lo mismo.
 *
 * Todo lo que se puede nombrar va con su identificador entre corchetes, porque es
 * lo que la propuesta tiene que usar. Las recomendaciones van al final: son las
 * de F1-A, deterministas, y Weë Brain las explica en su idioma.
 */
export const resumenDeProduccion = (prod: FilmmakerProduction, revision: number): string => {
  const cabecera = [
    `Revisión ${revision} · ${entre(limpio(prod.title, 120))} · ${prod.format.aspectRatio} · ${prod.format.resolution ?? 'sin resolución'}${prod.duration.targetSec ? ` · objetivo ${prod.duration.targetSec} s` : ''}`,
    ...(prod.intent.objective ? [`Objetivo: ${limpio(prod.intent.objective)}`] : []),
    ...(prod.creativeDirection.mood || prod.creativeDirection.tone || prod.creativeDirection.pacing
      ? [`Dirección: ${[prod.creativeDirection.mood && `ánimo ${limpio(prod.creativeDirection.mood, 80)}`, prod.creativeDirection.tone && `tono ${limpio(prod.creativeDirection.tone, 80)}`, prod.creativeDirection.pacing && `ritmo ${prod.creativeDirection.pacing}`].filter(Boolean).join(', ')}`]
      : []),
    ...prod.characters.map((c) => `Personaje [${c.id}] ${entre(limpio(c.name, 80))}${c.identityDescription ? ` — ${limpio(c.identityDescription)}` : ''}`),
    ...prod.locations.map((l) => `Lugar [${l.id}] ${entre(limpio(l.name, 80))}${l.description ? ` — ${limpio(l.description)}` : ''}`),
    ...prod.objects.map((o) => `Objeto [${o.id}] ${entre(limpio(o.name, 80))}`),
  ];
  const recomendaciones = recomendar(prod).slice(0, MAX_RECOMENDACIONES)
    .map((r) => `${r.code}${r.path ? ` (${limpio(r.path, 80)})` : ''}`);
  const pie = recomendaciones.length ? [`Recomendaciones abiertas: ${recomendaciones.join('; ')}.`] : ['Sin recomendaciones abiertas.'];

  const cuerpo: string[] = [];
  /* Con sitio reservado para la línea que dice que no cupo todo: el tope es el tope. */
  const RESERVA = 160;
  let usado = [...cabecera, ...pie].join('\n').length;
  let quedan = 0;
  for (const s of [...prod.scenes].sort((a, b) => a.order - b.order)) {
    const lineas = escena({ ...s, shots: [...s.shots].sort((a, b) => a.order - b.order) });
    const largo = lineas.join('\n').length + 1;
    if (quedan || usado + largo > MAX_RESUMEN - RESERVA) { quedan++; continue; }
    cuerpo.push(...lineas);
    usado += largo;
  }
  if (quedan) cuerpo.push(`(y ${quedan} escenas más que no caben aquí: si te pide algo de ellas, pídele que te diga cuál)`);
  return [...cabecera, ...cuerpo, ...pie].join('\n');
};

/**
 * LA PRODUCCIÓN ABIERTA, SI ES DE ESTA CUENTA. `null` si no existe o no es suya:
 * las dos cosas contestan igual, como en todas las puertas de productions.
 */
export const leerProduccionParaBrain = async (db: Firestore, uid: string, productionId: unknown): Promise<ProduccionParaBrain | null> => {
  if (typeof productionId !== 'string' || !productionId || productionId.length > 128) return null;
  const cuenta = await cuentaDelPrincipalEnWee(db, uid);
  if (!cuenta) return null;
  const r = await leerProduccion(cuenta.accountId, productionId, { db });
  if (!r.ok) return null;
  const { production, revision } = r.view;
  return { productionId, revision, production, resumen: resumenDeProduccion(production, revision) };
};

/* ── La propuesta ─────────────────────────────────────────────────────────── */

/**
 * SEPARAR EL TEXTO DE LA PROPUESTA. La persona lee el texto; el bloque no lo lee
 * nunca, esté bien o mal. Si hay varios, cuenta el último. Si se abrió y no se
 * cerró —la respuesta se cortó—, se quita lo que hay desde la marca y se dice.
 */
export const separarPropuesta = (crudo: string): { texto: string; bloque?: string; cortado: boolean } => {
  const { abre, cierra } = MARCA_DE_CAMBIOS;
  const ultima = crudo.lastIndexOf(abre);
  if (ultima < 0) return { texto: crudo.split(cierra).join('').trim(), cortado: false };
  const fin = crudo.indexOf(cierra, ultima + abre.length);
  const antes = crudo.slice(0, ultima);
  /* Lo de antes también se limpia: un bloque anterior, entero o no, tampoco se enseña. */
  const sinBloques = (s: string): string => s.replace(/\[\[WEE-CAMBIOS\]\][\s\S]*?(\[\[\/WEE-CAMBIOS\]\]|$)/g, '').split(cierra).join('').trim();
  if (fin < 0) return { texto: sinBloques(antes), cortado: true };
  return {
    texto: sinBloques(`${antes}${crudo.slice(fin + cierra.length)}`),
    bloque: crudo.slice(ultima + abre.length, fin),
    cortado: false,
  };
};

export type MotivoDeLaPropuesta = 'unreadable' | 'too_many' | 'invalid' | 'no_changes';

/** En inglés, como las demás vistas del motor: la app traduce claves, no frases. */
export interface PropuestaDeCambios {
  readonly productionId: string;
  /** La revisión sobre la que se comprobó. La app la aplica con esta: si cambió, el CAS lo dice. */
  readonly baseRevision: number;
  readonly operations: readonly FilmmakerOperation[];
  /** Cuántas cambian algo. */
  readonly applied: number;
  /** Lo que quedaría pendiente de rehacer. Un cálculo, no una orden. */
  readonly pending: PendingRegeneration;
  readonly timelineChanged: boolean;
}

export type LecturaDeLaPropuesta =
  | { readonly ok: true; readonly propuesta: PropuestaDeCambios }
  | { readonly ok: false; readonly motivo: MotivoDeLaPropuesta; readonly problemas?: readonly string[] };

const esPlano = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * COMPROBAR LO QUE PROPONE WEË BRAIN. Lo que escribe un modelo es de fuera y se
 * trata así: JSON o nada, doce como mucho, cada una con un nombre del lenguaje, y
 * todas juntas aplicadas EN MEMORIA sobre la producción guardada con la misma
 * función que usará `productions` al aplicarlas de verdad. Si una falla, no se
 * propone ninguna: una propuesta a medias sería decir algo que no se va a hacer.
 */
export const leerPropuesta = (bloque: string, p: ProduccionParaBrain): LecturaDeLaPropuesta => {
  if (bloque.length > MAX_BLOQUE) return { ok: false, motivo: 'unreadable' };
  let crudo: unknown;
  try {
    crudo = JSON.parse(bloque.trim());
  } catch {
    return { ok: false, motivo: 'unreadable' };
  }
  const lista = Array.isArray(crudo) ? crudo : esPlano(crudo) ? crudo.operations : undefined;
  if (!Array.isArray(lista)) return { ok: false, motivo: 'unreadable' };
  if (!lista.length) return { ok: false, motivo: 'no_changes' };
  if (lista.length > MAX_OPERACIONES_POR_PROPUESTA) return { ok: false, motivo: 'too_many' };
  if (!lista.every((o) => esPlano(o) && typeof o.op === 'string' && (OPERACIONES as readonly string[]).includes(o.op))) {
    return { ok: false, motivo: 'invalid', problemas: ['operation_invalid'] };
  }
  /* Una copia limpia: lo que se comprueba es lo que se devuelve, y nada de lo que traía el texto queda colgando. */
  const operaciones = JSON.parse(JSON.stringify(lista)) as FilmmakerOperation[];
  const r = aplicarOperaciones(p.production, operaciones);
  if (!r.ok) return { ok: false, motivo: 'invalid', problemas: [...new Set(r.problems.map((x) => x.code))].slice(0, 5) };
  if (r.applied === 0) return { ok: false, motivo: 'no_changes' };
  return {
    ok: true,
    propuesta: {
      productionId: p.productionId,
      baseRevision: p.revision,
      operations: operaciones,
      applied: r.applied,
      pending: r.pending,
      timelineChanged: r.timelineChanged,
    },
  };
};
