# R18 · La tabla de píxeles del precio de vídeo en producción: preparado, sin desplegar

> 2026-09-29, rama `filmmaker/core`. **Nada de esto está desplegado.** Es un parche aislado —no lleva nada de R22—,
> preparado, probado y documentado para que se autorice (o no) por separado. No se hizo push, merge ni deploy, no se
> gastó dinero y no se abrió ninguna puerta.

## 1. Dónde está el error

En el `generateVideo` que corre en producción (`7f11d51` = `96b3f7a` + R22, revisión `generatevideo-00010-qes`), el
precio de un vídeo de Seedance sale de `functions/src/engine/providers/seedance.ts`, líneas 110-130:

- `PIXELS` —el ancho × alto de salida por resolución y proporción— **fija el lado corto** (480, 720, 1080, 2160) y
  estira el largo según la proporción. La tabla oficial de ModelArk no funciona así: una resolución es un
  **presupuesto de píxeles** casi constante, y cada proporción lo reparte (720p: 16:9 = 1280×720, 1:1 = 960×960,
  4:3 = 1112×834, 21:9 = 1470×630).
- `seedanceTokens` multiplica por esos píxeles; `seedanceCostUsd` (el precio en Credits, vía `priceVideo`) y
  `buildSeedanceBody` (la estimación que se apunta en el libro) la usan.
- A 480p en 16:9 y 9:16 la tabla desplegada tiene 854×480 para todos; la oficial da 854×480 a Seedance 2.5 y
  **864×496** a la serie 2.0 (2.0, fast y mini).
- `adaptive` (la proporción la decide la entrada) se cotiza como 16:9.

Aciertan 16:9 y 9:16 a 720p, 1080p y 4K, y 480p en Seedance 2.5. Todo lo demás se cotiza mal.

## 2. La fuente oficial y la fórmula

- **Tabla de píxeles**: documentación de la API de vídeo de ModelArk, «Width and height pixel values corresponding to
  different aspect ratios» (columnas Seedance 2.5 y serie 2.0; la tabla completa está en las pruebas).
- **Fórmula** (página de precios de ModelArk): tokens = (segundos de entrada + segundos de salida) × ancho × alto ×
  24 / 1024; USD = tokens × tarifa por millón.
- **Tarifas vigentes** (USD por millón de tokens, sin / con vídeo de entrada), iguales en el código: Seedance 2.5,
  10.70 / 6.40 (480p y 720p) y 11.7 / 7.0 (1080p); Seedance 2.0, 7.0 / 4.3, 7.7 / 4.7 (1080p) y 4.0 / 2.4 (4K);
  2.0 fast, 5.6 / 3.3; 2.0 mini, 3.5 / 2.1. Las de fast y mini tienen hoy un descuento temporal (25 % y 60 %,
  hasta el 2026-10-07) que el precio no descuenta: se cotiza la tarifa de lista.
- **Comprobación contra los ejemplos publicados**: con la tabla oficial salen exactos los once ejemplos de 16:9 de la
  página de precios (p. ej. 2.0 a 480p, 5 s = USD 0.35; 2.5 a 1080p = USD 2.843). Con la tabla desplegada fallan los
  tres de 480p de la serie 2.0 (sale 0.34 en vez de 0.35).

## 3. Precio de hoy, precio correcto y diferencia

Un vídeo de 5 s, sin vídeo de entrada, a precio de lista (USD):

| Modelo · resolución · proporción | Hoy | Correcto (oficial) | Hoy se desvía |
|---|---|---|---|
| 2.0 fast · 720p · 1:1 | 0.3402 | 0.6048 | −43.75 % |
| 2.0 fast · 720p · 4:3 y 3:4 | 0.4536 | 0.6086 | −25.47 % |
| 2.0 fast · 720p · 21:9 | 0.7938 | 0.6078 | +30.61 % |
| 2.0 · 480p · 16:9 y 9:16 | 0.3363 | 0.3515 | −4.34 % |
| 2.0 · 720p · 1:1 | 0.4253 | 0.7560 | −43.75 % |
| 2.0 · 4K · 21:9 | 5.1030 | 3.8881 | +31.25 % |
| 2.5 · 720p · 1:1 | 0.6500 | 1.1556 | −43.75 % |
| 2.5 · 1080p · 1:1 | 1.5992 | 2.8431 | −43.75 % |

