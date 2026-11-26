/**
 * «PERSONALIZAR VOZ Y SONIDOS» (Filmmaker, 2026-11-17). Solo datos: interruptores de lo cerrado, catálogo de ejemplo y claves de `filmmakerSonido.*`.
 *
 * HONESTIDAD (lo que NO está conectado): el cliente no tiene hoy ninguna lectura del catálogo de voces del proveedor (el servidor usa una voz
 * fija o la de `ELEVENLABS_VOICE_ID`), ni un precio en Credits de la voz medido (`VOICE_USD_PER_KCHAR` es coste de proveedor, no precio). Por eso:
 * las voces de abajo son DE EJEMPLO y se rotulan así; escuchar una muestra, subir un archivo, la música y los efectos salen CERRADOS con motivo.
 */
import type { IdiomaDeVoz, TonoDeVoz, VozDelCatalogo, CapaDeSonido } from '../utils/sonidoDeFilmmaker';

/** Escuchar una muestra genera audio (consume Credits y su precio no está medido): CERRADO. Con `true` habría que conectar la generación. */
export const MUESTRA_DE_VOZ_ABIERTA = false;
/** Subir un archivo con un tono de voz exige consentimiento, verificación y servidor/proveedor sin autorizar: CERRADO; no se simula clonación. */
export const SUBIR_VOZ_ABIERTO = false;
/** Música de las escenas: depende de Weë Music, que no se conecta todavía: CERRADO. */
export const MUSICA_DE_ESCENA_ABIERTA = false;
/** Efectos de sonido: sin proveedor ni precio medido: CERRADO. */
export const EFECTOS_DE_SONIDO_ABIERTOS = false;
/** Precio en Credits de la voz medido (aiPricing del servidor). `null` = «precio por confirmar»; nunca se inventa. */
export const PRECIO_DE_VOZ_EN_CREDITS: number | null = null;
/** El catálogo viene del servidor: mientras sea `false`, las voces de abajo son de ejemplo. */
export const CATALOGO_DE_VOCES_REAL = false;

const v = (id: string, nombre: string, tono: TonoDeVoz, idioma: IdiomaDeVoz): VozDelCatalogo => ({ id, nombre, tono, idioma, ejemplo: !CATALOGO_DE_VOCES_REAL });

/** Voces PREDETERMINADAS de ejemplo (dos o tres por idioma, de tonos distintos). */
export const VOCES_PREDETERMINADAS: readonly VozDelCatalogo[] = [
  v('ej_es_aurora', 'Aurora', 'warm', 'es'),
  v('ej_es_bruno', 'Bruno', 'deep', 'es'),
  v('ej_es_clara', 'Clara', 'clear', 'es'),
  v('ej_es_dario', 'Darío', 'narrator', 'es'),
  v('ej_en_ivy', 'Ivy', 'soft', 'en'),
  v('ej_en_jack', 'Jack', 'deep', 'en'),
  v('ej_en_nora', 'Nora', 'warm', 'en'),
  v('ej_en_owen', 'Owen', 'narrator', 'en'),
  v('ej_pt_luana', 'Luana', 'soft', 'pt'),
  v('ej_pt_tiago', 'Tiago', 'clear', 'pt'),
  v('ej_fr_camille', 'Camille', 'warm', 'fr'),
  v('ej_fr_louis', 'Louis', 'deep', 'fr'),
];

export const CLAVE_DE_TONO_DE_VOZ: Record<TonoDeVoz, string> = {
  warm: 'filmmakerSonido.toneWarm', deep: 'filmmakerSonido.toneDeep', clear: 'filmmakerSonido.toneClear', soft: 'filmmakerSonido.toneSoft', narrator: 'filmmakerSonido.toneNarrator',
};
export const CLAVE_DE_IDIOMA_DE_VOZ: Record<IdiomaDeVoz, string> = {
  es: 'filmmakerSonido.langEs', en: 'filmmakerSonido.langEn', pt: 'filmmakerSonido.langPt', fr: 'filmmakerSonido.langFr',
};
export const CLAVE_DE_CAPA: Record<CapaDeSonido, string> = {
  voice: 'filmmakerSonido.layerVoice', music: 'filmmakerSonido.layerMusic', effects: 'filmmakerSonido.layerEffects',
};
export const CLAVE_DE_SUBTITULO: Record<'character' | 'scene' | 'shot', string> = {
  character: 'filmmakerSonido.subCharacter', scene: 'filmmakerSonido.subScene', shot: 'filmmakerSonido.subShot',
};
export const CLAVE_DE_ORIGEN: Record<'character' | 'scene' | 'auto', string> = {
  character: 'filmmakerSonido.originCharacter', scene: 'filmmakerSonido.originScene', auto: 'filmmakerSonido.originAuto',
};
