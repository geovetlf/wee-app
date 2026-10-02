/*
 * EL CATÁLOGO DE REGLAS DETERMINISTAS DEL REVISOR DE WEË.
 *
 * Cada regla tiene un `id` `<dominio>/<regla>`, una `version` (sube cuando cambia lo que detecta: la baseline
 * guarda con qué versión se generó y una versión nueva cuenta como regla nueva), la fecha `desde` en que entró,
 * su severidad por defecto, la zona que la vigila y qué hace. Los detectores viven en `detectores.mjs`; aquí solo
 * está el contrato, para que la baseline, el selector y los revisores hablen de lo mismo.
 *
 * Severidades, de más a menos: bloqueante (no se cierra una fase con ella), alta (se decide antes de cerrar),
 * media (se anota y se planifica), baja (inventario). Inflarlas destruye la confianza en el revisor: cada una se
 * eligió por lo que rompe, no por lo que molesta.
 *
 * `tipo: 'disparador'` no produce hallazgos: avisa al selector de que una revisión humana o de IA tiene que mirar
 * (una carpeta nueva, una arista nueva entre capas, una zona roja tocada).
 */

export const SEVERIDADES = ['bloqueante', 'alta', 'media', 'baja'];

/** El umbral de `tamano/*`. */
export const LIMITE_DE_LINEAS = 1000;

export const REGLAS = [
  {
    id: 'tamano/archivo-mil-lineas', version: 1, desde: '2026-10-01', severidad: 'baja', zona: 'arquitectura',
    descripcion: 'Archivo de código con más de 1000 líneas: inventario de lo que ya es demasiado grande.',
  },
  {
    id: 'tamano/cruza-mil-lineas', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'arquitectura', requiereBase: true,
    descripcion: 'El archivo tenía 1000 líneas o menos en la base (o no existía) y ahora pasa de 1000: crecimiento que hay que decidir.',
  },
  {
    id: 'tipos/any', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'codigo',
    descripcion: 'Cuenta de `any` por archivo TypeScript. Con baseline solo es NUEVO si la cuenta sube (delta de any).',
  },
  {
    id: 'web/alert-con-botones', version: 1, desde: '2026-10-01', severidad: 'alta', zona: 'codigo',
    descripcion: '`Alert.alert` con lista de botones fuera de un archivo .native/.ios/.android: en la web no muestra nada y los botones no corren nunca (usar utils/notify.ts).',
  },
  {
    id: 'web/alert-sin-boton', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'codigo',
    descripcion: '`Alert.alert` sin lista de botones en un camino que corre en la web: React Native Web lo deja en una función vacía y el aviso no se ve (usar notify de utils/notify.ts). Con lista de botones es `web/alert-con-botones`.',
  },
  {
    id: 'ia/host-fuera-de-adaptador', version: 1, desde: '2026-10-01', severidad: 'alta', zona: 'ia',
    descripcion: 'Host de un proveedor de IA o SDK de IA fuera de functions/src/engine/providers (CLAUDE.md §6: una IA, un adaptador).',
  },
  {
    id: 'higiene/import-sin-seguimiento', version: 1, desde: '2026-10-01', severidad: 'bloqueante', zona: 'higiene',
    descripcion: 'Import relativo, require o import() literal que resuelve a un archivo que git no sigue o que no existe: el commit saldría roto.',
  },
  {
    id: 'muerto/modulo-sin-importador', version: 1, desde: '2026-10-01', severidad: 'baja', zona: 'arquitectura',
    descripcion: 'Módulo de la app o de Functions al que no llega nadie desde App.tsx, index.ts o functions/src/index.ts.',
  },
  {
    id: 'ciclos/import-ciclico', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'arquitectura',
    descripcion: 'Ciclo de imports de VALOR (los de solo tipos no cuentan): componentes fuertemente conexos del grafo.',
  },
  {
    id: 'errores/catch-traga', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'codigo',
    descripcion: 'catch vacío o `.catch(() => {}|undefined|null)`: el error desaparece sin rastro. Media en functions/src, baja en el cliente.',
  },
  {
    id: 'escala/consulta-sin-limite', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'codigo',
    descripcion: 'Consulta de colección sin `limit`: getDocs(collection|query) en el cliente; cadena admin .collection(...).get() en el servidor.',
  },
  {
    id: 'react/intervalo-sin-limpieza', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'codigo',
    descripcion: 'setInterval cuyo identificador no llega a clearInterval en la limpieza de un useEffect del mismo archivo.',
  },
  {
    id: 'i18n/texto-a-mano-fuera-de-pantallas', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'i18n',
    descripcion: 'Frase escrita a mano pasada a un setter de estado, Alert.alert, notify o throw new Error en hooks/, contexts/, services/ o utils/ (CLAUDE.md §8).',
  },
  {
    id: 'tests/suite-huerfana', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'tests',
    descripcion: 'functions/test/*.test.mjs que no está en `scripts.test` de functions/package.json: nadie la ejecuta.',
  },
  {
    id: 'tests/aserto-siempre-verdadero', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'tests',
    descripcion: '`check(texto, true)` con `true` literal fuera de un envoltorio (try, noLanza, acepta) o `|| true` en la condición de un check.',
  },
  {
    id: 'reglas/cambio-peligroso', version: 1, desde: '2026-10-01', severidad: 'bloqueante', zona: 'seguridad', requiereBase: true,
    descripcion: 'firestore.rules/storage.rules: escritura abierta añadida (`allow write… if true` o sin condición) —bloqueante— o condición de auth retirada —alta—.',
  },
  {
    id: 'frontera/cambio', version: 1, desde: '2026-10-01', severidad: 'media', zona: 'arquitectura', requiereBase: true, tipo: 'disparador',
    descripcion: 'DISPARADOR, no hallazgo: carpeta nueva en functions/src, arista nueva entre carpetas, exports de functions/src/index.ts cambiados o zona roja tocada.',
  },
];

export const reglaPorId = new Map(REGLAS.map((r) => [r.id, r]));

/** Las reglas que producen hallazgos (los disparadores van aparte). */
export const REGLAS_DE_HALLAZGO = REGLAS.filter((r) => r.tipo !== 'disparador');

/** `{ id: version }`: lo que la baseline guarda para saber con qué reglas se generó. */
export const versionesDeReglas = () => Object.fromEntries(REGLAS_DE_HALLAZGO.map((r) => [r.id, r.version]));

/** ¿`id` está dentro de la selección `--solo` (ids exactos o dominios `tipos`, `tipos/`)? */
export const dentroDeSolo = (id, solo) =>
  !solo || solo.some((s) => s === id || id.startsWith(s.endsWith('/') ? s : `${s}/`));

/**
 * Zonas rojas: tocarlas dispara siempre una revisión (y `frontera/cambio`). Lo que mueve dinero, permisos,
 * puertas, despliegue y la superficie pública.
 */
export const ZONAS_ROJAS = [
  'firestore.rules',
  'storage.rules',
  'functions/src/credits/**',
  'functions/src/payments/**',
  'functions/src/financial/**',
  'functions/src/settlement/**',
  'functions/src/core/financial/**',
  'functions/src/runtime/**',
  'functions/src/engine/router.ts',
  'functions/src/engine/registry.ts',
  'functions/src/engine/providers/**',
  'functions/src/index.ts',
  'functions/src/secrets.ts',
  '.claude/**',
  '.github/**',
  'ops/**',
  'firebase.json',
  'public/**',
];
