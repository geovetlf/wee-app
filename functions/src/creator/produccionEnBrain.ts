import { Firestore } from 'firebase-admin/firestore';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import type { FilmmakerProduction, ProductionScene, ProductionShot, DialogueLine } from '../filmmaker/modelo';
import { derivarId, idsDeLaProduccion } from '../filmmaker/modelo';
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
  /**
   * El porqué de cada operación, en su mismo orden, tal como lo dijo Weë Brain (una frase, limpia y acotada), o
   * `null` si no lo dijo. Es su texto: la app lo enseña tal cual junto a cada cambio (Fase 22, arreglo R1).
   */
  readonly reasons: readonly (string | null)[];
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

/* ── Lo nuevo, con su id (Fase 22 del motor, arreglo R1 de la auditoría) ─────── */

/**
 * LO QUE UNA PROPUESTA NO PUEDE TOCAR: los vínculos a lo que la cuenta tiene guardado (`element`) y el material
 * (`assetId`). Los elige la persona, desde la app, y el servidor los vuelve a comprobar al guardar; que los
 * escriba un modelo sería dejarle nombrar cosas que no ha visto.
 */
const CAMPOS_VEDADOS: readonly string[] = ['element', 'assetId'];
/** Lo más que se guarda del porqué de un cambio. */
const MAX_RAZON = 200;
/** Cómo empieza el id de cada cosa nueva: los mismos prefijos que usa la app al crearlas. */
const PREFIJOS = Object.freeze({
  scene: 'sc', shot: 'sh', line: 'ln', character: 'ch', location: 'lc', object: 'ob', reference: 'rf', cue: 'sd',
});
type ClaseNueva = keyof typeof PREFIJOS;

/**
 * UNA HUELLA CORTA Y DETERMINISTA DE LA SEMILLA (FNV-1a de 32 bits, dos pasadas con bases distintas). No es
 * criptografía ni lo necesita: solo da a lo nuevo un nombre estable —la misma semilla, la misma raíz—, y si dos
 * raíces coincidieran, `derivarId` ya evita el choque con lo que existe.
 */
