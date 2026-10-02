/**
 * WEE ALGORITHM ENGINE — LO QUE ESTA CAPA NO PUEDE HACER.
 *
 * ── Por qué esto es un archivo y no un párrafo ──────────────────────────────
 *
 * Porque un límite escrito en un comentario se cruza el día que alguien tiene
 * prisa. En B3.15.2 quedó demostrado del modo más barato posible: se intentó
 * que un paso del plan dijera «usa ElevenLabs», y lo que lo impidió no fue la
 * buena intención de nadie — fue `claveDeImplementacion`, una lista de nombres
 * prohibidos que una guarda podía comprobar.
 *
 * Así que aquí no se escribe otra lista. Se usa ESA, importada del Planner. Si
 * el Core amplía lo que considera implementación, esta capa se aprieta sola y
 * sin que nadie se acuerde de venir a tocarla.
 *
 * ── El reparto ──────────────────────────────────────────────────────────────
 *
 *   El Algorithm Engine PUEDE      evaluar · recomendar · puntuar · proponer
 *                                  alternativas, recuperación y paralelización
 *                                  · producir señales
 *
 *   El Algorithm Engine NO PUEDE   elegir proveedor o modelo · ejecutar nada ·
 *                                  cobrar · crear materiales · saltarse al
 *                                  Router, al Gateway o al Financial Core ·
 *                                  modificar al Planner o a Brain
 *
 * La autoridad final se queda donde estaba. Esta capa aporta criterio, no poder.
 *
 * ── Describir no es elegir ──────────────────────────────────────────────────
 *
 * Una SEÑAL sí puede nombrar a un proveedor: «elevenlabs falló 3 de 50» es un
 * hecho sobre el mundo y sin él no hay nada que optimizar. Lo que no puede
 * nombrarlo es una ESTRATEGIA o una DECISIÓN, porque eso ya no describe: manda.
 * La frontera pasa por ahí y no por la palabra.
 */

import { claveDeImplementacion } from '../planner';
import { Strategy } from './strategy';

/**
 * LOS EFECTOS QUE ESTA CAPA TIENE PROHIBIDOS.
 *
 * Datos y no prosa, para que una prueba pueda recorrerlos. Cada uno nombra a su
 * dueño: la lista no dice solo «no puedes», dice «no puedes porque ya hay
 * alguien que sí», que es lo que impide que mañana se construya un segundo
 * sistema por no saber dónde estaba el primero.
 */
export const EFECTOS_PROHIBIDOS: readonly { readonly efecto: string; readonly dueno: string }[] = Object.freeze([
  Object.freeze({ efecto: 'elegir proveedor o modelo', dueno: 'Router (core/router.ts)' }),
  Object.freeze({ efecto: 'llamar a una API de proveedor', dueno: 'Gateway + adaptador (core/gateway.ts)' }),
  Object.freeze({ efecto: 'cobrar, reservar o reembolsar Credits', dueno: 'Financial Core (core/financial, credits/)' }),
  Object.freeze({ efecto: 'crear o modificar materiales', dueno: 'Asset Core (core/content)' }),
  Object.freeze({ efecto: 'crear o ejecutar trabajos', dueno: 'Job Engine (core/job.ts)' }),
  Object.freeze({ efecto: 'decidir qué capacidades hacen falta', dueno: 'Planner (core/planner.ts)' }),
  Object.freeze({ efecto: 'entender la intención', dueno: 'Weë Brain (core/brain.ts)' }),
  Object.freeze({ efecto: 'despachar pasos', dueno: 'Orchestrator (core/orchestrator.ts)' }),
  Object.freeze({ efecto: 'reintentar', dueno: 'Job Engine, con RetryPolicy (core/workflow.ts)' }),
  Object.freeze({ efecto: 'leer un secreto', dueno: 'nadie en el Core: los secretos viven en el runtime' }),
]);

/** Dónde se comprobó la frontera y qué la cruzó. */
export interface ViolacionDeAutoridad {
  /** Qué objeto la cruzó: `strategy:s1`, `strategy:s1:step:audio`… */
  donde: string;
  /** El nombre prohibido que apareció. */
  clave: string;
}

/**
 * ¿INTENTA ESTE OBJETO ELEGIR UNA IMPLEMENTACIÓN?
 *
 * Recorre en profundidad y con TOPE. Sin el tope, un objeto con una referencia
 * circular o con diez mil claves convierte la comprobación de seguridad en la
 * caída que venía a evitar — y lo que se inspecciona aquí puede haberlo
 * construido un algoritmo, es decir, código que todavía no existe.
 *
 * Devuelve TODAS las violaciones, no la primera.
 */
export const violacionesEn = (valor: unknown, donde: string, maxProfundidad = 8): readonly ViolacionDeAutoridad[] => {
  const salida: ViolacionDeAutoridad[] = [];
  const vistos = new Set<unknown>();
  let restantes = 4096;

  const recorrer = (v: unknown, ruta: string, nivel: number): void => {
    if (nivel > maxProfundidad || restantes <= 0) return;
    if (typeof v !== 'object' || v === null) return;
    if (vistos.has(v)) return;
    vistos.add(v);
    if (Array.isArray(v)) {
      for (const item of v) { if (restantes-- <= 0) return; recorrer(item, ruta, nivel + 1); }
      return;
    }
    for (const [clave, item] of Object.entries(v as Record<string, unknown>)) {
      if (restantes-- <= 0) return;
      if (claveDeImplementacion(clave)) salida.push({ donde: ruta, clave });
      recorrer(item, ruta, nivel + 1);
    }
  };

  recorrer(valor, donde, 0);
  return salida;
};

/**
 * UNA ESTRATEGIA, REVISADA CONTRA LA FRONTERA.
 *
 * Se mira el `input` de cada paso —que es donde cabría— y también el resto de
 * la estrategia, porque la puerta de atrás nunca está donde se la espera: en
 * B3.15.2 el campo se coló por `input`, y la próxima vez podría venir en una
 * propuesta de recuperación o en una etiqueta.
 *
 * `capability` y `purpose` no se inspeccionan como texto: una capacidad es del
 * catálogo del Core y decir `voice.tts` es declarar QUÉ hace falta, no CON QUÉ.
 * Esa distinción es la que hace que el Planner pueda existir.
 */
export const violacionesDeEstrategia = (s: Strategy): readonly ViolacionDeAutoridad[] => {
  const salida: ViolacionDeAutoridad[] = [];
  for (const paso of s?.steps ?? []) {
    salida.push(...violacionesEn(paso.input, `strategy:${s.id}:step:${paso.id}:input`));
    salida.push(...violacionesEn(paso.hints, `strategy:${s.id}:step:${paso.id}:hints`));
    /* Y la clave suelta en la raíz del paso, que es la otra forma de colarlo. */
    for (const clave of Object.keys(paso)) {
      if (claveDeImplementacion(clave)) salida.push({ donde: `strategy:${s.id}:step:${paso.id}`, clave });
    }
  }
  salida.push(...violacionesEn(s?.recovery, `strategy:${s?.id}:recovery`));
  salida.push(...violacionesEn(s?.checkpoints, `strategy:${s?.id}:checkpoints`));
  salida.push(...violacionesEn(s?.parallelGroups, `strategy:${s?.id}:parallelGroups`));
  return salida;
};

/** ¿Respeta la frontera? */
export const respetaLaFrontera = (s: Strategy): boolean => violacionesDeEstrategia(s).length === 0;
