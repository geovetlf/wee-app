# RTL: infraestructura preservada (sin conectar)

> Decisión del dueño, 2026-11-06 (T): se **conservan** `components/SentidoDeLaPagina.tsx` y su prueba
> `functions/test-L5/rtl-y-escrituras.test.mjs`, pero **sin conectar**. Nada importa el componente y la prueba sigue
> fuera de la cadena (`npm test`). Conectarlo es una fase aparte que necesita permiso explícito.
> Contexto general de RTL: [`I18N-RTL-Y-ESCRITURAS.md`](I18N-RTL-Y-ESCRITURAS.md).

## Qué aporta

1. **`View dir` en la raíz de la web.** React Native Web compila `marginStart`/`marginEnd`, `start`/`end` y el orden
   de las filas según la dirección que recibe por **su propio contexto**, no por el `<html dir>`. Sin un `View` con
   `dir` que envuelva la app, las propiedades lógicas pueden quedarse en LTR aunque el documento esté en RTL. Es la
   lección de la rama `visual/rtl-tipografia`, y la mayor ganancia del componente.
2. **Modo RTL nativo.** En iOS y Android llama a `I18nManager.allowRTL`/`forceRTL` cuando cambia la dirección. El
   layout nativo se fija al arrancar, así que el cambio se ve en el siguiente arranque. Hoy no hay nada equivalente
   en la app; no se ha comprobado en un teléfono.
3. **Un solo sitio** para el sentido global, tomado del dato del idioma (`i18n/idiomas.ts` → `direccion`), sin
   códigos de idioma escritos a mano.

## Qué duplica del sistema de idiomas

- **`<html dir>` en la web.** Hoy lo escribe `contexts/IdiomaContext.tsx` (con `direccionDe(idioma)`, y también el
  modo `PRUEBA_RTL`). `SentidoDeLaPagina` escribe el mismo atributo. Si se conectaran los dos tal cual, habría dos
  sitios escribiendo `dir`. Por eso falla la comprobación A3 de la prueba.
- **La dirección** la lee de `useIdioma().direccion`, la misma que ya expone el contexto. No crea otro almacén ni
  otro resolutor, así que respeta la regla de un solo sistema i18n.
- **Los iconos que señalan** no son cosa suya: siguen en `components/IconoDireccional.tsx` + `hooks/useDireccion.ts`,
  la única utilidad RTL activa. Las copias que duplicaban eso (`components/Ionicons.tsx`, `hooks/useLayoutRTL.ts`)
  se retiraron en E2 (2026-11-05).

## Pasos para conectarlo (fase aparte, con permiso)

1. Pedir autorización al dueño. Trabajar en una rama propia y pasar la puerta visual (320/360/390/1024/1440, LTR y
   RTL).
2. Dejar **un solo escritor de `dir`**: o se quita el `useEffect` de `<html dir>` de `IdiomaContext.tsx` y lo hace
   `SentidoDeLaPagina`, o al revés y el componente solo pone el `View dir` y el nativo. Mantener `PRUEBA_RTL`
   funcionando, sea cual sea el escritor.
3. Envolver la app en `App.tsx` **dentro** de `<IdiomaProvider>`:
   `<IdiomaProvider><SentidoDeLaPagina>…</SentidoDeLaPagina></IdiomaProvider>`. Es lo que pide la comprobación A4.
4. Nativo: decidir qué se le dice a la persona cuando cambia a un idioma RTL (por ejemplo, un aviso traducido con
   `t()` de que el cambio se aplica al reiniciar). Probarlo en un aparato real.
5. Revisar los fallos restantes de `rtl-y-escrituras` (B5 `TEXTO_DE_PERSONA`, propiedades físicas en E1, E4, E5,
   F1, F2) y decidir cuáles se corrigen y cuáles se retiran de la prueba. Solo entonces valorar si la prueba entra
   en la cadena.
6. Ejecutar `tsc`, las suites RTL de la cadena (`rtl-y-enlaces`, `rtl-flechas`) y `rtl-y-escrituras`.

## Estado al 2026-11-06

- `SentidoDeLaPagina.tsx`: sin importar en ningún sitio.
- `rtl-y-escrituras.test.mjs`: fuera de la cadena. 18 ✔ y 8 ✘. Los 8 fallos son esperables mientras no se conecte
  (A3, A4, B5, E1, E4, E5, F1, F2). La comprobación C6 se corrigió el 2026-11-06 para seguir la decisión del eslogan
  localizado (2026-11-04): el eslogan se traduce por idioma y solo «Weë» queda intacto. Ahora pasa.