const raizDe = (semilla: string): string => {
  const pasada = (base: number): string => {
    let h = base >>> 0;
    for (let i = 0; i < semilla.length; i++) {
      h ^= semilla.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return (pasada(0x811c9dc5) + pasada(0x050c5d1f)).slice(0, 10);
};

/** Un marcador para referirse a algo nuevo dentro del mismo bloque: `@escena1`. Nunca es un id válido de F1-A. */
export const esMarcador = (v: unknown): v is string => typeof v === 'string' && /^@[A-Za-z0-9_-]{1,40}$/.test(v);

/** ¿Lleva, a cualquier profundidad, alguno de los campos vedados? */
const llevaVedados = (v: unknown): boolean => {
  if (Array.isArray(v)) return v.some(llevaVedados);
  if (!esPlano(v)) return false;
  return Object.entries(v).some(([k, x]) => CAMPOS_VEDADOS.includes(k) || llevaVedados(x));
};

/** Quita el prompt avanzado de los planos nuevos: es el texto de la persona y no lo escribe Weë Brain. */
const sinAvanzado = (plano: unknown): void => {
  if (esPlano(plano)) delete plano.advanced;
};

/** Sustituye, a cualquier profundidad, cada marcador conocido por su id. */
const sustituir = (v: unknown, marcadores: Readonly<Record<string, string>>): unknown => {
  if (typeof v === 'string') return esMarcador(v) ? marcadores[v] ?? v : v;
  if (Array.isArray(v)) return v.map((x) => sustituir(x, marcadores));
  if (esPlano(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sustituir(x, marcadores)]));
  return v;
};

/**
 * LOS IDS DE LO NUEVO, PUESTOS POR EL SERVIDOR. F1-A exige un id en cada escena, plano, línea, ficha, referencia y
 * sonido, y Weë Brain no puede inventarlos sin chocar con los que ya hay. Lo nuevo llega sin id, o con un marcador
 * (`@nombre`) que otras operaciones del mismo bloque usan para referirse a ello. Aquí cada cosa nueva recibe un id
 * DERIVADO —de la semilla (el mensaje) y de su posición, sin azar ni reloj, así que repetir el mensaje da los
 * mismos—, que no choca con ninguno de la producción ni de la propia propuesta; y cada marcador se sustituye por el
 * suyo en todo el bloque. Un id que ya venía escrito se respeta tal cual: si choca, F1-A lo dirá.
 */
export const ponerIdsNuevos = (operaciones: readonly Record<string, unknown>[], prod: FilmmakerProduction, semilla: string): Record<string, unknown>[] => {
  const ocupados = idsDeLaProduccion(prod);
  /* Un marcador empieza por @: nunca coincide con nada heredado de un objeto. */
  const marcadores: Record<string, string> = {};
  const raiz = raizDe(semilla);
  let n = 0;
  const idPara = (clase: ClaseNueva, actual: unknown): unknown => {
    if (actual !== undefined && !esMarcador(actual)) return actual;
    const candidato = `${PREFIJOS[clase]}_${raiz}_${++n}`;
    const id = ocupados.has(candidato) ? derivarId(candidato, ocupados) : candidato;
    ocupados.add(id);
    if (esMarcador(actual) && !(actual in marcadores)) marcadores[actual] = id;
    return id;
  };
  const conId = (clase: ClaseNueva, cosa: unknown): void => {
    if (esPlano(cosa)) cosa.id = idPara(clase, cosa.id);
  };
  const lineas = (dueño: unknown): void => {
    if (esPlano(dueño) && Array.isArray(dueño.dialogue)) dueño.dialogue.forEach((l) => conId('line', l));
  };
  const plano = (p: unknown): void => { sinAvanzado(p); conId('shot', p); lineas(p); };

  const copia = operaciones.map((o) => JSON.parse(JSON.stringify(o)) as Record<string, unknown>);
  for (const op of copia) {
    switch (op.op) {
      case 'add_scene':
        if (esPlano(op.scene)) {
          conId('scene', op.scene);
          lineas(op.scene);
          if (Array.isArray(op.scene.shots)) op.scene.shots.forEach(plano);
        }
        break;
      case 'add_shot': plano(op.shot); break;
      case 'add_dialogue': conId('line', op.line); break;
      case 'add_character': conId('character', op.character); break;
      case 'add_location': conId('location', op.location); break;
      case 'add_object': conId('object', op.object); break;
      case 'add_reference': conId('reference', op.reference); break;
      case 'modify_audio':
        if (esPlano(op.change) && op.change.action === 'upsert') conId('cue', op.change.cue);
        break;
      default: break;
    }
  }
  return copia.map((o) => sustituir(o, marcadores) as Record<string, unknown>);
};

/**
 * COMPROBAR LO QUE PROPONE WEË BRAIN. Lo que escribe un modelo es de fuera y se
 * trata así: JSON o nada, doce como mucho, cada una con un nombre del lenguaje, y
 * todas juntas aplicadas EN MEMORIA sobre la producción guardada con la misma
 * función que usará `productions` al aplicarlas de verdad. Si una falla, no se
 * propone ninguna: una propuesta a medias sería decir algo que no se va a hacer.
 *
 * Desde la Fase 22 (arreglo R1 de la auditoría): cada operación puede traer su porqué (`why`), que se separa y se
 * devuelve aparte; lo nuevo recibe su id aquí (`ponerIdsNuevos`, con la `semilla` del mensaje); y una propuesta que
 * toque vínculos a lo guardado o material no se da por buena.
 */
export const leerPropuesta = (bloque: string, p: ProduccionParaBrain, semilla = `${p.productionId}:${p.revision}`): LecturaDeLaPropuesta => {
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
  const crudas = JSON.parse(JSON.stringify(lista)) as Record<string, unknown>[];
  /* El porqué de cada una, aparte: F1-A no lo conoce y no viaja en la operación. */
  const reasons = crudas.map((o) => {
    const razon = typeof o.why === 'string' ? limpio(o.why, MAX_RAZON) : typeof o.reason === 'string' ? limpio(o.reason, MAX_RAZON) : '';
    delete o.why;
    delete o.reason;
    return razon || null;
  });
  if (llevaVedados(crudas)) return { ok: false, motivo: 'invalid', problemas: ['field_not_allowed'] };
  const operaciones = ponerIdsNuevos(crudas, p.production, semilla) as unknown as FilmmakerOperation[];
  const r = aplicarOperaciones(p.production, operaciones);
  if (!r.ok) return { ok: false, motivo: 'invalid', problemas: [...new Set(r.problems.map((x) => x.code))].slice(0, 5) };
  if (r.applied === 0) return { ok: false, motivo: 'no_changes' };
  return {
    ok: true,
    propuesta: {
      productionId: p.productionId,
      baseRevision: p.revision,
      operations: operaciones,
      reasons,
      applied: r.applied,
      pending: r.pending,
      timelineChanged: r.timelineChanged,
    },
  };
};
