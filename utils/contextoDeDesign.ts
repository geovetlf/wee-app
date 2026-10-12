/**
 * LO QUE VIAJA A `CreatorFlow` DESDE UNA CAJA DE WEË DESIGN.
 *
 * Un solo sitio para armar el contexto de Weë Design: la pantalla montada (`screens/DesignScreen.tsx`) y la referencia funcional
 * (`utils/designReferencia.ts`, que lo re-exporta con su catálogo) llevan lo escrito a la experiencia común por aquí, así que si el
 * día de mañana cambia lo que Weë Design manda, cambia en un sitio y no en dos.
 *
 * ── Qué es, y qué no ─────────────────────────────────────────────────────────
 *
 * Es TRANSPORTE. No interpreta lo escrito, no decide un plan, no elige un proveedor, no calcula un precio, no mueve un Credit y no
 * llama a nadie: quien entiende la frase es Weë Brain, en el servidor, y quien cobra es el Credit Engine detrás de `CreatorFlow`.
 * El destino lo sigue eligiendo `destinoDeIntencion` (el de Weë Studio): aquí no hay un segundo router.
 *
 * ── Por qué es un módulo aparte ──────────────────────────────────────────────
 *
 * Nació dentro de `utils/designReferencia.ts`. La pantalla de siempre de Weë Design no puede importar de allí: I17 de
 * `functions/test/design-referencia.mjs` vigila que «no sabe que la referencia existe» (DEC-01 de `docs/WEE-DESIGN-UIUX-DECISIONS.md`),
 * y traerse su lógica —y con ella su registro entero de capacidades— sería saberlo. Este módulo no importa nada de la referencia: solo
 * el contrato del contexto, el catálogo de la propia pantalla y el destino de siempre.
 *
 * ── La puerta como respuesta ya dada ─────────────────────────────────────────
 *
 * Llevar cada puerta de la pantalla a una intención de la plantilla lo decidió el dueño (D1 = A y D7 = A de `docs/DESIGN.md` §4,
 * 2026-10-12): la puerta viaja como `presets` de `what`. Quien la manda pasa `que` JUNTO CON `idsDeQue` —el catálogo de la plantilla:
 * `QUE_DE_DESIGN` en la pantalla, `QUE_SE_DISENA` en la referencia—; con `que` a secas, o con un `que` fuera del catálogo, no sale
 * ningún preset. Así nadie suelta uno por descuido.
 *
 * ── Lo que NO viaja, a propósito ─────────────────────────────────────────────
 *
 * · Una foto al CREAR: la plantilla `design` la ignora y la persona vería «Foto lista» para una foto que no se usa (F-07 de
 *   `docs/WEE-DESIGN-CIERRE.md`). Solo al TRANSFORMAR un espacio entra la foto, por el camino de siempre (`imageUri` → `creatorUploads`).
 */

import type { Adjunto, ContextoDeExperiencia } from '../constants/weeWorkspaces';
import { AJUSTES_DE_DESIGN } from '../constants/designTools';
import { destinoDeIntencion } from './destinoDeIntencion';

/** Un grupo de ajustes tal como lo guarda el catálogo: claves, nunca frases (traducir al construirlo congelaría el idioma del arranque). */
export interface GrupoDeAjustes {
  id: string;
  opciones: readonly { id: string; clave: string }[];
}

/**
 * LOS AJUSTES ELEGIDOS, DICHOS EN PALABRAS.
 *
 * El plan todavía no los lee como estructura, así que viajan como frase, con las palabras del idioma de la persona. «Automático» no
 * dice nada: es dejar que decida Weë. Un grupo o una opción que el catálogo no conoce se deja fuera, sin romper nada. El orden es el de
 * elección (el del primer toque a cada grupo): es el mismo cálculo que hace `DesignReferenciaScreen`.
 */
