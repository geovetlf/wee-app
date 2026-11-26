import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { engine } from '../engine';
import { ADAPTERS } from '../engine/registry';
import { loadConfig } from '../engine/config';
import { esEntornoDePruebas } from './entorno';

/*
 * LA SALUD DE WEË PARA LA AUTONOMÍA (docs/AUTONOMIA.md, pase: «si Weë falla, esas
 * horas no cuentan»).
 *
 * El reloj del pase se para cuando Weë no puede hacer lo que el dueño pagó. Antes el
 * ciclo daba a Weë por sana siempre; ahora mira tres cosas, sin llamar a ninguna IA:
 *
 *   1. que el proveedor de texto del personaje (DeepSeek, el de Weë Brain) esté
 *      configurado —o que el motor admita el modo simulado, en desarrollo— y no
 *      esté apagado en `aiProviders`;
 *   2. que el cortacircuitos del motor no lo tenga en pausa (en esta instancia);
 *   3. que las últimas acciones del personaje no vengan fallando seguidas: el
 *      registro `characterAutonomyHealth/texto` cuenta los fallos seguidos (lo
 *      escriben las acciones al pensar) y, pasado el umbral, Weë está «enferma»
 *      hasta que pasa un rato sin fallos nuevos o una acción sale bien.
 *
 * Si no se puede leer el registro, cuenta como sana: un fallo de lectura no debe
 * congelar el reloj de todos (las propias acciones devolverán su reserva si fallan).
 */

export const PROVEEDOR_DEL_PERSONAJE = 'deepseek';
export const FALLOS_SEGUIDOS_PARA_PARAR = 5;
/** Tras el último fallo, cuánto se espera para volver a intentar (medio abierto). */
export const ESPERA_TRAS_FALLOS_MS = 15 * 60_000;

export interface SenalesDeSalud {
  configurado: boolean;
  simuladoPermitido: boolean;
  habilitado: boolean;
  cortacircuitosAbierto: boolean;
  fallosSeguidos: number;
  ultimoFalloEn: number | null;
}

/** ¿Está Weë en condiciones de que el personaje actúe? Puro. */
export function weeSanoDesde(s: SenalesDeSalud, ahora: number): boolean {
  if (!s.habilitado) return false;
  if (!s.configurado && !s.simuladoPermitido) return false;
  if (s.cortacircuitosAbierto) return false;
  if (s.fallosSeguidos >= FALLOS_SEGUIDOS_PARA_PARAR && s.ultimoFalloEn !== null && ahora - s.ultimoFalloEn < ESPERA_TRAS_FALLOS_MS) return false;
  return true;
}

const registro = () => getFirestore().collection('characterAutonomyHealth').doc('texto');

/** Las acciones anotan aquí cómo les fue al pensar. Nunca rompe a quien llama. */
export async function anotarResultadoDelTexto(ok: boolean): Promise<void> {
  try {
    await registro().set(ok ? { fallosSeguidos: 0, ultimoExitoEn: Date.now() } : { fallosSeguidos: FieldValue.increment(1), ultimoFalloEn: Date.now() }, { merge: true });
  } catch (error) {
    console.warn('Autonomía: no se pudo anotar la salud del texto', error);
  }
}

/** La salud real, para el ciclo (`depsDeFirestore().weeSano`). */
export async function weeSanoParaLaAutonomia(): Promise<boolean> {
  try {
    const [settings, config, snap] = await Promise.all([engine.settings(), loadConfig(), registro().get()]);
    const conf = config.providers[PROVEEDOR_DEL_PERSONAJE];
    const d = snap.exists ? snap.data() || {} : {};
    return weeSanoDesde({
      configurado: Boolean(ADAPTERS[PROVEEDOR_DEL_PERSONAJE]?.isConfigured()),
      // El modo simulado solo cuenta como «sano» en pruebas: en producción, sin el proveedor real, el reloj se para.
      simuladoPermitido: Boolean(settings.allowMockFallback) && esEntornoDePruebas(),
      habilitado: conf ? conf.enabled !== false : true,
      cortacircuitosAbierto: engine.health.isOpen(PROVEEDOR_DEL_PERSONAJE),
      fallosSeguidos: Number(d.fallosSeguidos) || 0,
      ultimoFalloEn: typeof d.ultimoFalloEn === 'number' ? d.ultimoFalloEn : null,
    }, Date.now());
  } catch (error) {
    console.warn('Autonomía: no se pudo medir la salud; se da por sana', error);
    return true;
  }
}