En todas las resoluciones y modelos, 1:1 va un 43,75 % por debajo, 4:3 y 3:4 entre un 25 % y un 27 % por debajo, y
21:9 entre un 25 % y un 31 % por encima. La tabla completa —51 casos— la imprime `scripts/hotfix-r18-verificar.cjs`
con `--tabla`.

## 4. Modelos y adaptadores afectados

- **Afectados**: los cuatro modelos de Seedance (2.5, 2.0, 2.0 fast, 2.0 mini) en 1:1, 4:3, 3:4 y 21:9, en cada
  resolución que tienen; la serie 2.0 a 480p en 16:9 y 9:16; y `adaptive`.
- **No afectados**: 16:9 y 9:16 a 720p, 1080p y 4K, y 480p en Seedance 2.5 (el parche no los cambia: comprobado).
  Ningún otro adaptador: Seedance es el único de vídeo (no hay otro motor de vídeo) y es el único caso en que el
  proveedor decide los píxeles con su propia tabla. El precio de imagen sale de las mismas dimensiones exactas que se
  mandan al proveedor (la Weë Resolution Policy); texto y voz no dependen de la proporción; la estimación por segundo
  del router no fija precios.

## 5. Riesgo económico

- **Por debajo del coste** (1:1, 4:3, 3:4; 480p en la serie 2.0): se cotiza hasta un 43,75 % menos de lo que factura
  el proveedor; va contra la regla del suelo de coste (`docs/AI-ENGINE.md`).
- **Por encima** (21:9): a quien pide 21:9 se le cobra entre un 25 % y un 31 % más de lo que cuesta.
- **Quién llega hoy**: la app de `main` no llama a `generateVideo` (`services/videoService.ts` no lo importa ninguna
  pantalla) y la toma de Filmmaker no está en la app desplegada; quedan las llamadas hechas a mano (no pide App
  Check). Los Credits dependen de la configuración de producción (`aiSettings/global`, `creditCosts`): en el modo
  simulado se cobra el mayor entre el precio de catálogo y el coste, y el catálogo puede tapar parte de la
  diferencia en los vídeos baratos, pero no en los caros (1080p, 4K).

## 6. Qué cambia el parche

Un solo archivo, `functions/src/engine/providers/seedance.ts`: 34 líneas más y 14 menos.

- `PIXELS` pasa a la tabla oficial; `PIXELS_480P_16_9_SERIE_2_0 = [864, 496]` para la serie 2.0 a 480p.
- `canonicalRatio` ya no convierte `adaptive` en 16:9; `pixelesDeSalida(resolución, proporción, modelo)` decide:
  `adaptive` se cotiza con la mayor de su resolución (un techo) y una proporción que no existe, como 16:9 —que es lo
  que el adaptador manda al proveedor en ese caso: su precio no cambia—.
- `seedanceTokens(…, modelId?)` y sus dos llamadas dicen de qué modelo es (a 480p, 2.5 y la serie 2.0 no entregan
  lo mismo).

Lo que no cambia: la petición que llega al proveedor (idéntica, comprobado); `-1` y los vídeos de referencia siguen
cotizándose con su techo (R22); ningún otro archivo.

Los parches: `docs/FILMMAKER-R18-TABLA-DE-PIXELES.patch`, sobre lo que corre hoy (`7f11d51`), y
`docs/FILMMAKER-R18-TABLA-DE-PIXELES.sin-R22.patch`, el mismo cambio sobre `96b3f7a` por si alguna vez se volviera
atrás R22 (R18 y R22 cambian líneas contiguas, así que el contexto de cada variante es distinto; las líneas que
cambian son idénticas, comprobado).

