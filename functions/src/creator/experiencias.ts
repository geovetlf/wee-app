import { CAPABILITY_CATALOG } from '../core/registry';
import { CapabilityId, ExperienceId } from './types';

/**
 * QUÉ EXPERIENCIAS CONOCE WEË BRAIN.
 *
 * ── El fallo que este archivo existe para impedir ───────────────────────────
 *
 * La tabla de especialistas vivía en `prompts.ts` declarada como
 * `Record<string, string>`. Cuando llegó Weë Travel —la undécima experiencia—
 * la tabla se quedó en las diez de entonces, el compilador no tenía forma de
 * verlo, y el resultado fue que Weë Brain no podía ni sugerir Weë Travel ni
 * derivar a ella: la marca [[WEE:travel]] se descartaba en silencio y el prompt
 * ni la mencionaba.
 *
 * No fue el primer sitio donde pasó lo mismo. `creator/index.ts` tuvo el mismo
 * desfase con la lista de experiencias que atiende el servidor, y allí se
 * arregló DERIVÁNDOLA de `TEMPLATES`.
 *
 * ── Una autoridad, dos proyecciones ─────────────────────────────────────────
 *
 *   ExperienceId  →  derivar  (el chat manda a la persona a otra sección)
 *                 →  sugerir  (el entendimiento nombra la sección que encaja)
 *
 * La autoridad sigue siendo `ExperienceId` y no se crea ninguna otra. Lo que
 * hay aquí son PROYECCIONES: filtros sobre esa misma lista. Ninguna se escribe
 * a mano, así que una experiencia nueva entra o queda fuera A PROPÓSITO, nunca
 * por omisión — y el Record de abajo es TOTAL, de modo que el compilador exige
 * que alguien diga qué pasa con ella.
 *
 * ── Por qué esto NO vive en `prompts.ts` ────────────────────────────────────
 *
 * Porque saber si una experiencia puede trabajar hoy exige mirar el catálogo, y
 * `prompts.ts` tiene dos guardas que lo prohíben con razón: G18 no deja entrar
 * nada de Legacy en el módulo de prompts, y G20 no deja escribir capacidades a
 * mano donde se arma el vocabulario. Las dos son correctas y ninguna se ha
 * tocado: lo que se ha movido es esto.
 */

/*
 * Cómo se le NOMBRA cada experiencia al modelo. No dice cuáles existen —eso lo
 * dice `ExperienceId`—, dice cómo se presentan. `null` NO significa "no
 * existe": significa "no se le puede decir al chat que derive aquí", y va con
 * su motivo al lado.
 */
export const BRAIN_SPECIALISTS: Record<ExperienceId, string | null> = {
  design: 'Weë Design (logos, afiches, productos, personajes, escenas, cualquier diseño visual)',
  studio: 'Weë Studio (videos, animar fotos, anuncios en video)',
  photo: 'Weë Photo (mejorar, restaurar, transformar o editar fotos)',
  writer: 'Weë Writer (textos, historias, guiones, emails, CV, traducciones, correcciones)',
  beauty: 'Weë Beauty (maquillaje, cabello, barba, outfits, cambios de look en tu foto)',
  chef: 'Weë Chef (recetas, menús, cocinar con lo que tienes)',
  home: 'Hogar & Diseño (rediseñar, redecorar o reorganizar espacios de la casa)',
  business: 'Weë Business (ideas, marketing, contenido para redes, estrategia, documentos de negocio)',
  /* Las palabras salen de la ficha que cada experiencia ya tiene en la app
     (`constants/weeExperiences.ts`) y de las variantes que el catálogo declara
     para su capacidad; no se ha inventado ninguna descripción nueva. */
  travel: 'Weë Travel (preparar un viaje: a dónde ir, qué hacer, cómo moverse y el plan día a día)',
  music: 'Weë Music (canciones, música instrumental, voces y narración)',
  /* Weë Brain es el propio chat: derivarse a sí mismo no lleva a ninguna parte,
     y la app ya descarta esa sugerencia (`screens/BrainChatScreen.tsx`, el
     `exp.id !== 'brain'`). Queda fuera por lo que ES, no por un olvido. */
  brain: null,
};

/*
 * ── LO QUE TODAVÍA NO PUEDE TRABAJAR ────────────────────────────────────────
 *
 * Weë Music existe y eso no se discute. Lo que no existe todavía es su camino:
 * necesita `music.generate`, y esa capacidad aún no se enruta. No es una regla
 * sobre Music —no dice que Music esté mal, ni la borra de ninguna parte—: es
 * una pregunta al catálogo. El día que la capacidad se enrute, Music entra sola
 * en las dos proyecciones sin que nadie toque este archivo.
 *
 * Se declara, no se deduce de la plantilla de Legacy: Legacy no es la autoridad
 * de nada de esto. Lo que comprueba que la declaración no se quede corta es una
 * prueba (`test/vocabulario-experiencias.test.mjs`), que recorre las once
 * plantillas contra el catálogo y exige que no falte ninguna otra.
 */
const CAPACIDAD_QUE_LE_FALTA: Partial<Record<ExperienceId, CapabilityId>> = {
  music: 'music.generate',
};

const puedeTrabajar = (id: ExperienceId): boolean => {
  const pendiente = CAPACIDAD_QUE_LE_FALTA[id];
  return pendiente === undefined
    || CAPABILITY_CATALOG.find((c) => c.id === pendiente)?.status === 'ROUTABLE';
};

const TODAS = Object.keys(BRAIN_SPECIALISTS) as ExperienceId[];

/** A qué secciones puede mandar el chat a la persona con [[WEE:id]]. */
export const EXPERIENCIAS_PARA_DERIVAR: readonly ExperienceId[] =
  TODAS.filter((id) => BRAIN_SPECIALISTS[id] !== null && puedeTrabajar(id));

/*
 * Qué puede nombrar el entendimiento como `suggestedExperience`. Hoy el filtro
 * es el mismo que el de arriba porque los dos motivos —no tener a dónde ir, no
 * poder trabajar todavía— valen igual para las dos: una sugerencia también
 * termina abriendo una sección. Se mantienen separadas porque los consumidores
 * son distintos, y el día que un motivo valga solo para una, aquí se separan
 * sin que aparezca una segunda lista.
 */
export const EXPERIENCIAS_PARA_SUGERIR: readonly ExperienceId[] =
  TODAS.filter((id) => BRAIN_SPECIALISTS[id] !== null && puedeTrabajar(id));

/** Cómo se le nombran al modelo las que sí puede proponer. */
export const DESCRIPCIONES_PARA_DERIVAR: readonly string[] =
  EXPERIENCIAS_PARA_DERIVAR.map((id) => BRAIN_SPECIALISTS[id] as string);
