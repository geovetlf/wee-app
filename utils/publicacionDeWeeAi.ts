/**
 * WEËAI SENCILLO · CREAR PARA PUBLICAR (decisión del dueño, 2026-11-23). Lógica pura, sin React ni Firebase.
 *
 * Tres cosas —Imagen, Video corto y Editar mi foto— que van por el camino de siempre: la experiencia de Weë Brain que
 * corresponde (Design, Studio, Photo), con lo elegido en pantalla como `presetAnswers`. Esos ids (`publicar`, `estilo`,
 * `duracion`) los entiende la plantilla del servidor (`functions/src/creator/templates.ts`, `elegidas`): viajan tal cual y
 * no se traducen.
 */
import { MODELOS_DE_FILMMAKER } from '../constants/filmmakerModelos';
import type { Answer } from '../services/creatorService';
import type { Post } from '../services/firestoreService';

export type TipoDeCreacion = 'imagen' | 'video' | 'editar';
export type FormatoDeImagen = 'post' | 'vertical';
export type FormatoDeVideo = 'weel' | 'post';
export type EstiloDeImagen = 'auto' | 'real' | 'ilustracion' | 'cine' | 'anime';
/** 'auto' es «Que Weë elija»: la duración automática del motor de video. */
export type Duracion = 'auto' | number;

/** Un Weël dura como mucho 15 s (regla del producto: CLAUDE.md, docs/UX.md; el servidor aplica la misma, `MAX_WEEL_SEC`). */
export const MAX_WEEL_SEC = 15;

/** Qué experiencia de Weë Brain atiende cada cosa. Solo cambia el contexto: es la misma inteligencia (CLAUDE.md §10). */
export const EXPERIENCIA_DE: Record<TipoDeCreacion, 'design' | 'studio' | 'photo'> = { imagen: 'design', video: 'studio', editar: 'photo' };

export const ESTILOS: readonly { id: EstiloDeImagen; clave: string }[] = [
  { id: 'auto', clave: 'publicar.queWeeElija' },
  { id: 'real', clave: 'publicar.estiloReal' },
  { id: 'ilustracion', clave: 'publicar.estiloIlustracion' },
  { id: 'cine', clave: 'publicar.estiloCine' },
  { id: 'anime', clave: 'publicar.estiloAnime' },
];

/**
 * LO QUE PERMITE EL MODELO, sin cifras escritas aquí: el mínimo y el máximo de los modelos de video INTEGRADOS del espejo
 * del cliente (`constants/filmmakerModelos.ts`, que `functions/test/filmmaker-especificaciones.test.mjs` compara con la
 * fuente única del servidor, `seedance-capacidades.ts`). Un Weël, además, no pasa de 15 s.
 */
export const limitesDeDuracion = (weel: boolean): { min: number; max: number } | null => {
  const rangos = MODELOS_DE_FILMMAKER
    .filter((m) => m.tipo === 'video' && m.estado === 'integrado' && m.duracion !== 'desconocido')
    .map((m) => m.duracion as { min: number; max: number });
  if (rangos.length === 0) return null;
  const min = Math.min(...rangos.map((r) => r.min));
  const max = Math.max(...rangos.map((r) => r.max));
  const tope = weel ? Math.min(max, MAX_WEEL_SEC) : max;
  return tope >= min ? { min, max: tope } : null;
};

/** Las duraciones que se ofrecen: «Que Weë elija» y tres puntos del rango que admite el modelo (el mínimo, el medio y el máximo). */
export const duracionesDisponibles = (weel: boolean): Duracion[] => {
  const limites = limitesDeDuracion(weel);
  if (!limites) return ['auto'];
  const medio = Math.round((limites.min + limites.max) / 2);
  return ['auto', ...Array.from(new Set([limites.min, medio, limites.max]))];
};

export interface EleccionDeCreacion {
  tipo: TipoDeCreacion;
  formatoImagen: FormatoDeImagen;
  formatoVideo: FormatoDeVideo;
  estilo: EstiloDeImagen;
  duracion: Duracion;
}

