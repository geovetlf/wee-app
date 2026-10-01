import type { FirebaseApp } from 'firebase/app';

/**
 * APP CHECK EN iOS Y ANDROID — todavía no.
 *
 * Con el SDK web de Firebase que usa la app, App Check en el teléfono necesita un
 * módulo nativo (Play Integrity en Android, App Attest en iOS) y una build nueva.
 * Hasta entonces aquí no se hace nada; la web lo tiene en `appCheck.web.ts`.
 * El orden para encenderlo está en docs/SECURITY.md § App Check.
 */
export const activarAppCheck = (_app: FirebaseApp | null): boolean => false;
