import { useEffect, useRef } from 'react';
import { useIdioma } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { usersService } from '../services/firestoreService';

/*
 * EL IDIOMA DE LA CUENTA Y EL IDIOMA DEL APARATO, COSIDOS.
 *
 * No pinta nada. Es un componente porque necesita estar DENTRO del proveedor
 * del perfil y a la vez hablar con el del idioma, y en React eso es un
 * componente.
 *
 * ── Por qué no vive dentro de `IdiomaContext` ───────────────────────────────
 *
 * Porque el orden del árbol en `App.tsx` lo prohíbe:
 *
 *     IdiomaProvider → ThemeProvider → AuthProvider → UserProfileProvider
 *
 * y ese orden es correcto: el idioma envuelve a todo lo demás para que
 * cualquiera —incluida la pantalla de entrar— pueda pedir un texto traducido
 * sin depender de que haya sesión. Un idioma que necesitara el perfil para
 * arrancar dejaría sin traducir justo las pantallas de quien todavía no tiene
 * cuenta. Así que el idioma no baja a buscar el perfil: el perfil sube a
 * decírselo, y eso es este archivo.
 *
 * ── Las dos direcciones ─────────────────────────────────────────────────────
 *
 * 1 · DE LA CUENTA AL APARATO. Al entrar, si el perfil trae idioma, se pone.
 *     Es lo que hace que la elección viaje: quien eligió portugués europeo en
 *     el móvil lo encuentra puesto al abrir Weë en el ordenador.
 *
 * 2 · DEL APARATO A LA CUENTA. Cuando alguien ELIGE —`origen === 'elegido'`,
 *     nunca cuando el idioma vino del sistema— se guarda en su perfil. Por eso
 *     abrir Weë en un teléfono en alemán no le escribe alemán a nadie.
 *
 * ── Por qué no se ciclan ────────────────────────────────────────────────────
 *
 * Porque (1) termina dejando `locale` igual a `perfil.language`, y (2) empieza
 * comprobando justo eso y no escribe. Las dos referencias de abajo son el
 * cinturón: recuerdan qué se adoptó y qué se escribió, para que un repintado
 * no repita el viaje.
 *
 * ── Y POR QUÉ ESCRIBE EN EL PERFIL REAL, SIEMPRE ────────────────────────────
 *
 * El idioma es de la PERSONA, no de la cara que tenga puesta. `updateProfile`
 * del contexto escribe en el perfil ACTIVO, así que usarlo dejaría el idioma
 * en el Perfil Weë de quien lo cambió estando ahí, y su Perfil Real seguiría
 * sin saberlo. Por eso aquí se escribe a mano en `realProfile.id`.
 */
const SincronizarIdioma: React.FC = () => {
  const { realProfile } = useUserProfile();
  const { locale, origen, cambiarIdioma } = useIdioma();

  /* Lo último que se adoptó de la cuenta, y lo último que se le escribió. */
  const adoptado = useRef<string | null>(null);
  const escrito = useRef<string | null>(null);

  const suyo = realProfile?.language ?? null;
  const idDelPerfil = realProfile?.id ?? null;

  /* 1 · De la cuenta al aparato. */
  useEffect(() => {
    if (!suyo) return;
    /* Ya se atendió este valor: un repintado no vuelve a imponerlo, porque si
     * después eligió otra cosa en esta misma sesión ganaría la vieja. */
    if (adoptado.current === suyo) return;
    adoptado.current = suyo;
    if (suyo === locale) return;
    cambiarIdioma(suyo);
    // `cambiarIdioma` se rehace en cada render del proveedor: meterlo en las
    // dependencias volvería a disparar esto sin parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suyo]);

  /* 2 · Del aparato a la cuenta, y solo si fue una elección. */
  useEffect(() => {
    if (origen !== 'elegido') return;
    if (!idDelPerfil) return;
    if (suyo === locale) return;
    if (escrito.current === locale) return;
    escrito.current = locale;
    usersService.update(idDelPerfil, { language: locale }).catch((error) => {
      /* Sin red la elección ya está puesta y guardada en el aparato: lo único
       * que se pierde es que viaje a otro dispositivo, y se reintenta sola la
       * próxima vez que cambie algo. No se molesta a nadie con un aviso. */
      escrito.current = null;
      console.warn('No se pudo guardar el idioma en el perfil:', error);
    });
  }, [locale, origen, idDelPerfil, suyo]);

  return null;
};

export default SincronizarIdioma;
