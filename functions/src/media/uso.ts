import {
  AgregadoDeUso,
  ClaveDeAgregado,
  EventoDeUso,
  Huella,
  MedidorDeUso,
  UsoMedido,
  agregarUso,
  claveDeAgregado,
  esNivel,
  sellarUso,
} from '../core';

/**
 * MC-7 · DÓNDE SE APUNTA LO MEDIDO, Y CÓMO SE SUMA SIN QUEMAR NADA.
 *
 * ── Medir no puede romper lo que mide ───────────────────────────────────────
 *
 * Un PUT que ya ocurrió, ocurrió: el proveedor lo va a cobrar tanto si la
 * medida se guarda como si no. Por eso el medidor no devuelve nada, no lanza y
 * no espera. Lo que sí hace es ACUMULAR en memoria y dejar que quien lo usa
 * decida cuándo vaciar — que es lo contrario de «dispararlo y olvidarlo».
 *
 * La diferencia importa en una Function: una escritura sin `await` se queda a
 * medias cuando la función devuelve, y entonces las medidas se pierden
 * justamente bajo carga, que es cuando más falta hacen. Acumular y volcar una
 * vez al final es una escritura esperada, no una carrera contra el runtime.
 *
 * ── Y no se depende de los logs ─────────────────────────────────────────────
 *
 *     DATO DE REGISTRO  el evento de uso guardado  ← con esto se contabiliza
 *     LOG               lo que se imprime          ← con esto se depura
 *
 * Aquí no hay un solo `console.`. Un log se rota, se trunca y se pierde, y una
 * contabilidad que dependa de él es una contabilidad que un día no cuadra sin
 * que nadie pueda decir por qué.
 */

/* ── 1 · Dónde vive cada cosa ──────────────────────────────────────────────── */

/**
 * EL PARTICIONADO, ESCRITO COMO UNA RUTA.
 *
 * La cuenta va PRIMERA, y eso es lo que hace que no exista ningún documento
 * caliente: diez millones de cuentas escriben en diez millones de subárboles
 * distintos, y el detalle de una cuenta no lo toca nadie más que ella.
 *
 * ── Lo que NO se hace, y ya existe en Weë ───────────────────────────────────
 *
 * El libro de IA lleva un agregado diario GLOBAL (`creatorUsage/{día}`) que
 * cada generación incrementa. Con el volumen de hoy funciona; con millones de
 * operaciones es un documento que se pelea consigo mismo, porque un documento
 * de Firestore admite del orden de una escritura por segundo sostenida. MC-7 no
 * repite ese patrón: **los eventos se escriben una vez cada uno, en su propia
 * clave, sin incrementar nada**, y la suma la hace después un barrido que
 * escribe el agregado UNA vez por clave.
 */
export const rutaDeEventos = (accountId: string, periodo: string): string =>
  `accounts/${accountId}/usoDeMedios/${periodo}/eventos`;

export const rutaDeAgregados = (accountId: string): string =>
  `accounts/${accountId}/agregadosDeUso`;

/* ── 2 · El medidor ────────────────────────────────────────────────────────── */

export interface MedidorAcumulado {
  medidor: MedidorDeUso;
  /** Lo sellado y todavía sin volcar. Congelado: leerlo no lo cambia. */
  pendientes(): readonly EventoDeUso[];
  /** Lo que no llegó a ser un hecho, con su motivo. Se ve; no se tira en silencio. */
  descartados(): readonly { uso: UsoMedido; motivo: 'invalido' }[];
  /** Vaciar. Devuelve cuántos se escribieron y cuántos ya estaban. */
  volcar(guardar: (e: EventoDeUso) => Promise<boolean>): Promise<{ escritos: number; yaEstaban: number; fallidos: number }>;
}

/**
 * UN MEDIDOR QUE ACUMULA Y SELLA.
 *
 * Sella al recibir, no al volcar: así una medida mal formada se ve en el acto y
 * no al final de un lote, cuando ya no se sabe cuál de las mil fue. Y como la
 * identidad es determinista, acumular DOS avisos del mismo hecho deja uno solo
 * antes siquiera de tocar la base de datos.
 */
