# RTL y escrituras en Weë

Estado (2026-10-30): preparado en la rama `visual/rtl-tipografia`, sin integrar. Web comprobada con capturas; **nativo sin verificar en un aparato**.

## Arquitectura en la que se apoya

Weë es una sola app Expo + React Native; la web es React Native Web 0.21 (`expo export -p web`). Es lo que sirve producción. Un solo código, así que no hay una "capa web" aparte que corregir.

## Dirección

> **Estado vigente (2026-11-05, fase E2 de la integración de idiomas).** La única utilidad RTL activa es `components/IconoDireccional.tsx` + `hooks/useDireccion.ts` (iconos que señalan, `espejo`, `alInicio`/`alFinal`, `dir.flecha`), fijada por `functions/test/rtl-y-enlaces.test.mjs` y `functions/test/rtl-flechas.test.mjs`. El envoltorio `components/Ionicons.tsx` y `hooks/useLayoutRTL.ts` se retiraron (duplicaban el reflejo; respaldo en `_respaldo-integracion-i18n/E2`). `components/SentidoDeLaPagina.tsx` queda **PRESERVADO como infraestructura pendiente de integración, NO como funcionalidad activa**: el `View dir` en la raíz web y el `forceRTL` nativo quedan para una fase posterior; hoy `<html dir>` lo pone `contexts/IdiomaContext.tsx`. Igual `utils/escriturasDeLaInterfaz*`, `utils/textoDePersona.ts` y `assets/fonts/multiescritura/`. Su prueba, `functions/test-L5/rtl-y-escrituras.test.mjs`, sigue aparcada fuera de la cadena (sin las aserciones de las copias retiradas); sus fallos son esperables mientras no se conecte.

Lo que sigue es el diseño original de la rama; las filas retiradas están marcadas.

| Pieza | Qué hace |
|---|---|
| `components/SentidoDeLaPagina.tsx` | **Preservado, pendiente de integración (no activo).** El único sitio que cambia el sentido global. Web: `<html dir>` y un `View dir` en la raíz, porque RN-web compila las propiedades lógicas según su propio contexto. Nativo: `I18nManager`. |
| ~~`hooks/useLayoutRTL.ts`~~ | **Retirado (E2).** Si la pantalla está maquetada en RTL ahora mismo. |
| ~~`components/Ionicons.tsx`~~ | **Retirado (E2):** lo hace `components/IconoDireccional.tsx`, también con nombre en variable. |
| Propiedades lógicas | `marginStart`, `paddingEnd`, `start`… En LTR equivalen a las físicas. |
| `utils/textoDePersona.ts` | Marca lo que escribe una persona, que conserva su propio sentido. |

La causa de fondo del desorden: RN-web pone `dir="auto"` en cada texto y el navegador decide por la primera letra fuerte. En persa, «Credits در دسترس» tomaba base LTR. Con la página en RTL, el texto de interfaz recibe el sentido de la página; las marcas siguen siendo un tramo LTR intacto, sin aislamientos ni caracteres añadidos.

**Se queda en LTR a propósito:** los logotipos (la W delante del nombre) y lo que son coordenadas de contenido: `components/studio/produccion/`, `components/creator/TarjetaTresD.tsx` y posiciones calculadas (`left: punto.x`).

**Nativo:** el layout de React Native se fija al arrancar. `expo-updates` está desactivado y `DevSettings.reload` solo existe en desarrollo, así que el cambio de sentido se ve en el siguiente arranque. Falta un aviso de "reinicia la app", que necesita una clave nueva en todos los idiomas.

## Tipografía

Inter se conserva: las caras nuevas se declaran con su mismo nombre de familia y un `unicode-range`. Un texto latino no cambia de archivo, y el navegador solo descarga una escritura si aparece un carácter suyo.

Cobertura medida sobre los caracteres que usan de verdad los diccionarios:

| Escritura | Idiomas | Fuente | Licencia | Tamaño por peso |
|---|---|---|---|---|
| Latina, griega, cirílica, vietnamita | la mayoría | Inter (ya estaba) | OFL 1.1 | 334 KB |
| Árabe | fa, ar | Vazirmatn | OFL 1.1 | 124 KB |
| Hebrea | he | Noto Sans Hebrew | OFL 1.1 | 47 KB |
| Jemer | km | Noto Sans Khmer | OFL 1.1 | 103 KB |
| Devanagari | hi | Noto Sans Devanagari | OFL 1.1 | 212 KB |
| CJK | zh, ja, ko | Fuente del sistema | — | No se empaqueta: varios MB por peso |

**Por qué Vazirmatn y no Noto Sans Arabic:** el «۰» de Vazirmatn mide 288×288 frente a 130×130 del punto, y el de Noto Sans Arabic 165×164 frente a 124×135, casi un punto. Además pesa menos y sus métricas (1563) se acercan más a Inter (1210) que las de Noto Sans Arabic (2112), que se cortaría en cajas de altura fija.

Los archivos viven en `assets/fonts/multiescritura/`, fuera de `node_modules`, porque el `ignore` de Hosting ya descartó fuentes de ahí una vez.

Web solamente: en nativo el sistema resuelve el carácter que falta. Sin verificar en un aparato.

## Sin resolver

- `HeroCarousel` no lo renderiza ninguna pantalla desde el rediseño `072d2bfb` (2026-09-10), aunque `CLAUDE.md` lo siga describiendo en el inicio. Sus textos alternativos localizados están en `_visual-rtl/textos-alternativos-banners.patch`, fuera de esta rama. Las imágenes llevan texto incrustado en español: localizar el `alt` no lo resuelve, haría falta una imagen por idioma.
- Las flechas de texto `→` dentro de los diccionarios no se reflejan solas: se corrigen en cada diccionario RTL.
