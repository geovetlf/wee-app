/**
 * Las pruebas que llaman a una callable de administración con `.run` no tienen Auth ni Firestore de verdad. Las puertas
 * (`admin/autorizacion.ts`) los piden y, sin ellos, cierran: esto les da los de mentira y devuelve con qué mandar en la prueba.
 *
 *   const administracion = administracionDePrueba(lib);
 *   administracion.claims = { admin: true, weeRole: 'support' };   // lo que dice Auth AHORA, diga lo que diga el token
 *   administracion.entradas                                         // lo que se escribió en adminAudit
 *   administracion.restaurar();
 */
export const administracionDePrueba = (lib) => {
  const { dependencias } = lib('admin/autorizacion.js');
  const original = { auth: dependencias.auth, db: dependencias.db };
  const estado = {
    claims: { admin: true },
    disabled: false,
    tokensValidAfterTime: undefined,
    /** Un error que `getUser` debe lanzar. */
    fallaAuth: null,
    /** ¿Debe fallar la escritura de la entrada con este resultado? */
    fallaAuditoria: () => false,
    consultasAuth: 0,
    entradas: [],
    restaurar: () => Object.assign(dependencias, original),
  };
  dependencias.auth = () => ({
    getUser: async (uid) => {
      estado.consultasAuth++;
      if (estado.fallaAuth) throw estado.fallaAuth;
      return { uid, disabled: estado.disabled, customClaims: estado.claims, tokensValidAfterTime: estado.tokensValidAfterTime };
    },
  });
  dependencias.db = () => ({
    collection: () => ({
      doc: () => ({
        create: async (entrada) => {
          if (estado.fallaAuditoria(entrada)) throw new Error('firestore caído');
          estado.entradas.push(entrada);
        },
      }),
    }),
  });
  return estado;
};
