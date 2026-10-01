/*
 * EL PROYECTO DE LAS PRUEBAS DE EMULADOR — y la garantía de que no es real.
 *
 * Las suites `*.emulator.mjs` escriben en Firestore, Auth y Storage. Hasta el
 * 2026-09-30 doce de ellas fijaban el proyecto `wee-dev-geovet`, que es un
 * proyecto REAL: ejecutadas fuera de `firebase emulators:exec`, el SDK de
 * administración habría escrito en él con las credenciales del portátil.
 *
 * Ahora el proyecto sale del entorno que pone `emulators:exec` y tiene que ser
 * `demo-*`: Firebase trata esos proyectos como solo-emulador y no pueden llegar
 * a ningún recurso real. Si no hay emulador en el entorno, la suite se niega a
 * empezar en vez de buscar un proyecto de verdad.
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node test/<suite>.emulator.mjs"
 */
export const proyectoDeEmulador = () => {
  const proyecto = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-wee';
  if (!proyecto.startsWith('demo-')) {
    console.error(`✘ Estas pruebas solo corren contra un proyecto demo-* de los emuladores, y llegó «${proyecto}».`);
    console.error('  Usa: firebase emulators:exec --only firestore --project demo-wee "node test/<suite>.emulator.mjs"');
    process.exit(2);
  }
  const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST
    || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST);
  if (!hayEmulador) {
    console.error('✘ No hay ningún emulador en el entorno (FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST…).');
    console.error('  Estas pruebas se lanzan dentro de `firebase emulators:exec`; nunca contra un proyecto real.');
    process.exit(2);
  }
  return proyecto;
};
