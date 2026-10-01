import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

/**
 * APP CHECK EN LA WEB — preparado y APAGADO mientras no haya clave.
 *
 * Solo se activa si el build trae `EXPO_PUBLIC_APP_CHECK_SITE_KEY`: la clave de
 * sitio de reCAPTCHA Enterprise que el dueño registra en Firebase App Check. Es
 * pública (va en la página), no es un secreto. Sin ella no cambia nada: ni se
 * carga reCAPTCHA ni se manda ningún token.
 *
 * Con ella, cada llamada a Firebase lleva un token de App Check; las Functions lo
 * verifican pero no lo EXIGEN hasta que `APP_CHECK_OBLIGATORIO` (functions/src/
 * opciones.ts) se encienda, y eso espera a las apps nativas (docs/SECURITY.md).
 */
export const activarAppCheck = (app: FirebaseApp | null): boolean => {
  const clave = process.env.EXPO_PUBLIC_APP_CHECK_SITE_KEY;
  if (!app || !clave) return false;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(clave), isTokenAutoRefreshEnabled: true });
  return true;
};
