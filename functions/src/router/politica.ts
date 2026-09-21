import {
  CapabilityImplementation,
  CoreCapabilityId,
  Registry,
} from '../core';

/**
 * WEË ROUTING POLICY — LA FRONTERA. Y solo la frontera.
 *
 * ── La decisión que este archivo hace cumplir ───────────────────────────────
 *
 *   LA POLÍTICA DECIDE QUÉ SE PUEDE ELEGIR.
 *   LA PUNTUACIÓN ORDENA LO QUE SE PUEDE ELEGIR.
 *   NUNCA AL REVÉS.
 *
 * S6-B midió que los dos routers de Weë no son dos implementaciones del mismo
 * criterio: son dos filosofías. El del motor obedece una CADENA que alguien
 * escribió; el del Core puntúa el registro entero. Y Weë ya había tomado
 * partido, en un comentario del propio motor: «Weë Brain pide DeepSeek; Weë
 * Chef no debe acabar ahí porque Gemini se cayera». Eso es una cadena, no una
 * puntuación.
 *
 * ── Y por qué no hay una línea nueva en el Core ─────────────────────────────
 *
 * Porque el Core ya tenía la frontera. `crearRouter` pregunta al registro qué
 * implementa una capacidad, filtra por elegibilidad —estado, salud, idioma,
 * región, modalidad, duración, calidad, presupuesto— y solo DESPUÉS puntúa lo
 * que quedó. Lo único que faltaba era poder decirle «estos y solo estos».
 *
 * Así que eso es lo que hay aquí: un REGISTRO ENVUELTO. El Router no se
 * entera, no cambia, no se toca — sigue creyendo que pregunta al registro de
 * siempre, y el registro le contesta lo que la política permite. Un contrato
 * público cerrado y desplegado (`core/router.ts`) se queda exactamente como
 * estaba, que es lo que S6-C exigía comprobar antes de tocarlo.
 *
 * ── Lo que este archivo NO hace ─────────────────────────────────────────────
 *
 * No puntúa. No reintenta. No ejecuta. No cobra. No abre libro. No conoce
 * `aiGenerations`. No lee el texto de nadie. No es dueño de la salud ni de la
 * cuota: las RECIBE ya decididas y las expresa en el único sitio donde el Core
 * ya las mira — la ficha del proveedor en el registro.
 */

/* ── La cadena ────────────────────────────────────────────────────────────── */

/**
 * UN ESLABÓN. Un proveedor, y opcionalmente un modelo suyo.
 *
 * Sin modelo significa «cualquiera de los suyos que sirva»: la política acota
 * QUIÉN, y cuál de sus modelos lo sigue decidiendo la puntuación del Core.
 */
export interface EslabonDeCadena {
  providerId: string;
  modelId?: string;
}

/**
 * LA CADENA DE UNA CAPACIDAD. En orden, y el orden significa algo.
 *
 * Vacía NO es lo mismo que ausente. Ausente = «esta capacidad no tiene
 * política, que decida la puntuación sobre todo el registro». Vacía = «para
 * esta capacidad no hay nadie permitido», y entonces no hay decisión. Sin esa
 * distinción, un error de configuración que dejara una lista a cero abriría el
 * registro entero en vez de cerrarlo, que es exactamente al revés de como
 * tiene que fallar una frontera.
 */
export type CadenasDeRuteo = Readonly<Record<string, readonly EslabonDeCadena[]>>;

/* ── Lo que la política recibe ya decidido ────────────────────────────────── */

/**
 * POR QUÉ UN PROVEEDOR NO SE PUEDE USAR AHORA MISMO.
 *
 * Y fíjate en que esto ENTRA, no se calcula. Quién está en pausa lo sabe el
 * cortacircuitos del motor; quién agotó su cuota lo sabe quien cuenta el uso
 * diario. Ninguna de las dos cosas es del Router, y este archivo no las
 * convierte en suyas: las traduce al vocabulario que el registro ya tiene.
 */
export interface EstadoDeProveedor {
  /** En pausa por fallos recientes. Lo decide el cortacircuitos, no esto. */
  enPausa?: (providerId: string) => boolean;
  /** Sin cuota para hoy. Lo decide la política de límites, no esto. */
  sinCuota?: (providerId: string) => boolean;
}

export interface PoliticaDeRuteo extends EstadoDeProveedor {
  cadenas?: CadenasDeRuteo;
}

/* ── El registro, envuelto ────────────────────────────────────────────────── */

