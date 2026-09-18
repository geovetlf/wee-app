import { PROVIDER_CONTRACT_VERSION } from '../core/contracts';
import { RegisteredProvider } from '../core/registry';

/**
 * MATRICES DECLARADAS Y TODAVÍA NO INTEGRADAS.
 *
 * ── Qué es una matriz ───────────────────────────────────────────────────────
 *
 * Quien entrena y sirve sus propios modelos, y a quien Weë llama por su API
 * oficial directa. Nunca un intermediario, un agregador ni un revendedor. El
 * motivo no es purismo: un intermediario añade un salto que Weë no controla —su
 * disponibilidad, su latencia, su margen, sus límites y su criterio para decidir
 * qué modelo te toca—, y cuando algo falle Weë quiere saber de quién es la
 * culpa.
 *
 * ── Por qué están aquí si no están integradas ───────────────────────────────
 *
 * Porque «está en la lista de deseos» y «está integrado» son dos estados
 * distintos, y un sistema que no los distingue acaba prometiendo lo primero
 * como si fuera lo segundo. Registrarlas en `PENDING` deja escrito qué se está
 * mirando sin que el router pueda elegirlas ni por accidente.
 *
 * ── LO QUE NO SE DECLARA, Y ES DELIBERADO ───────────────────────────────────
 *
 * Ni modelos, ni capacidades, ni endpoints, ni precios, ni límites, ni nombres
 * de variable de credencial. Nada de eso consta en este repositorio, y
 * escribirlo de memoria sería inventarlo: exactamente el error que produce una
 * integración que falla el día que alguien confía en ella.
 *
 * Cuando una de estas se integre de verdad, el camino es siempre el mismo:
 *
 *     API oficial → adaptador → proveedor → modelos → capacidades → router
 *
 * y ninguno de esos pasos toca un Workplace.
 *
 * ── Una precisión que evita un error caro ───────────────────────────────────
 *
 * ElevenLabs YA está integrado, pero solo para VOZ: sus tres modelos declaran
 * `voice.tts` y nada más. «Eleven Music» es un producto distinto y sería una
 * integración nueva, no una capacidad que se le añade al adaptador existente.
 * Por eso aparece aquí abajo con su propio id.
 */

const pendiente = (id: string, name: string, note: string): RegisteredProvider => ({
  id,
  name,
  type: 'matrix',
  status: 'PENDING',
  contract: PROVIDER_CONTRACT_VERSION,
  /* Vacías a propósito: una matriz sin integrar no puede prometer nada. La
   * validación del registro rechaza un PENDING que declare capacidades. */
  modalities: [],
  capabilities: [],
  health: { state: 'UNKNOWN' },
  note,
});

/**
 * Las que están sobre la mesa hoy (decisión de producto del usuario, 2026-09-18).
 *
 * El orden es el de la conversación, no una prioridad.
 */
export const MATRICES_PENDIENTES: readonly RegisteredProvider[] = [
  /* ── 3D ──────────────────────────────────────────────────────────────────
   * TRIPO ES UNA IMPLEMENTACIÓN DE 3D, NO EL 3D DE WEË, y tampoco es render.
   * Esto conviene dejarlo escrito porque es el atajo mental que más cuesta
   * deshacer después: `3d.generate` y `render.architecture` son capacidades
   * distintas en el catálogo, y el día que haya un motor de render
   * especializado entra sin tocar nada de 3D. */
  pendiente('tripo', 'Tripo', 'Candidata para capacidades 3D. Nada verificado todavía: sin modelos ni endpoints en este repositorio.'),
  pendiente('hunyuan3d', 'Hunyuan 3D (Tencent)', 'Candidata para capacidades 3D. Sin verificar.'),

  /* ── VISUAL ──────────────────────────────────────────────────────────── */
  pendiente('qwen', 'Qwen (Alibaba)', 'Candidata para capacidades visuales y de texto. Sin verificar.'),
  pendiente('wan', 'Wan (Alibaba)', 'Candidata para capacidades visuales. Sin verificar.'),

  /* ── MÚSICA ──────────────────────────────────────────────────────────────
   * Weë Music lleva pausada desde que se decidió no depender de un proveedor
   * sin API oficial con licencia comercial. Estas dos son las candidatas; el
   * hueco que ocupan hoy es el adaptador `music-pending`, que está desactivado
   * y falla a propósito en vez de fingir que genera algo. */
  pendiente('yinchao', 'Yinchao / 音潮', 'Candidata para capacidades de música. Sin verificar.'),
  pendiente('eleven-music', 'Eleven Music', 'Candidata para música. NO es el adaptador `elevenlabs`, que solo hace voz: sería una integración aparte.'),
];
