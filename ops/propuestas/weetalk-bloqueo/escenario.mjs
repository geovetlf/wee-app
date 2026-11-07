/*
 * EL ESCENARIO DE LAS PRUEBAS DEL BLOQUEO — compartido por la suite pura (functions/test/weetalk-bloqueo.test.mjs) y
 * por las pruebas de reglas en el emulador (reglas.prueba.mjs), para que las dos hablen de los mismos datos.
 *
 * Datos SINTÉTICOS. Ana bloquea a Beto desde su Perfil Real, viendo el Perfil Weë de Beto:
 *
 *     entrada = { caraQueBloquea: ana (Real), caraBloqueada: Beto Weë }
 *
 * De ahí, por la regla común (functions/src/social/weetalkBloqueos.ts):
 *   · ninguna cara de Beto escribe al Perfil Real de Ana          (cambiar de cara no lo evade)
 *   · ninguna cara de Ana escribe al Perfil Weë de Beto           (hasta que lo desbloquee)
 *   · Beto SÍ escribe al Perfil Weë de Ana                       (si no, Beto descubriría la otra cara de Ana)
 *   · Ana SÍ escribe al Perfil Real de Beto                      (si no, Ana descubriría la otra cara de Beto)
 *   · Carla no tiene nada que ver: escribe y le escriben como siempre.
 *
 * Las identidades van escritas tal como están en los datos (el uid de un Perfil Weë lleva el prefijo heredado): aquí
 * no se compone ninguna.
 */
export const CUENTAS = Object.freeze({ ana: 'anaCuentaW0', beto: 'betoCuentaW0', carla: 'carlaCuentaW0' });

export const CARAS = Object.freeze({
  anaReal: 'anaCuentaW0',
  anaWee: 'hidi_anaCuentaW0',
  betoReal: 'betoCuentaW0',
  betoWee: 'hidi_betoCuentaW0',
  carlaReal: 'carlaCuentaW0',
  carlaWee: 'hidi_carlaCuentaW0',
});

/** De qué cuenta es cada cara del escenario, escrito (como lo diría `users.linkedAccountId`), nunca deducido. */
export const CUENTA_DE_LA_CARA = Object.freeze({
  [CARAS.anaReal]: CUENTAS.ana,
  [CARAS.anaWee]: CUENTAS.ana,
  [CARAS.betoReal]: CUENTAS.beto,
  [CARAS.betoWee]: CUENTAS.beto,
  [CARAS.carlaReal]: CUENTAS.carla,
  [CARAS.carlaWee]: CUENTAS.carla,
});

/** El bloqueo del escenario, tal como lo guarda el servidor (sin el sello de tiempo). */
export const BLOQUEO_DE_ANA = Object.freeze({
  cuentaQueBloquea: CUENTAS.ana,
  cuentaBloqueada: CUENTAS.beto,
  entradas: Object.freeze([Object.freeze({ caraQueBloquea: CARAS.anaReal, caraBloqueada: CARAS.betoWee })]),
});

/** Los pares del índice que ese bloqueo deja escritos: «`de` no puede escribir a `para`», como `de~para`. */
export const PARES_DEL_BLOQUEO_DE_ANA = Object.freeze([
  `${CARAS.betoReal}~${CARAS.anaReal}`,
  `${CARAS.betoWee}~${CARAS.anaReal}`,
  `${CARAS.anaReal}~${CARAS.betoWee}`,
  `${CARAS.anaWee}~${CARAS.betoWee}`,
].sort());

/*
 * La ESPECIFICACIÓN, escrita aparte del código: ¿puede `de` escribir a `para`? Solo las cuatro prohibiciones de arriba;
 * todo lo demás entre las dos cuentas, sí. Lo que el dueño decidió, sin mirar cómo se implementa.
 */
export const PROHIBIDO_EN_EL_ESCENARIO = Object.freeze(new Set(PARES_DEL_BLOQUEO_DE_ANA));
