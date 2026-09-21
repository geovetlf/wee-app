import {
  BrainUnderstanding,
  CoreCapabilityId,
  CreativeParameters,
  RegistroDeSkills,
  SkillDescriptor,
  SkillPlanContribution,
  SkillRef,
  SkillResolution,
  aportacionDe,
  crearRegistroDeSkills,
  resolverSkill,
  trazaDeResolucion,
} from '../core';
import { disponibilidadDeWee } from '../planner';

/**
 * WEË SKILLS — LA COMPOSICIÓN.
 *
 * El Skills Engine del Core es puro: sabe qué es un Skill, cómo validarlo, cómo
 * indexarlo y cómo elegir uno a partir de lo que Brain entendió. Lo que no sabe
 * es qué Skills existen en Weë ni qué puede servir Weë hoy. Eso se sabe aquí, y
 * solo aquí.
 *
 * ── EL CATÁLOGO ESTÁ VACÍO, Y ESO ES EL ENTREGABLE ──────────────────────────
 *
 * S1 construye el MECANISMO, no los Skills. Con la lista vacía, toda resolución
 * es `none`, `aportacionDe()` devuelve `undefined`, el Planner recibe
 * `skill: undefined` y planifica exactamente como planificaba ayer. Weë no
 * depende de sus Skills: hoy no tiene ninguno y funciona igual.
 *
 * Cuando llegue el primer Skill de verdad —Drone View, y será otra fase— se
 * añade a esta lista y nada más se toca. Ni `CapabilityId`, ni el Router, ni el
 * Gateway, ni el Job Engine, ni el Workflow Engine, ni la cola.
 *
 * ── Y sigue sin estar conectado ─────────────────────────────────────────────
 *
 * Nadie importa este archivo desde el camino de producción. La costura existe,
 * está probada y no cambia el comportamiento de nada: enchufarla es una línea
 * en quien componga Brain → Planner, y es una decisión de otra fase.
 */

/**
 * LOS SKILLS DE WEË. Ninguno todavía.
 *
 * No es un hueco por terminar: es el estado correcto al cerrar S1. Un catálogo
 * con un Skill de ejemplo dentro sería un Skill en producción que nadie pidió,
 * y un Skill a medias que resuelve de verdad es peor que no tener ninguno.
 */
export const CATALOGO_DE_SKILLS: readonly SkillDescriptor[] = Object.freeze([]);

/**
 * El registro de Weë. Se construye desde el catálogo, con los rechazos a la
 * vista: si algún día el catálogo se alimenta de configuración, lo que no valga
 * no entra Y se sabe por qué.
 *
 * Sin estado de módulo: se construye cuando se pide. Con un catálogo corto
 * —decenas, no millones— construir los índices es despreciable frente a
 * cualquier lectura remota, y un registro cacheado a nivel de módulo sería
 * justo lo que impide cambiar el catálogo sin reiniciar.
 */
export const registroDeSkillsDeWee = (
  catalogo: readonly unknown[] = CATALOGO_DE_SKILLS,
): ReturnType<typeof crearRegistroDeSkills> => crearRegistroDeSkills(catalogo);

export interface ResolucionDeSkillDeps {
  registro?: RegistroDeSkills;
  /** Qué puede servir Weë hoy. Por defecto, la MISMA que usa el Planner. */
  disponible?: (capability: CoreCapabilityId) => boolean;
  /** Pedir uno concreto por referencia guardada. */
  prefer?: SkillRef;
  /**
   * La intención creativa, si no viene ya dentro del entendimiento.
   *
   * Lo normal es NO pasarla: Brain la deja en `understanding.preferences.creative`
   * y el resolutor la encuentra sola. Esto es para una interfaz avanzada que
   * quiera resolver con una intención concreta sin tocar el entendimiento.
   */
  creative?: CreativeParameters;
}

/**
 * ¿HAY UN SKILL PARA ESTO? — la pregunta de Weë.
 *
 * Se le hace DESPUÉS de que Brain entienda y ANTES de que el Planner planifique.
 * No llama a ningún proveedor, no consulta la red, no lee Firestore y no gasta
 * un solo Credit: es una comparación sobre estructura que ya estaba en la mano.
 */
export const resolverSkillDeWee = (
  understanding: BrainUnderstanding,
  deps: ResolucionDeSkillDeps = {},
): SkillResolution =>
  resolverSkill(
    {
      registro: deps.registro ?? registroDeSkillsDeWee().registro,
      disponible: deps.disponible ?? ((c) => disponibilidadDeWee.disponible(c)),
    },
    { understanding, ...(deps.prefer ? { prefer: deps.prefer } : {}), ...(deps.creative ? { creative: deps.creative } : {}) },
  );

/**
 * DE UNA RESOLUCIÓN AL PLANNER, en una línea.
 *
 * Solo un `found` aporta. Un `ambiguous`, un `unsupported` o un `none` dan
 * `undefined`, que es lo mismo que no haber preguntado — y eso es exactamente
 * lo que tiene que pasar.
 */
export const aporteParaElPlanner = (resolucion: SkillResolution | undefined): SkillPlanContribution | undefined =>
  aportacionDe(resolucion);

/**
 * Una línea por resolución, y solo cuando hubo algo que decir.
 *
 * Reutiliza lo que el Core ya recorta (`trazaDeResolucion`): nombre, versión,
 * estado y motivo. Nunca el objetivo, ni el texto de la persona, ni el prompt.
 * Un `none` no se anota: sería una línea por cada petición de Weë para decir
 * que no pasó nada.
 */
export const anotarResolucion = (resolucion: SkillResolution, traceId: string): void => {
  if (resolucion.status === 'none') return;
  const t = trazaDeResolucion(resolucion);
  const quien = t.skillId ? ` ${t.skillId}@${t.skillVersion}` : '';
  const porque = t.reason ? ` reason=${t.reason}` : '';
  console.log(`WEË SKILLS: ${t.status}${quien}${porque} traceId=${traceId}`);
};
