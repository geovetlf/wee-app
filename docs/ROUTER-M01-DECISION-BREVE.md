# Router · M-01 — decisión breve (qué autorizar y qué no)

> **Estado (R8, 2026-10-12): parche PREPARADO y PENDIENTE DE DECISIÓN. No está aplicado en ninguna rama, ninguna cerca está reanclada, nada se ha desplegado.** Verificado de forma independiente sobre `c3f7f9a7` (`git diff a64ff24 -- functions/src/engine` vacío: el motor es el del dossier `docs/ROUTER-PARCHE-PARA-AUTORIZAR.md`). Marcas: **[L]** leído · **[E]** ejecutado por mí (logs en `ronda-r8\RTR-router\logs\`; el parche, solo en una copia desechable) · **[D]** heredado de R7, no repetido.

## 1. Qué se pide y qué NO se pide

**Se pide, por escrito:** (1) aplicar `docs/propuestas/router-contabilidad.diff`: `functions/src/engine/router.ts` **+31 −4**, único archivo de producción; (2) reanclar **E4** (`puente-pre-f1d` 36) y **H2** (`video-asincrono` 57): una cifra, `126/25 → 157/29` (`reanclaje-borrador-D.diff`, 2 pruebas); (3) registrar la repro en la cadena (`ci-workflow` 13: 315 → 316 pasos); (4) elegir alcance (§4). Es zona roja del Harness (`ops/revision/reglas.mjs:118`): entra por su revisión obligatoria.
**No se pide:** reparar la fila que queda sin cerrar, `ledger.progress`, `EngineResult` (§5); desplegar; tocar importes, precios, márgenes, reglas de Credits, contratos, proveedores o modelos.

## 2. El defecto

`execute()` mete la llamada al proveedor (`engine/router.ts:447`) **y** la contabilidad posterior —`ledger.close` `:486`, `request.record` `:511`— en el mismo `try` (`:446-514`) [L]. Si Firestore falla *después* de que el proveedor devolvió y cobró, el `catch` lo trata como fallo del proveedor: reescribe la fila `FAILED`/`providerCost 0`, penaliza a un proveedor sano y, con **un** proveedor, lanza «No te cobré» (**se descarta lo pagado**); con **varios** llama al siguiente (**se paga dos veces**) [E]. El vídeo es solo Seedance: allí es «pagado y descartado». Importe por incidencia: ≈ 0,002 USD en texto [D]; vídeo «hasta ≈17 USD» [D, no verificado]. **Frecuencia en producción: NO VERIFICADA** (la daría `aiGenerations`: `FAILED` de `providerCost 0` seguidas de un resultado).
**Se reproduce [E]:** `node functions/test/router-contabilidad.repro.mjs` → **55 ✘ / 31 ✔, exit 1** (0,8 s).

## 3. Qué cambia y qué no

El cierre se arma como constante (una salida malformada sigue siendo fallo del proveedor) y el cierre del libro y el apunte de uso van cada uno en su `try`: si fallan, el resultado se **entrega**, el proveedor no se penaliza, la fila no se pisa y se escribe un `console.error` saneado «contabilidad SIN CERRAR» (registro, proveedor, coste, Credits del paso, causa). **No reintenta.** Diferencial [E] (297 escenarios proveedor × contabilidad, `lib` base frente a parcheada): 161 idénticos y 136 que cambian, **todos** dentro de ese caso; 0 fuera.
**No cambia:** créditos (`creditsFor`, `creditsEstimated`, el `credits` devuelto), idempotencia (el Router no deduplica ni antes ni después [E]; vive en Credits y en quien llama), salud, orden, `accepted`, vídeo legacy (H1), `ledger.ts`, `types.ts`, contratos.

## 4. Las tres opciones de alcance

| | A · solo M-01 | B · M-01 + PR1–PR3 | C · no aplicar ahora |
|---|---|---|---|
| Producción | `router.ts` +31 −4 | + `ledger.ts` +21 −2 · `verification.ts` +28 −2 · `creator/credits.ts` +15 | nada |
| Mueve [E] | **E4 y H2** (`router 126/25 → 157/29`) y nada más: `puente-pre-f1d` 40✔+1✘, `video-asincrono` 62✔+1✘, `f1d-generacion` 100✔ | E4 y H2 (+ `ledger 188/29→209/31`, `verification 8/0→36/2`, `credits 45/4→60/4`), **F4** (`puente-pre-f1d` 40) y **`f1d-generacion` #98** | nada |
| Reanclaje | `reanclaje-borrador-D.diff` | `reanclaje-borrador-D+I.diff` (3 pruebas); no se apila con el de D y con un subconjunto de los diffs sigue en rojo (S11, S12) | — |
| Toca contabilidad o Credits (**marcado, no propuesto**) | solo el flujo cuando falla el libro; ningún importe | **PR1 CONTABILIDAD** (`close` no relee la fila; suma al uso del día con datos en memoria) · **PR2** contador `aiProviderVerification` (≤ 5 min de retraso) · **PR3 CRÉDITOS** (cuándo se llama a `ensureAccount`: migración y bienvenida) | — |
| Esfuerzo · riesgo | 3 pasos mecánicos ya ensayados (5 s) + build 91 s [E] + cadena 7–12 min [D] · bajo | más superficie; la ganancia es de latencia (−1…−3 rondas por petición), no de dinero [D]; PR1 y D2(a) editan el mismo método | el defecto sigue: cada incidencia = una generación pagada y descartada (o pagada dos veces) |

## 5. Lo que sigue sin resolver (preguntas del informe de D; no son las D1–D9 de Design ni las D-1…D-12 de Chef)

- **M-01·D1** ¿Autorizas aplicar y reanclar? (a) solo M-01 · (b) con PR1–PR3 · (c) no ahora · (d) otra forma (`docs/ROUTER-CONTABILIDAD.md` §4).
- **M-01·D2** ¿Cómo se repara la fila sin cerrar? **Ningún barrido lo hace** [E: búsqueda de todos los lectores de `aiGenerations`] y a mano hay que restaurar **también** `creditsCharged` (`settle` la deja en 0 con `settledAt`; otra liquidación contesta `already`) [E]. (a) `close` atómico + reintento (toca `ledger.ts`: vuelve a mover E4/H2) · (b) marcador + reparador (contrato) · (c) script desde `aiGenerations` (no existe) · (d) el aviso a la alerta «Weë · dinero sin cerrar» (+3 −2 en `ops/observabilidad/alertas.mjs`; `observabilidad.test` sigue en 14 ✔ [E]; no mueve cercas) · (e) a mano.
- **M-01·D3** ¿Lo mismo para `ledger.progress` dentro de `adapter.run` (`engine/router.ts:436-445`)? **D4** ¿`EngineResult` debe decir «contabilidad pendiente»? (contrato compartido). Y `generateVideo`/`creatorRun` descartan lo pagado igual si falla su propia escritura (`creator/video.ts:682,712`, `creator/index.ts:790`): vallado por H1/F4, otra autorización.

## 6. Pruebas antes / después (en la copia desechable)

| Qué | Antes (base `c3f7f9a7`) | Después (M-01 + reanclaje D + repro registrada) |
|---|---|---|
| `router-contabilidad` (la repro) | **55 ✘ / 31 ✔**, exit 1, 0,8 s [E] | **86 ✔ / 0 ✘**, exit 0, 2,7 s [E] |
| Compilación: `npm run build -- --outDir <fuera de lib>` (el `tsc` estricto del proyecto) | `lib` de la base | **exit 0 en 91 s**; de 287 `.js` solo difiere `engine/router.js` [E] (D: 65 s, coordinador: 42 s [D]) |
| 58 suites (las 57 de R7-Design + `f1d-generacion`; +1, la repro, después) | 0 con exit ≠ 0 · 4 692 ✔ [E] | 59: 58 con exit 0; `runtime-map` salió 183✔+2✘ por fechas de la copia («compilado desfasado» en tres fuentes que la matriz reescribió con `git checkout`, contenido idéntico a la base) y, retocadas las fechas, 185 ✔ → 4 778 ✔, 0 ✘ (= 4 692 + 86 de la repro) [E] |
| `ci-workflow` · `escaneo-secretos` | 41 ✔ · ningún secreto [E] | 41 ✔ con la repro renombrada y registrada · ningún secreto en 2 069 archivos [E] |
| Cercas `puente-pre-f1d` · `video-asincrono` · `f1d-generacion` | 42 · 64 · 100 ✔ | M-01 sola: E4 y H2 en rojo (40✔+1✘ · 62✔+1✘ · 100✔); con D: 42 · 64 · 100 ✔; PR1–PR3 con D+I: igual; M-01 + D+I sin PR: rojo [E: S0–S12 = el dossier] |
| Una línea más en `router.ts` ya reanclado | — | E4 y H2 vuelven a rojo (`159/29`): la cerca sigue mordiendo [E] |
| 6 sabotajes del JS compilado · cadena entera | — | 6/6 matadas [D] · **NO VERIFICADA** (pesada; la lanza el coordinador): se esperan 316/316 |

## 7. Marcha atrás

Sin commitear: `git checkout -- functions/src/engine/router.ts functions/test/puente-pre-f1d.test.mjs functions/test/video-asincrono.test.mjs functions/package.json`, deshacer el `git mv` y recompilar. Commiteado (dos commits: el parche y, aparte, el reanclaje con el registro): `git revert <reanclaje>` y luego `git revert <parche>`, recompilar y repetir las suites 5, 9 y 10 del dossier §6.2. Demostrado en la copia [E]: tras revertir solo el reanclaje, E4 y H2 en rojo; tras los dos reverts, `git diff --stat c3f7f9a7` vacío, el mismo árbol (`ed0a5c2b…`), `router.ts` = `ce734adb…` y las tres cercas en verde. Si llegara a desplegarse, no es un despliegue: se mueve el tráfico a la revisión anterior de Cloud Run (`docs/DEPLOYMENT.md:166-170`).

## 8. Recomendación técnica (opinión; no es la decisión)

**Opción A, y pediría con ella la alerta (D2-d).** (1) M-01 es lo único del paquete que arregla dinero, con el menor cambio posible: ruta feliz idéntica, nada cambia fuera de su caso y se deshace con dos `git revert`. (2) No metería PR1–PR3 en la misma autorización: son latencia, no dinero; PR1 y PR3 tocan libro y Credits; su reanclaje es todo o nada; y el `close` atómico (D2-a) editaría el mismo método que PR1: se decide antes y se reancla una vez. (3) Con M-01 la persona ya no ve un error y el aviso no alerta a nadie (`ops/observabilidad/alertas.mjs:90-100`): un cierre caído sostenido pasaría de «error visible» a «fila sin cerrar silenciosa».
**Me haría cambiar:** frecuencia real ≈ 0 (la mide el dueño) y no querer mover cercas ahora → C; D2-(a) pronto → un solo reanclaje con M-01 + (a); un cierre determinista en producción (p. ej. un `providerMeta` que Firestore no admite) → la alerta deja de ser opcional. **Retoques de texto opcionales** (mismo `+31 −4`, otra huella): el 2.º aviso dice «El libro quedó cerrado» aunque el cierre también haya caído [E], y `sinCerrar` lanza con un valor que `String()` no convierte (la base falla igual) [E].