/** Lo elegido, como respuestas ya dadas a la plantilla. Ids estables: viajan al servidor y no se traducen. */
export const respuestasElegidas = (e: EleccionDeCreacion): Answer[] => {
  if (e.tipo === 'imagen') return [{ questionId: 'publicar', optionId: e.formatoImagen }, { questionId: 'estilo', optionId: e.estilo }];
  if (e.tipo === 'video') {
    return [
      { questionId: 'publicar', optionId: e.formatoVideo },
      e.duracion === 'auto' ? { questionId: 'duracion', optionId: 'auto' } : { questionId: 'duracion', text: String(e.duracion) },
    ];
  }
  return [{ questionId: 'publicar', optionId: 'editar' }];
};

/** ¿Este trabajo nació aquí? Se reconoce por la respuesta `publicar` que solo esta pantalla manda. */
export const esTrabajoParaPublicar = (answers: Answer[] | undefined): boolean => (answers || []).some((a) => a.questionId === 'publicar');

/** El tipo de un trabajo para publicar, por su experiencia. */
export const tipoDeExperiencia = (experienceId: string): TipoDeCreacion | null =>
  experienceId === 'design' ? 'imagen' : experienceId === 'studio' ? 'video' : experienceId === 'photo' ? 'editar' : null;

/** Una dirección de un archivo real (no la vista previa en línea del modo demo). */
export const esArchivoReal = (url?: string): boolean => !!url && /^https?:\/\//.test(url);

/** «Recrear este estilo»: solo en lo hecho con WeëAI cuyo autor dejó su idea a la vista. */
export const puedeRecrear = (post: Pick<Post, 'weeAi' | 'aiPrompt' | 'autonomo'>): boolean =>
  !!post.weeAi && !!(post.aiPrompt || '').trim() && !post.autonomo;

/** La clave del tipo de creación, para «Cómo lo hice». */
export const claveDelTipo = (tipo: TipoDeCreacion): string =>
  tipo === 'video' ? 'publicar.puertaVideo' : tipo === 'editar' ? 'publicar.puertaEditar' : 'publicar.puertaImagen';

/** La marca que se guarda en `aiTools`: es el nombre de Weë, no se traduce. */
export const HERRAMIENTA_WEEAI = 'WeëAI';

/*
 * NINGÚN NOMBRE DE EXPERIENCIA A LA VISTA (decisión del dueño, 2026-11-23). Lo guardado en `aiTools` —WeëChef, Weë Studio,
 * Filmmaker, Kling…— se pinta SIEMPRE como «WeëAI» y, si se sabe qué se hizo, «WeëAI · Imagen / Video corto / Editar mi foto».
 * Los datos no se reescriben: solo cambia cómo se pintan. Lo vigila `functions/test/weeai-sencillo.test.mjs`.
 */
const NOMBRES_DE_EXPERIENCIA = /\bWe[eë]\s?(AI\s+)?(Chef|Studio|Design|Photo|Writer|Music|Beauty|Home|Business|Travel|Brain|Fashion|Filmmaker|Creator|Biz)\b|\bFilmmaker\b|Hogar\s*&\s*Dise/i;

/** ¿El texto nombra una experiencia de Weë? (Un «Cómo lo hice» antiguo escrito por la app, p. ej. «Creado con Weë Chef en Weë AI».) */
export const nombraUnaExperiencia = (texto: string): boolean => NOMBRES_DE_EXPERIENCIA.test(texto || '');

/** Lo que se pinta como herramienta: «WeëAI» y, si se conoce, qué se hizo (ya traducido por quien llama). */
export const herramientaVisible = (aiTools: string[] | undefined, funcion?: string): string | null =>
  (aiTools || []).some(Boolean) || funcion ? [HERRAMIENTA_WEEAI, funcion].filter(Boolean).join(' · ') : null;
