import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * EL PERFIL PUESTO SOBREVIVE A RECARGAR WEË VERSIÓN CREATOR.
 *
 * El perfil activo vive en memoria (`contexts/UserProfileContext.tsx`, que es de
 * las dos versiones y no se toca): recargar la página volvía al Perfil Real. Esta
 * pieza es solo de creator y hace dos cosas, nada más:
 *
 *   GUARDA  mientras se está en creator, `{ uid, tipo }` en el almacenamiento del
 *           navegador cada vez que cambia. Al salir de creator lo BORRA: fuera,
 *           la persona puede cambiar de perfil en la versión app sin que creator
 *           lo vea, y un valor viejo devolvería una cara que ya dejó.
 *   DEVUELVE  solo en una carga de página que empezó directamente en `/creator`,
 *           una vez, cuando la sesión y los perfiles ya han llegado, si lo guardado
 *           es de ESTA cuenta, es el Perfil Weë y la cuenta lo tiene. Entonces hace
 *           lo mismo que el cajón de la versión app al cambiar de cara:
 *           `switchIdentity()` y el tema oscuro de la app. Creator sigue clara
 *           (`TemaClaro`), y al volver a la versión app el tema ya cuadra.
 *
 * Entrar en creator desde la versión app nunca cambia el perfil: la página no
 * empezó en `/creator`. Nunca crea perfiles. Fuera de la web no hace nada.
 */
const CLAVE = 'wee.creator.perfilActivo';
const EN_LA_WEB = Platform.OS === 'web' && typeof window !== 'undefined';

type Guardado = { uid: string; tipo: string };

const leer = (): Guardado | null => {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const valor = JSON.parse(crudo);
    return valor && typeof valor.uid === 'string' && typeof valor.tipo === 'string' ? valor : null;
  } catch {
    return null;
  }
};
const guardar = (valor: Guardado): void => {
  try { window.localStorage.setItem(CLAVE, JSON.stringify(valor)); } catch { /* sin almacenamiento: no se recuerda, nada más */ }
};
const borrar = (): void => {
  try { window.localStorage.removeItem(CLAVE); } catch { /* idem */ }
};

/*
 * ¿ESTA CARGA DE PÁGINA EMPEZÓ EN /creator? Se mira una sola vez, al cargar el
 * módulo, que es al arrancar la app: más tarde la dirección ya es la de donde se
 * haya navegado. Y lo que haya que devolver se lee también entonces.
 */
const CARGA_DIRECTA_EN_CREATOR = EN_LA_WEB && /^\/creator(\/|$)/.test(window.location.pathname);
const A_DEVOLVER: Guardado | null = CARGA_DIRECTA_EN_CREATOR ? leer() : null;
/* Una vez por carga de página: si creator se desmonta y se vuelve a entrar, ya no se devuelve nada. */
let yaDecidido = false;

const RecuerdoDelPerfil: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: cargandoSesion } = useAuth();
  const { activeProfileType, hasWeeProfile, realProfile, loading: cargandoPerfil, error, switchIdentity } = useUserProfile();
  const { theme, setThemeMode } = useTheme();
  const [esperando, setEsperando] = useState(() => EN_LA_WEB && !yaDecidido && A_DEVOLVER?.tipo === 'hidi');
  const cambiado = useRef(false);

  /* Los perfiles de ESTA sesión ya llegaron (o fallaron): antes, `hasWeeProfile` todavía no dice nada. */
  const perfilesListos = !!user && !cargandoPerfil && (realProfile?.uid === user.uid || !!error);

  useEffect(() => {
    if (!esperando || cargandoSesion) return;
    const terminar = () => { yaDecidido = true; setEsperando(false); };
    if (!user || !A_DEVOLVER || A_DEVOLVER.uid !== user.uid) { terminar(); return; }
    if (!perfilesListos) return;
    if (!cambiado.current && A_DEVOLVER.tipo === 'hidi' && hasWeeProfile && activeProfileType === 'real') {
      cambiado.current = true;
      switchIdentity();
      setThemeMode('dark');
    }
    terminar();
  }, [esperando, cargandoSesion, user, perfilesListos, hasWeeProfile, activeProfileType, switchIdentity, setThemeMode]);

  /* Si no había nada que devolver, la decisión de esta carga ya está tomada. */
  useEffect(() => {
    if (!esperando) yaDecidido = true;
  }, [esperando]);

  /* Guardar solo después de decidir: antes se pisaría lo guardado con el Perfil Real del arranque. */
  useEffect(() => {
    if (!EN_LA_WEB || esperando || cargandoSesion) return;
    if (!user) { borrar(); return; }
    if (!perfilesListos) return;
    guardar({ uid: user.uid, tipo: activeProfileType });
  }, [esperando, cargandoSesion, user, perfilesListos, activeProfileType]);

  /* Al salir de creator se olvida: lo que pase después en la versión app, creator no lo ve. */
  useEffect(() => () => {
    yaDecidido = true;
    if (EN_LA_WEB) borrar();
  }, []);

  return (
    <View style={styles.raiz}>
      {children}
      {esperando && (
        <View style={[StyleSheet.absoluteFill, styles.velo, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator color={theme.colors.textSecondary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  velo: { alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});

export default RecuerdoDelPerfil;
