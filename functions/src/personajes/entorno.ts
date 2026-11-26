/*
 * ¿ESTAMOS EN UN ENTORNO DE PRUEBAS EXPLÍCITO? (auditoría 2026-11-22, I10)
 *
 * Los resultados simulados (modo demo del motor) solo valen en pruebas: un proyecto
 * `demo-*` o el emulador de Functions. Fuera de ahí, un resultado simulado NO se
 * cobra ni se publica: el pase no actúa y el encargo se reembolsa. Es la regla de
 * siempre de Weë: los mocks, solo con un entorno de pruebas declarado.
 */
export function esEntornoDePruebas(env: NodeJS.ProcessEnv = process.env): boolean {
  const proyecto = String(env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT || '');
  return proyecto.startsWith('demo-') || env.FUNCTIONS_EMULATOR === 'true';
}
