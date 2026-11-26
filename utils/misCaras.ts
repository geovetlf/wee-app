/**
 * LAS CARAS DE LA SESIÓN, PARA QUIEN NO VIVE EN REACT (plan de alter egos, F6, 2026-11-23).
 *
 * Una cuenta tiene su Perfil Real y hasta cinco alter egos. Los alter egos
 * nuevos tienen un id OPACO (`ent_…`): no se puede deducir de la cuenta, así que
 * los servicios —ẄContact, la denuncia, MyWeës…— no pueden saber cuáles son tuyos
 * mirando la forma del id. Los sabe `UserProfileContext`, que los LEE del
 * servidor (`entities` de la cuenta); aquí los deja apuntados para que un
 * servicio pueda preguntar «¿esta cara es mía?» sin importar React.
 *
 * Es una COMODIDAD del cliente para pintar bien, nunca una autorización: quien
 * decide de quién es una cara es el servidor (reglas y callables), leyendo la
 * entidad. Por eso aquí no se guarda nada en disco ni se decide nada.
 */
import { identidadesDeCuenta } from './econtactModel';

let cuentaApuntada: string | null = null;
let alterEgosApuntados: string[] = [];

/** Lo llama `UserProfileContext` cada vez que cambian la sesión o sus alter egos. */
export const apuntarMisCaras = (cuenta: string | null, alterEgos: string[]): void => {
  cuentaApuntada = cuenta;
  alterEgosApuntados = cuenta ? [...new Set(alterEgos.filter((id) => typeof id === 'string' && !!id && id !== cuenta))] : [];
};

/** Todas las caras de la cuenta: el Perfil Real, la heredada (`hidi_<cuenta>`) y los alter egos que se conocen. */
export const misCaras = (cuenta: string | null | undefined): string[] => {
  const base = identidadesDeCuenta(cuenta);
  if (!cuenta || cuenta !== cuentaApuntada) return base;
  return [...new Set([...base, ...alterEgosApuntados])];
};

/** ¿Esta cara es de la cuenta de la sesión? */
export const esCaraMia = (id: string | null | undefined, cuenta: string | null | undefined): boolean =>
  !!id && misCaras(cuenta).includes(id);
