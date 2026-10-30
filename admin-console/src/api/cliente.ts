import { ACCIONES, ESTADOS_DE_CREACION, ESTADOS_DE_REPORTE, ESTADOS_DE_TRABAJO, EXPERIENCIAS_CON_SERVIDOR, FORMA_DE_ID_DE_REPORTE, LIMITE_MAXIMO, NombreDeAccion, ParametrosPorAccion } from './acciones';
import { ErrorDeAdmin, clasificarError } from './errores';

/*
 * EL CLIENTE DE LA CONSOLA: la única puerta hacia el servidor.
 *
 * Recibe un `invocar(callable, datos)` —en producción, `httpsCallable` (ver `firebase.ts`); en las pruebas, un
 * doble— y sobre él ofrece `llamar(accion, parametros)`. Qué hace de más que pasarlo:
 *   · rechaza cualquier acción que no esté en `ACCIONES` (también si alguien se salta los tipos);
 *   · copia SOLO los parámetros declarados para esa acción: nada más viaja;
 *   · pone `action` el último, para que ningún parámetro pueda cambiarlo;
 *   · valida lo que el servidor también valida, para fallar sin red con un error del tipo `argumento`;
 *   · convierte cualquier fallo en un `ErrorDeAdmin` (ver `errores.ts`).
 */
export type Invocador = (callable: string, datos: Record<string, unknown>) => Promise<unknown>;

export interface ClienteDeAdmin {
  llamar<A extends NombreDeAccion>(accion: A, parametros?: ParametrosPorAccion[A]): Promise<unknown>;
}

const argumentoInvalido = (campo: string) => new ErrorDeAdmin('argumento', `cliente:${campo}`);

const validar = (nombre: string, valor: unknown): unknown => {
  switch (nombre) {
    case 'userId': {
      if (typeof valor !== 'string') throw argumentoInvalido('userId');
      const limpio = valor.trim();
      if (!limpio || limpio.length > 200 || /[/\s]/.test(limpio)) throw argumentoInvalido('userId');
      return limpio;
    }
    case 'limit': {
      if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 1 || valor > LIMITE_MAXIMO) throw argumentoInvalido('limit');
      return valor;
    }
    case 'status': {
      if (typeof valor !== 'string' || !(ESTADOS_DE_REPORTE as readonly string[]).includes(valor)) throw argumentoInvalido('status');
      return valor;
    }
    case 'uid': {
      if (typeof valor !== 'string') throw argumentoInvalido('uid');
      const limpio = valor.trim();
      if (!limpio || limpio.length > 200 || /[/\s]/.test(limpio)) throw argumentoInvalido('uid');
      return limpio;
    }
    case 'numeroDeCuenta': {
      if (typeof valor !== 'string' || !/^[\d\s.-]{9,15}$/.test(valor)) throw argumentoInvalido('numeroDeCuenta');
      return valor;
    }
    case 'estado': {
      if (typeof valor !== 'string' || !([...ESTADOS_DE_TRABAJO, ...ESTADOS_DE_CREACION] as readonly string[]).includes(valor)) throw argumentoInvalido('estado');
      return valor;
    }
    case 'experiencia': {
      if (typeof valor !== 'string' || !(EXPERIENCIAS_CON_SERVIDOR as readonly string[]).includes(valor)) throw argumentoInvalido('experiencia');
      return valor;
    }
    case 'minutos': {
      if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 5 || valor > 43_200) throw argumentoInvalido('minutos');
      return valor;
    }
    case 'dia': {
      if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw argumentoInvalido('dia');
      return valor;
    }
    case 'cursor': {
      if (typeof valor !== 'string' || !/^j\.[A-Za-z0-9_.:-]{1,400}$/.test(valor)) throw argumentoInvalido('cursor');
      return valor;
    }
    case 'reportId': {
      if (typeof valor !== 'string' || !FORMA_DE_ID_DE_REPORTE.test(valor)) throw argumentoInvalido('reportId');
      return valor;
    }
    default:
      throw argumentoInvalido(nombre);
  }
};

export const crearCliente = (invocar: Invocador): ClienteDeAdmin => ({
  async llamar(accion, parametros) {
    if (!Object.prototype.hasOwnProperty.call(ACCIONES, accion)) throw new ErrorDeAdmin('argumento', 'cliente:accion');
    const definicion = ACCIONES[accion];
    const recibidos = (parametros ?? {}) as Record<string, unknown>;

    const datos: Record<string, unknown> = {};
    for (const nombre of definicion.parametros as readonly string[]) {
      if (recibidos[nombre] !== undefined) datos[nombre] = validar(nombre, recibidos[nombre]);
    }
    if ((definicion.parametros as readonly string[]).some((p) => p === 'userId' || p === 'reportId') && datos.userId === undefined && datos.reportId === undefined) {
      throw argumentoInvalido('falta-identificador');
    }
    datos.action = definicion.accion;

    try {
      return await invocar(definicion.callable, datos);
    } catch (error) {
      throw clasificarError(error);
    }
  },
});
