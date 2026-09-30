import { Platform } from 'react-native';

/**
 * ELEGIR UN ARCHIVO DEL DISPOSITIVO.
 *
 * En la web, el selector del navegador: el mismo `<input type="file">` que ya usan
 * el compositor y el avatar, sin ninguna dependencia. En la app nativa elegir un
 * archivo que no es una foto necesita un módulo nativo que la app todavía no
 * tiene (y una build nueva), así que aquí se dice que no se puede —nunca se
 * finge— y quien lo usa lo enseña cerrado, con su porqué.
 */
export const sePuedeElegirUnArchivo = (): boolean => Platform.OS === 'web' && typeof document !== 'undefined';

/**
 * Abre el selector y devuelve el archivo elegido, o `null` si se cancela.
 *
 * Si el navegador no avisa de la cancelación, la promesa no se resuelve nunca: por
 * eso quien la usa no cambia de estado hasta que llega un archivo.
 */
export const elegirUnArchivo = (accept: string): Promise<File | null> =>
  new Promise((resolve) => {
    if (!sePuedeElegirUnArchivo()) {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files && input.files.length > 0 ? input.files[0] : null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
