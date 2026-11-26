import { useEffect } from 'react';
import { Platform } from 'react-native';

/** En la web, Escape cierra la hoja inferior mientras está abierta. En nativo no hace nada. */
export function useCerrarConEscape(abierta: boolean, cerrar: () => void): void {
  useEffect(() => {
    if (!abierta || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierta, cerrar]);
}
