/**
 * UNA WEB SIN FIREBASE NO SE PUBLICA.
 *
 * Las variables EXPO_PUBLIC_* se escriben dentro del bundle al construirlo. El 2026-10-29 wee.zone se publicó sin ellas y
 * la web entera, para todo el mundo, mostró «Algo salió mal»: `auth` se quedaba en null y `onAuthStateChanged` fallaba. La
 * construcción terminó bien y el servidor respondía 200, así que nada avisó.
 *
 * `metro.config.js` lo llama dentro de `expo export`, y en Vercel la falta de una variable hace FALLAR la construcción: una
 * construcción fallida no se publica, y la versión buena sigue servida. Fuera de Vercel no hace nada, para que el modo
 * demo y el desarrollo local sigan igual. Nunca escribe valores: solo los nombres que faltan.
 */
const REQUERIDAS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const faltan = (env = process.env) => REQUERIDAS.filter((nombre) => !String(env[nombre] || '').trim());

const exigirConfigWeb = (env = process.env) => {
  if (!env.VERCEL) return;
  const ausentes = faltan(env);
  if (ausentes.length === 0) return;
  const motivo =
    `No se publica una web sin configuración de Firebase. Faltan o están vacías en este entorno de Vercel: ${ausentes.join(', ')}. ` +
    'Añádelas en Project Settings → Environment Variables y vuelve a construir.';
  // Metro envuelve los errores de su configuración: el motivo se escribe aparte para que siempre se lea en el registro.
  console.error(`\n✘ ${motivo}\n`);
  throw new Error(motivo);
};

module.exports = { REQUERIDAS, faltan, exigirConfigWeb };
