import { Diccionarios } from './traducir';
import { es } from './textos/es';
import { en } from './textos/en';

/*
 * EL ÚNICO SITIO QUE SABE QUÉ DICCIONARIOS HAY.
 *
 * Añadir un idioma es escribir su archivo en `textos/` y añadir una línea aquí.
 * Ni una pantalla, ni un componente, ni el traductor cambian: por eso este
 * archivo existe en vez de importar los textos desde donde haga falta.
 *
 * SOBRE CARGARLOS SUELTOS: hoy los dos se importan de golpe, y con dos idiomas
 * pequeños es lo correcto —partirlos costaría más de lo que ahorra—. Cuando
 * sean once, la carga perezosa se pone AQUÍ, cambiando este objeto por un mapa
 * de funciones que devuelvan `import()`. Ninguna pantalla se entera, que es
 * justo lo que se buscaba al meter esto detrás de una puerta.
 *
 * Y nunca por red: los diccionarios viajan dentro de la app. Enseñar Weë en
 * otro idioma no puede costar una petición, ni un servicio de traducción, ni un
 * céntimo por persona.
 */
export const DICCIONARIOS: Diccionarios = {
  es,
  en,
};

/** Los idiomas que tienen diccionario de verdad. Lo que mira el resolutor. */
export const idiomasConDiccionario = (): string[] => Object.keys(DICCIONARIOS);