const MOTIVO_EN_PAUSA = 'en pausa por fallos recientes';
const MOTIVO_SIN_CUOTA = 'sin cuota para hoy';

/**
 * UN PROVEEDOR MARCADO COMO NO DISPONIBLE, sin tocar el registro de verdad.
 *
 * El Core ya rechaza `health.state === 'UNAVAILABLE'` en `puedeEjecutarse`, y
 * lo hace ANTES de puntuar. Así que decirlo aquí es decirlo en el sitio donde
 * el Core ya mira, y no hace falta que el Router aprenda dos conceptos nuevos.
 */
const caido = (impl: CapabilityImplementation, motivo: string): CapabilityImplementation => ({
  ...impl,
  provider: { ...impl.provider, health: { state: 'UNAVAILABLE', reason: motivo } },
});

/**
 * ¿ESTE CANDIDATO ESTÁ EN LA CADENA?
 *
 * Un eslabón sin modelo admite cualquier modelo de ese proveedor. Con modelo,
 * solo ese. La comparación es por identidad exacta: aquí no hay parecidos.
 */
const enLaCadena = (impl: CapabilityImplementation, cadena: readonly EslabonDeCadena[]): number =>
  cadena.findIndex((e) => e.providerId === impl.provider.id && (e.modelId === undefined || e.modelId === impl.model.id));

/**
 * EL REGISTRO QUE LA POLÍTICA DEJA VER.
 *
 * ── Qué hace, en tres frases ────────────────────────────────────────────────
 *
 * 1 · Si la capacidad tiene cadena, lo que no esté en ella NO SE DEVUELVE. No
 *     se devuelve peor puntuado, ni con un aviso: no se devuelve. Una
 *     puntuación de 0,99 no puede elegir a quien la política no dejó entrar,
 *     porque el Router nunca llega a verlo.
 * 2 · Lo que sí está se devuelve EN EL ORDEN DE LA CADENA. El Core ordena
 *     después por puntuación, así que ese orden solo decide los empates — pero
 *     los decide a favor de quien la cadena puso antes.
 * 3 · Lo que está en pausa o sin cuota se devuelve MARCADO como caído, y el
 *     Core lo descarta él solo con la regla que ya tenía.
 *
 * ── Y todo lo demás se delega ───────────────────────────────────────────────
 *
 * Los otros nueve métodos del registro pasan tal cual. Envolver no es
 * reimplementar: si esto empezara a tener su propia idea de qué modelos hay,
 * sería un segundo registro, y eso es justo lo que no puede existir.
 */
export const registroConPolitica = (registro: Registry, politica: PoliticaDeRuteo = {}): Registry => {
  const cadenaDe = (capability: CoreCapabilityId): readonly EslabonDeCadena[] | undefined =>
    politica.cadenas ? politica.cadenas[String(capability)] : undefined;

  const filtrar = (
    capability: CoreCapabilityId,
    implementaciones: readonly CapabilityImplementation[],
  ): readonly CapabilityImplementation[] => {
    const cadena = cadenaDe(capability);
    /* Sin cadena declarada, la política no acota nada: el Core ve el registro entero. */
    const dentro = cadena === undefined
      ? implementaciones.map((impl) => ({ impl, puesto: 0 }))
      : implementaciones
        .map((impl) => ({ impl, puesto: enLaCadena(impl, cadena) }))
        .filter((x) => x.puesto >= 0)
        .sort((a, b) => a.puesto - b.puesto);

    return dentro.map(({ impl }) =>
      (politica.enPausa?.(impl.provider.id) ? caido(impl, MOTIVO_EN_PAUSA)
        : politica.sinCuota?.(impl.provider.id) ? caido(impl, MOTIVO_SIN_CUOTA)
          : impl));
  };

  return {
    ...registro,
    getCapabilityImplementations: (capability) => filtrar(capability, registro.getCapabilityImplementations(capability)),
    findImplementations: (capability) => filtrar(capability, registro.findImplementations(capability)),
    /*
     * Y lo que se puede servir HOY se recalcula sobre lo que la política deja
     * ver. Si no, una capacidad cuya cadena entera está en pausa seguiría
     * apareciendo como disponible, y quien preguntara —el Planner, por
     * ejemplo— planificaría algo que después no se puede enrutar.
     */
    capabilitiesDisponibles: () => registro.capabilitiesDisponibles().filter((c) => filtrar(c, registro.findImplementations(c)).length > 0),
  };
};
