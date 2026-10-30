/*
 * EL ENTORNO DE LA CONSOLA. Puro: recibe las variables y dice a qué se conecta.
 *
 * UNIDAD 1: SOLO EMULADORES. El proyecto tiene que ser `demo-*` (Firebase los trata como solo-emulador: no pueden
 * tocar nada real) y los hosts, de esta máquina. Si no es así, la consola NO arranca y lo dice. Apuntarla a
 * `get-wee` es una decisión posterior y deliberada (con roles, auditoría y hosting propio), no un cambio de una
 * variable de entorno.
 */
export interface EntornoLocal {
  proyecto: string;
  region: 'us-central1';
  auth: { host: string; port: number };
  functions: { host: string; port: number };
}

export type MotivoDeRechazo = 'proyecto-no-demo' | 'host-no-local' | 'puerto-invalido';
export type EntornoResuelto = { ok: true; entorno: EntornoLocal } | { ok: false; motivo: MotivoDeRechazo };

export const PROYECTO_POR_DEFECTO = 'demo-wee';
const HOSTS_LOCALES = ['127.0.0.1', 'localhost', '[::1]'];

const puerto = (crudo: string | undefined, porDefecto: number): number | null => {
  if (crudo === undefined || crudo === '') return porDefecto;
  const n = Number(crudo);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : null;
};

export const resolverEntorno = (env: Record<string, string | undefined>): EntornoResuelto => {
  const proyecto = (env.VITE_FIREBASE_PROJECT_ID || PROYECTO_POR_DEFECTO).trim();
  if (!proyecto.startsWith('demo-')) return { ok: false, motivo: 'proyecto-no-demo' };

  const hostAuth = (env.VITE_AUTH_EMULATOR_HOST || '127.0.0.1').trim();
  const hostFunctions = (env.VITE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1').trim();
  if (!HOSTS_LOCALES.includes(hostAuth) || !HOSTS_LOCALES.includes(hostFunctions)) return { ok: false, motivo: 'host-no-local' };

  const portAuth = puerto(env.VITE_AUTH_EMULATOR_PORT, 9099);
  const portFunctions = puerto(env.VITE_FUNCTIONS_EMULATOR_PORT, 5001);
  if (portAuth === null || portFunctions === null) return { ok: false, motivo: 'puerto-invalido' };

  return {
    ok: true,
    entorno: {
      proyecto,
      region: 'us-central1',
      auth: { host: hostAuth, port: portAuth },
      functions: { host: hostFunctions, port: portFunctions },
    },
  };
};
