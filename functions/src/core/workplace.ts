import { CapabilityId, Modality } from './capability';
import { WORKPLACE_CONTRACT_VERSION } from './contracts';

/**
 * WEE CORE — MANIFIESTO DE WORKPLACE.
 *
 * ── El hueco que llena ──────────────────────────────────────────────────────
 *
 * Hoy una experiencia se declara dos veces y ninguna de las dos dice lo que
 * sabe hacer:
 *
 *   · `constants/weeExperiences.ts` (cliente) — icono, emoji, claves i18n,
 *     palabras de búsqueda. Presentación pura. Sin capacidades.
 *   · `functions/src/creator/templates.ts` (servidor) — 1911 líneas con las
 *     preguntas y el plan de cada una. Ahí sí está el saber, pero enterrado en
 *     código imperativo que solo entiende `creatorChat`.
 *
 * Entre las dos no hay contrato: el cliente manda un `experienceId` que es
 * `string` suelto —un `experienceId` con errata compila— y el servidor decide
 * todo lo demás. Nada declara qué capacidades usa Weë Design, qué admite de
 * entrada o qué devuelve.
 *
 * ── Para qué sirve declararlo ───────────────────────────────────────────────
 *
 * Para que los Workplaces usen el MISMO Core sin duplicarlo. Cuando un
 * Workplace declara `capabilities`, el router sabe qué puede necesitar, el
 * presupuesto se puede estimar antes de preguntar nada, y la pantalla puede
 * ofrecer adjuntar un vídeo solo donde tiene sentido — sin que nadie escriba un
 * `if workplace === 'design'` en el Core.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No sustituye a `weeExperiences.ts` ni a `templates.ts`, y no se migra nada en
 * esta fase. Es la forma que tendrá esa declaración cuando se unifique.
 */

/** Por dónde puede entrar el material en un Workplace. */
export type WorkplaceInputMode = 'text' | 'image' | 'video' | 'audio' | 'document' | 'reference' | 'camera' | 'voice';

/** Lo que un Workplace necesita saber antes de poder trabajar. */
export interface ContextRequirement {
  /** 'project' | 'selectedAsset' | 'businessProfile'… */
  key: string;
  required: boolean;
  note?: string;
}

/**
 * LO QUE UN WORKPLACE DECLARA DE SÍ MISMO.
 *
 * Fíjate en lo que no hay: ni proveedores, ni modelos, ni precios. Un Workplace
 * dice QUÉ necesita conseguir; con qué se consigue es del Core. Ese es el
 * límite que impide que Weë Design vuelva a saber quién es su proveedor de 3D.
 */
export interface WorkplaceManifest {
  id: string;
  /** Nombre de marca. No se traduce nunca. */
  name: string;
  version: string;
  contract: typeof WORKPLACE_CONTRACT_VERSION;
  /** Capacidades que este Workplace puede llegar a pedir. */
  capabilities: readonly CapabilityId[];
  /** Modalidades que admite de entrada. */
  accepts: readonly WorkplaceInputMode[];
  /** Modalidades que puede devolver. */
  produces: readonly Modality[];
  /** Ids de workflows que sabe montar. Vacío mientras los planes vivan en plantillas. */
  workflows?: readonly string[];
  context?: readonly ContextRequirement[];
  /** Límites propios: duración máxima, número de variantes… */
  constraints?: Record<string, unknown>;
}

/** ¿Puede este Workplace atender una capacidad? */
export const declaraCapacidad = (manifest: WorkplaceManifest, capability: CapabilityId): boolean =>
  manifest.capabilities.includes(capability);

/**
 * Capacidades que un Workplace declara y el registro no puede servir.
 *
 * Es la comprobación que convierte el manifiesto en algo útil y no en
 * documentación: si Weë Music declara `music.generate` y ningún proveedor la
 * implementa, más vale saberlo al arrancar que cuando alguien pulse el botón.
 */
export const capacidadesSinCobertura = (
  manifest: WorkplaceManifest,
  disponibles: readonly CapabilityId[],
): readonly CapabilityId[] => manifest.capabilities.filter((c) => !disponibles.includes(c));