export const palabrasDeLosAjustes = (
  elegido: Readonly<Record<string, string>>,
  t: (clave: string) => string,
  grupos: readonly GrupoDeAjustes[] = AJUSTES_DE_DESIGN,
): string[] =>
  Object.entries(elegido).flatMap(([grupo, opcion]) => {
    if (opcion === 'auto') return [];
    const o = grupos.find((g) => g.id === grupo)?.opciones.find((x) => x.id === opcion);
    return o ? [t(o.clave)] : [];
  });

export interface EntradaDelContexto {
  /**
   * `crear` desde cero (experiencia `design`), `transformar` un espacio con su foto (experiencia `home`, Hogar & Diseño) o
   * `presentar` un diseño en vídeo (experiencia `studio`, Weë Studio: DEC-12 = A, decisión del dueño del 2026-10-12).
   */
  intencion: 'crear' | 'transformar' | 'presentar';
  /** Lo que la persona escribió, tal cual. Sin nada escrito no hay contexto. */
  texto: string;
  /** Qué quiere diseñar, si la puerta lo dice: un `optionId` de la pregunta `what` de la plantilla. Solo viaja con `idsDeQue`. */
  que?: string | null;
  /** Los `optionId` válidos de la pregunta `what`. Sin ellos NO viaja ningún preset (ver «Lo que NO viaja»). */
  idsDeQue?: ReadonlySet<string>;
  /** Los ajustes ya dichos en palabras, unidos con comas (`palabrasDeLosAjustes(...).join(', ')`). */
  ajustesEnPalabras?: string;
  adjuntos?: readonly Adjunto[];
}

/** La experiencia que DECLARA cada intención. Una declaración de puerta no se filtra por `dentroDe` (ver `destinoDeIntencion`). */
const EXPERIENCIA_DE: Readonly<Record<EntradaDelContexto['intencion'], string>> = { crear: 'design', transformar: 'home', presentar: 'studio' };

/**
 * ENTRAR EN HOGAR & DISEÑO SIN HABER ESCRITO NADA (D2 = B, decisión del dueño del 2026-10-12).
 *
 * La puerta de Hogar & Diseño no necesita una idea: `CreatorFlow` empieza pidiendo la foto del espacio. Sale del destino de
 * siempre, declarado por la puerta, igual que un contexto con texto; solo que sin objetivo.
 */
export const entradaAHogar = (): ContextoDeExperiencia | null => {
  const destino = destinoDeIntencion('', { declaradaPorLaPuerta: EXPERIENCIA_DE.transformar, dentroDe: 'design' });
  return destino ? { experienceId: destino.experienceId, workspace: 'design' } : null;
};

/**
 * EL CONTEXTO QUE VIAJA A `CreatorFlow`.
 *
 * El destino lo decide `destinoDeIntencion` con la experiencia que DECLARA la intención (`design` para crear, `home` para transformar
 * un espacio, `studio` para presentarlo en vídeo). Lo que la persona escribe no se toca: los ajustes van detrás, en palabras, como en
 * Weë Studio. Devuelve `null` sin nada escrito.
 */
export const contextoDeDesign = (e: EntradaDelContexto): ContextoDeExperiencia | null => {
  const texto = e.texto.trim();
  if (!texto) return null;
  const destino = destinoDeIntencion(texto, {
    declaradaPorLaPuerta: EXPERIENCIA_DE[e.intencion],
    dentroDe: 'design',
  });
  if (!destino) return null;
  const fotos = e.intencion === 'transformar' ? (e.adjuntos ?? []).filter((a) => a.clase === 'fotoDeUnEspacio') : [];
  return {
    experienceId: destino.experienceId,
    workspace: 'design',
    goal: e.ajustesEnPalabras ? `${texto} · ${e.ajustesEnPalabras}` : texto,
    ...(e.intencion === 'crear' && e.que && e.idsDeQue?.has(e.que) ? { presets: [{ questionId: 'what', optionId: e.que }] } : {}),
    ...(fotos.length ? { adjuntos: [...fotos], imageUri: fotos[0].uri } : {}),
  };
};
