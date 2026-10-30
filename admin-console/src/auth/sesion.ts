/** Lo que la consola necesita de la sesión. Firebase Auth lo cumple en `firebase.ts`; las pruebas, con un doble. */
export interface UsuarioDeSesion {
  uid: string;
  email: string | null;
}

export interface ServicioDeSesion {
  /** Avisa ya con el estado actual y luego en cada cambio. Devuelve cómo dejar de observar. */
  observar(alCambiar: (usuario: UsuarioDeSesion | null) => void): () => void;
  /** Rechaza con un Error cuyo mensaje es el código de Auth (`auth/invalid-credential`…). */
  entrar(email: string, clave: string): Promise<void>;
  salir(): Promise<void>;
}

export type ErrorDeInicioDeSesion = 'credenciales' | 'demasiados' | 'red' | 'otro';

/** El código de Auth, reducido a lo que se le dice a la persona (sin distinguir «no existe» de «clave mala»). */
export const clasificarErrorDeInicio = (error: unknown): ErrorDeInicioDeSesion => {
  const codigo = error instanceof Error ? error.message : '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/user-disabled'].includes(codigo)) return 'credenciales';
  if (codigo === 'auth/too-many-requests') return 'demasiados';
  if (codigo === 'auth/network-request-failed') return 'red';
  return 'otro';
};