## 7. Contrato afectado

- **El precio de `generateVideo`** para esas proporciones y resoluciones: sube (1:1, 4:3, 3:4, 480p de la serie 2.0 y,
  un poco, `adaptive`) o baja (21:9) hasta el oficial. Es la regla que ya existe —el precio de un vídeo es la fórmula
  oficial de Seedance × la tarifa del modelo (`docs/AI-ENGINE.md`)—, no una política nueva.
- No cambia la forma de ninguna petición, ni F1-A, F1-B o F1-D, ni las reglas, ni el Credit Engine, ni ninguna puerta.
- Una diferencia con la rama: en `filmmaker/core` (Fase 33), una proporción desconocida se cotiza con la mayor de su
  resolución; aquí, como 16:9, para que ningún precio que hoy es correcto cambie. Conviene alinear la rama con esto.

## 8. Cómo se verificó (sin red, sin Firebase, sin gastar)

Sobre dos copias de `7f11d51` fuera del repositorio, una con el parche:

- El parche aplica limpio sobre `7f11d51` y su variante sobre `96b3f7a`; las dos copias compilan (`tsc`, 0 errores).
- **Pruebas**, `scripts/hotfix-r18-verificar.cjs`, 13/13: la tabla es la oficial en los cuatro modelos, cada
  resolución y las seis proporciones; los once ejemplos publicados salen exactos (y con la tabla de hoy fallan los de
  480p de la serie 2.0); lo que hoy se cotiza bien cuesta exactamente lo mismo; lo que se cotiza mal pasa al oficial,
  con las diferencias de arriba; `adaptive`, a la mayor; una proporción desconocida o ausente, igual que hoy; R22
  intacto; solo cambia `seedance.ts` y el precio de una imagen no cambia; al proveedor le llega la misma petición y
  el adaptador estima con la tabla oficial, también según el modelo a 480p.
- **Sabotajes**, `scripts/hotfix-r18-sabotajes.cjs`, 15/15: volver al lado corto en 1:1, 4:3 o 21:9 (720p, 1080p,
  4K, 480p), la medida de 480p de la serie 2.0 o dársela a 2.5, `adaptive` como 16:9, una proporción desconocida a
  la mayor, 3:4 o 9:16 mal leídos, otro número de fotogramas, y dejar de decir el modelo en el precio o en la
  estimación. (Quitar la correspondencia 9:16 → 16:9 sería un mutante equivalente —daría el mismo precio— y por eso
  la batería rompe 9:16 leyéndolo como 4:3.)

## 9. Procedimiento exacto de despliegue (no ejecutado; solo con autorización)

1. Una rama local desde lo que corre: `git worktree add -b hotfix/r18-tabla-de-pixeles <carpeta> 7f11d51`;
   `git apply -p1 docs/FILMMAKER-R18-TABLA-DE-PIXELES.patch`; commit.
2. `functions/.env.get-wee` de `main`, copiado solo para el deploy; las dependencias de functions;
   `npm --prefix functions run build`.
3. Antes: `scripts/hotfix-r18-verificar.cjs` (13/13) y `scripts/hotfix-r22-verificar.cjs` (11/11: R22 sigue) contra
   esa compilación.
4. `firebase deploy --only functions:generateVideo --project prod`. Nada más.
5. Después, sin gastar: la revisión nueva y las demás intactas; la misma configuración; el código descargado de su
   paquete, idéntico al compilado; las dos baterías contra el código desplegado; su registro sin errores. Se borra la
   copia del `.env`, se apuntan las versiones (antes `7f11d51`, después el commit nuevo) y no se ejecuta ningún canary.

Volver atrás es otro deploy de `generateVideo` desde `7f11d51`.
