/**
 * EL UNIVERSO Y LA BARRA DE ETAPAS DE FILMMAKER (ola 2, 2026-11-17; constitución §12). Solo datos: claves de `filmmaker.*`, identificadores e iconos.
 */
import type { NombreDeIcono } from '../components/icons/trazosDeWee';
import type { GrupoDePersonaje, TipoDeElemento } from '../utils/universoDeFilmmaker';

/**
 * REGENERAR LA LÁMINA: CERRADO. Generar imágenes por elemento es una capacidad que Filmmaker hoy no pide al Core; abrirla es una capacidad más
 * y la regla 10 exige autorización expresa del dueño. Con `true` el botón dejaría de salir cerrado (y habría que conectar la capacidad).
 */
export const GENERAR_IMAGENES_DEL_UNIVERSO = false;
/** «Weë lee los personajes» de un libro o guion: CERRADO hasta que exista la capacidad de documentos y la del copiloto (D5). */
export const LEER_PERSONAJES_ABIERTO = false;

export type EtapaId = 'idea' | 'universe' | 'batches' | 'production' | 'join' | 'output';
export const ETAPAS: readonly { id: EtapaId; clave: string; abierta: boolean; claveMotivo?: string }[] = [
  { id: 'idea', clave: 'filmmaker.stageIdea', abierta: true },
  { id: 'universe', clave: 'filmmaker.stageUniverse', abierta: true },
  { id: 'batches', clave: 'filmmaker.stageBatches', abierta: true },
  { id: 'production', clave: 'filmmaker.stageProduction', abierta: false, claveMotivo: 'filmmaker.stageSoon' },
  { id: 'join', clave: 'filmmaker.stageJoin', abierta: false, claveMotivo: 'filmmaker.stageSoon' },
  { id: 'output', clave: 'filmmaker.stageOutput', abierta: false, claveMotivo: 'filmmaker.stageSoon' },
];

export const SECCIONES_DEL_UNIVERSO: readonly { id: TipoDeElemento; clave: string; icono: NombreDeIcono; claveVacio: string; clavePlaceholder: string }[] = [
  { id: 'character', clave: 'filmmaker.uniCharacters', icono: 'perfilReal', claveVacio: 'filmmaker.uniEmptyCharacters', clavePlaceholder: 'filmmaker.uniAddCharacter' },
  { id: 'place', clave: 'filmmaker.uniPlaces', icono: 'lugar', claveVacio: 'filmmaker.uniEmptyPlaces', clavePlaceholder: 'filmmaker.uniAddPlace' },
  { id: 'object', clave: 'filmmaker.uniObjects', icono: 'cubo', claveVacio: 'filmmaker.uniEmptyObjects', clavePlaceholder: 'filmmaker.uniAddObject' },
];

export const CLAVE_DE_GRUPO: Record<GrupoDePersonaje, string> = {
  main: 'filmmaker.uniGroupMain', important: 'filmmaker.uniGroupImportant', groups: 'filmmaker.uniGroupGroups', other: 'filmmaker.uniGroupOther',
};


/**
 * EL EJEMPLO que Weë enseña para ver cómo queda la lámina. Los nombres propios son de ficción; la descripción es una CLAVE que se resuelve al cargar
 * (el catálogo guarda claves, no frases). Salen rotulados «Ejemplo» y no cuentan para aprobar.
 */
export const EJEMPLO_DEL_UNIVERSO: readonly { tipo: TipoDeElemento; nombre: string; claveLinea: string; grupo: GrupoDePersonaje; voz: string }[] = [
  { tipo: 'character', nombre: 'Mara', claveLinea: 'filmmaker.uniEx1', grupo: 'main', voz: 'ej_es_aurora' },
  { tipo: 'character', nombre: 'Iván', claveLinea: 'filmmaker.uniEx2', grupo: 'main', voz: 'ej_es_bruno' },
  { tipo: 'character', nombre: 'Lucía', claveLinea: 'filmmaker.uniEx3', grupo: 'important', voz: 'ej_es_clara' },
  { tipo: 'character', nombre: 'Ona', claveLinea: 'filmmaker.uniEx4', grupo: 'groups', voz: 'ej_en_ivy' },
  { tipo: 'place', nombre: 'Faro', claveLinea: 'filmmaker.uniEx5', grupo: 'other', voz: 'auto' },
  { tipo: 'object', nombre: 'Brújula', claveLinea: 'filmmaker.uniEx6', grupo: 'other', voz: 'auto' },
];