export const crearMedidor = (huella: Huella): MedidorAcumulado => {
  const porId = new Map<string, EventoDeUso>();
  const malos: { uso: UsoMedido; motivo: 'invalido' }[] = [];

  return {
    medidor: {
      medir(uso: UsoMedido): void {
        const sellado = sellarUso(huella, uso);
        if (!sellado) { malos.push({ uso, motivo: 'invalido' }); return; }
        /*
         * En un flujo gana el primero: el hecho ya ocurrió y no mejora porque
         * alguien lo cuente otra vez. En un NIVEL gana el último, porque volver
         * a medir cuánto hay no repite un hecho: lo actualiza. Es la misma regla
         * que aplica el Core al agregar, y tiene que ser la misma en los dos
         * sitios o el total dependería de por dónde pasó la medida.
         */
        const anterior = porId.get(sellado.usageId);
        if (!anterior || (esNivel(sellado.metrica) && sellado.occurredAt > anterior.occurredAt)) {
          porId.set(sellado.usageId, sellado);
        }
      },
    },
    pendientes: () => Object.freeze([...porId.values()]),
    descartados: () => Object.freeze([...malos]),
    async volcar(guardar) {
      let escritos = 0;
      let yaEstaban = 0;
      let fallidos = 0;
      for (const e of porId.values()) {
        try {
          /* `true` = lo escribió esta llamada; `false` = ya estaba, que es convergencia. */
          if (await guardar(e)) escritos++; else yaEstaban++;
        } catch {
          /*
           * Una medida que no se pudo guardar se pierde, y se DICE. Lo que no
           * puede pasar es que el fallo suba: la operación que se midió ya
           * terminó, y tirarla por no poder apuntarla sería cobrar el trabajo
           * dos veces para poder contarlo una.
           */
          fallidos++;
        }
      }
      porId.clear();
      return { escritos, yaEstaban, fallidos };
    },
  };
};

/* ── 3 · La agregación ─────────────────────────────────────────────────────── */

/**
 * CUÁNTOS EVENTOS CABEN EN UNA PASADA DE AGREGACIÓN.
 *
 * No es un límite de producto: es el techo de memoria de una pasada. Por debajo
 * de él la agregación es exacta; por encima, **no se escribe nada** y se dice
 * `incompleto`. Escribir un total parcial sería peor que no escribirlo: un
 * agregado que miente no se distingue de uno que no.
 */
export const MAX_EVENTOS_POR_AGREGADO = 5_000;

export interface DepsDeAgregacion {
  /** Los eventos de UNA clave, por lotes y con cursor. Nunca la colección entera. */
  eventos: (
    clave: ClaveDeAgregado,
    cursor: string | undefined,
    limite: number,
  ) => Promise<{ eventos: readonly EventoDeUso[]; cursor?: string }>;
  /** Escribir el agregado. Una vez por clave, no un incremento por operación. */
  guardarAgregado: (a: AgregadoDeUso) => Promise<boolean>;
  huella: Huella;
  ahora: () => number;
  maxEventos?: number;
  /** Cuántos se piden por página. Más pequeño, más viajes; más grande, más memoria. */
  porPagina?: number;
}

export type ResultadoDeAgregacion =
  | { ok: true; agregado: AgregadoDeUso; leidos: number; escrito: boolean; ms: number }
  | { ok: false; motivo: 'clave_invalida' | 'incompleto' | 'eventos_invalidos' | 'no_guardado'; leidos: number; ms: number };

/**
 * SUMAR UN PERIODO DE UNA CUENTA EN UN PROVEEDOR, Y ESCRIBIRLO UNA VEZ.
 *
 * Recorre con cursor —nunca con desplazamiento, que a la página mil vuelve a
 * leer las mil anteriores— y solo agrega cuando ha visto el periodo entero. La
 * deduplicación, las correcciones y la diferencia entre sumar un flujo y no
 * sumar un nivel las hace el Core; aquí solo se recorre y se guarda.
 */
export const agregarPeriodo = async (
  deps: DepsDeAgregacion,
  clave: ClaveDeAgregado,
): Promise<ResultadoDeAgregacion> => {
  const empezo = deps.ahora();
  const ms = () => deps.ahora() - empezo;
  if (!claveDeAgregado(clave)) return { ok: false, motivo: 'clave_invalida', leidos: 0, ms: ms() };

  const tope = deps.maxEventos ?? MAX_EVENTOS_POR_AGREGADO;
  const porPagina = Math.max(1, Math.min(deps.porPagina ?? 500, tope));
  const reunidos: EventoDeUso[] = [];
  let cursor: string | undefined;

  do {
    const pagina = await deps.eventos(clave, cursor, porPagina);
    reunidos.push(...pagina.eventos);
    if (reunidos.length > tope) return { ok: false, motivo: 'incompleto', leidos: reunidos.length, ms: ms() };
    cursor = pagina.cursor;
  } while (cursor);

  const agregado = agregarUso(deps.huella, reunidos, clave);
  if (!agregado) return { ok: false, motivo: 'eventos_invalidos', leidos: reunidos.length, ms: ms() };

  const escrito = await deps.guardarAgregado(agregado);
  return { ok: true, agregado, leidos: reunidos.length, escrito, ms: ms() };
};
