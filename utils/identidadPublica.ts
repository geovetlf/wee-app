/**
 * CÓMO SE NOMBRA UN PERFIL HACIA FUERA (Fase 11.x-6).
 *
 * ── El fallo que esto corrige ──────────────────────────────────────────────
 *
 * Hasta hoy, la dirección pública de un perfil era su `uid`. Para el Perfil
 * Real eso es el identificador de la cuenta; para el Perfil Weë, el
 * identificador heredado, que lleva la cuenta dentro. Resultado:
 *
 *     wee.zone/user/<forma heredada del uid de la cuenta>
 *
 * Cualquiera que viera el enlace de una cara Weë —en una publicación, en un
 * aviso, copiando la barra de direcciones— podía quitarle el prefijo y abrir
 * el Perfil Real de esa misma persona. La cara anónima dejaba de serlo por el
 * camino más tonto posible: por su propia URL.
 *
 * ── El arreglo, y por qué NO es esconder mejor el uid ──────────────────────
 *
 * El arreglo no es ofuscar. Es que el uid NO SEA la identidad pública. Cada
 * cara tiene desde la Fase 11.x-5 una ENTIDAD con identificador propio,
 * sorteado y opaco —`ent_` y 26 caracteres— que no lleva dentro ni la cuenta,
 * ni su número, ni la secuencia, ni nada de lo que se pueda tirar. Esa es la
 * referencia pública, y vale para las dos caras: el Perfil Real tampoco tiene
 * por qué enseñar el identificador de la cuenta.
 *
 * ── Lo heredado sigue funcionando ──────────────────────────────────────────
 *
 * Los enlaces que ya existen —compartidos, guardados, pegados en un mensaje—
 * siguen resolviendo por `uid`. No se rompe nada y no se migra nada: lo que
 * cambia es qué referencia se GENERA de aquí en adelante. Un perfil sin
 * entidad todavía se nombra como siempre, y el día que la tenga pasa a
 * nombrarse por ella sin que nadie tenga que hacer nada.
 */

/** La forma de un identificador de entidad: `ent_` y 26 caracteres de base 32 de Crockford. */
export const FORMA_DE_REFERENCIA_DE_ENTIDAD = /^ent_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;

export const esReferenciaDeEntidad = (v: unknown): v is string =>
  typeof v === 'string' && FORMA_DE_REFERENCIA_DE_ENTIDAD.test(v);

/** Lo poco que hace falta de un perfil para saber cómo se llama hacia fuera. */
export interface PerfilNombrable {
  uid?: string;
  /** El identificador de su entidad. Lo escribe el servidor; el cliente solo lo lee. */
  entityId?: string;
}

/**
 * LA REFERENCIA PÚBLICA DE UN PERFIL. Su entidad si la tiene; si no, lo de
 * siempre.
 *
 * Es el ÚNICO sitio donde se decide con qué nombre viaja un perfil a una URL,
 * a un parámetro de navegación o a un enlace compartido. Que sea uno solo es
 * justo lo que permite cambiar la respuesta sin ir persiguiendo call sites.
 */
export const referenciaPublicaDe = (perfil: PerfilNombrable | null | undefined): string | undefined => {
  if (!perfil || typeof perfil !== 'object') return undefined;
  if (esReferenciaDeEntidad(perfil.entityId)) return perfil.entityId;
  return typeof perfil.uid === 'string' && perfil.uid ? perfil.uid : undefined;
};

/**
 * ¿Esta referencia delata la cuenta que hay detrás?
 *
 * Sirve para poder AFIRMARLO en una prueba, no para decidir nada en caliente.
 * Una referencia de entidad no delata nunca; un `uid` delata siempre, porque
 * para el Perfil Real es la cuenta y para la cara Weë la lleva dentro.
 */
export const referenciaDelataLaCuenta = (referencia: unknown): boolean =>
  typeof referencia === 'string' && referencia.length > 0 && !esReferenciaDeEntidad(referencia);

/**
 * Cómo se resuelve una referencia: por entidad o por el `uid` de siempre.
 *
 * Quien consulte no tiene que saber cuál de las dos le ha tocado — pregunta
 * esto y usa el campo que le digan.
 */
export const campoQueResuelve = (referencia: unknown): 'entityId' | 'uid' =>
  esReferenciaDeEntidad(referencia) ? 'entityId' : 'uid';
