import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../contexts/UserProfileContext';

/**
 * EL TEMA SALE DEL PERFIL, EN UN SOLO SITIO. No pinta nada.
 *
 * Perfil Real = app clara; Perfil Weë = app oscura. Siempre. Quien cambia de perfil ya llama a `setThemeMode`, pero el
 * perfil también vuelve a Real por caminos que no pasan por ningún selector —al cerrar sesión estando en el Perfil Weë,
 * `UserProfileContext` lo devuelve a Real— y ahí la app se quedaba oscura. Aquí se sigue al perfil, venga de donde venga.
 */
const TemaDelPerfil = () => {
  const { activeProfileType } = useUserProfile();
  const { setThemeMode } = useTheme();
  useEffect(() => {
    setThemeMode(activeProfileType === 'hidi' ? 'dark' : 'light');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileType]);
  return null;
};

export default TemaDelPerfil;
