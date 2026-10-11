# Cercas actualizadas por la integración del núcleo de activos (H5 · H2)

**Línea trk-s · rama `wee/trk-s-activos` · desde la integración `wee/almacenamiento-activos` (`8fcc5c0`) · 2026-10-10.**
Autorización del dueño: integrar el núcleo de activos de A1 (`docs/ACTIVOS-INDICE.md`) y actualizar, con cambios
mínimos y justificables, **F1** de `puente-pre-f1d`, **H3** de `video-asincrono`, las **listas de archivos de Media
Cloud** que el parche movía y el **mapa de `runtime-map`**. `ci-workflow` no se edita: el registro de suites en la
cadena lo hace el integrador para todas las líneas. Condiciones: no desactivar controles, no reducir cobertura, no
eliminar reglas de seguridad, no ampliar el alcance de escritura sin justificación, no ocultar hallazgos, no reanclar
una baseline para silenciar una regresión, y conservar la capacidad de detectar cambios futuros no autorizados. Toda
lista nueva es **exacta**: ni vacía ni un «cualquiera».

Nada de esto está desplegado. La flag `aiSettings/almacenActivos` sigue **cerrada por defecto**, y con ella abierta
ningún objeto se borra físicamente mientras no haya consumidores integrados (D-G).

## Resumen

| Cerca | Suite · comprobación | Antes | Ahora | Por qué |
|---|---|---|---|---|
| F1 | `puente-pre-f1d` · 37 | doce listas nominales + once archivos sueltos: **108** archivos distintos | lo mismo + `DEL_NUCLEO_DE_ACTIVOS`, los **14** archivos de `functions/src` del parche: **120** (12 nuevos para la cerca; `content/index.ts` y `content/versiones.ts` ya estaban) | el parche crea 5 archivos y modifica 9 en `functions/src` |
| H3 | `video-asincrono` · 58 | 12 líneas de `numstat` de `functions/src/core` (misión fal + ciclo de vida 3D) | 19: + `CORE_DEL_NUCLEO_DE_ACTIVOS`, los **7** de `core/media` con su tamaño exacto | el parche toca 6 archivos de `core/media` y crea `core/media/indice.ts` |
| Listas | `media-core` 135/136 · `media-proceso-core` 153/154 · `media-upload-core` 149/150 · `media-delivery-core` 108/109 | `core/media`: 12 archivos · `media`: 19 | `core/media`: **13** (+ `indice.ts`) · `media`: **20** (+ `barrido.ts`) | los dos archivos nuevos del parche en esas carpetas |
| Mapa | `runtime-map` · 91, 92, 99 (ahora 91, 92, 99–102) | `objeto.js` 8 símbolos · `puerto.js` 2 · sin `indice.js`, `recoleccion.js` ni `reconciliacion.js` | `objeto.js` 9 · `puerto.js` 4 · `indice.js` 19 · `recoleccion.js` 1 · `reconciliacion.js` 1 | `deleteAsset` carga ahora `content/indice*.js`, que nombran esos símbolos del Core |

Lo que **no** se ha cambiado: `ci-workflow` 13 (§ 7) y ninguna otra cerca. F3 de `puente-pre-f1d` (comprobación 39) se reancló el 2026-10-10, con su atribución (§ 6).

## 1. F1 — `functions/test/puente-pre-f1d.test.mjs`, comprobación 37

**Qué vigila.** Qué archivos de `functions/src` se tocaron desde `b023f24` —`git diff --name-only b023f24 --
functions/src` más los archivos nuevos sin seguimiento— y exige que sean exactamente los de las listas nominales.

**Valor anterior.** `[...DEL_HARNESS, ...DE_I18N_DA, ...DE_LA_REVISION, ...DEL_CIERRE, ...DE_LOS_EVALS,
...DE_LA_MISION_FAL, ...DE_LA_MISION_MUNDO3D, <once archivos de F1-D>, ...DEL_CICLO_DE_VIDA_3D,
...DE_LAS_URLS_DEL_STORAGE, ...DE_LA_GOBERNANZA_DEL_MUNDO, ...DEL_COSTE_DE_LO_ACEPTADO,
...DE_VERSIONES_Y_DISPONIBILIDAD]`, sin repetidos y ordenada: 108 archivos.

**Valor nuevo.** La misma expresión con `...DEL_NUCLEO_DE_ACTIVOS` al final (120 archivos), y la etiqueta de la
comprobación nombra la lista nueva. La condición no cambia: igualdad exacta de las dos listas ordenadas.

```js
const DEL_NUCLEO_DE_ACTIVOS = ['functions/src/content/index.ts', 'functions/src/content/indice-almacen.ts',
  'functions/src/content/indice-reconciliacion.ts', 'functions/src/content/indice.ts', 'functions/src/content/versiones.ts',
  'functions/src/core/media/index.ts', 'functions/src/core/media/indice.ts', 'functions/src/core/media/objeto.ts',
  'functions/src/core/media/puerto.ts', 'functions/src/core/media/recoleccion.ts', 'functions/src/core/media/reconciliacion.ts',
  'functions/src/core/media/subida.ts', 'functions/src/media/barrido.ts', 'functions/src/media/recoleccion.ts'];
```

**Motivo.** Son exactamente los catorce archivos de `functions/src` del parche de A1 (5 nuevos: `content/indice.ts`,
`content/indice-almacen.ts`, `content/indice-reconciliacion.ts`, `core/media/indice.ts`, `media/barrido.ts`; 9
modificados). Las correcciones de la integración (B1, B2 y el hallazgo de C) viven en tres de ellos y no añaden ningún
archivo. `content/index.ts` (DEL_CIERRE) y `content/versiones.ts` (DE_VERSIONES_Y_DISPONIBILIDAD) ya estaban: se repiten
para que la lista diga el parche entero; la expresión quita los repetidos.

**Archivos afectados.** `functions/test/puente-pre-f1d.test.mjs` (la lista y la etiqueta de F1). Nada más de esa suite.

## 2. H3 — `functions/test/video-asincrono.test.mjs`, comprobación 58

**Qué vigila.** `git diff --numstat 8e91daa -- functions/src/core`, línea a línea: qué archivos del Core cambiaron y
**cuánto** (líneas añadidas y quitadas), y que F1-A y productions sigan sin tocar.

**Valor anterior.** `CORE_DE_LA_MISION_FAL` (10 líneas) + `CORE_DEL_CICLO_DE_VIDA_3D` (2), ordenadas por ruta: 12 líneas.

**Valor nuevo.** Las mismas + `CORE_DEL_NUCLEO_DE_ACTIVOS`: 19 líneas. La etiqueta nombra el núcleo de activos.

| `numstat` (desde `8e91daa`) | Archivo | Qué es |
|---|---|---|
| `1 0` | `core/media/index.ts` | `export * from './indice'` |
| `747 0` | `core/media/indice.ts` | el modelo puro del índice (nuevo): 741 en el parche (commit `30855bf`) + 6 de la corrección de `resumirConsumidores` (§ 8c de ACTIVOS-INDICE) |
| `107 4` | `core/media/objeto.ts` | estados `candidato`/`borrando` y campos del cerrojo |
| `52 1` | `core/media/puerto.ts` | borrar con generación y reconocer el 412 |
| `7 1` | `core/media/recoleccion.ts` | la clase de referencia `consumidor` |
| `249 1` | `core/media/reconciliacion.ts` | el cruce puro de la reconciliación del índice |
| `2 1` | `core/media/subida.ts` | un objeto en el cerrojo no admite bytes nuevos |

**Motivo.** Son exactamente los siete archivos de `functions/src/core` del parche, con su tamaño real. Ningún contrato
sube de versión.

**Archivos afectados.** `functions/test/video-asincrono.test.mjs` (la constante nueva, la expresión que junta las listas
y la etiqueta de H3). H2 y el resto de la suite, sin tocar.

## 3. Las listas de archivos de Media Cloud

**Qué vigilan.** `fs.readdirSync` de `functions/src/core/media` y de `functions/src/media`, comparado con una lista
escrita entera: cualquier archivo de más o de menos falla. Las cuatro suites repiten las dos comprobaciones.

| Suite | Comprobaciones |
|---|---|
| `media-core.test.mjs` | 135 y 136 |
| `media-proceso-core.test.mjs` | 153 y 154 |
| `media-upload-core.test.mjs` | 149 y 150 |
| `media-delivery-core.test.mjs` | 108 y 109 |

**Valor anterior.** `core/media`: `entrega.ts,index.ts,migracion.ts,objeto.ts,procesador.ts,proceso.ts,puerto.ts,
recoleccion.ts,reconciliacion.ts,registro.ts,subida.ts,uso.ts` («doce archivos»). `media`: `almacen.ts,canary.ts,
catalogo.ts,cloudinary.ts,entrega.ts,falso.ts,firma.ts,fuente-falsa.ts,huella.ts,index.ts,migracion.ts,
procesador-falso.ts,procesador.ts,proceso.ts,r2.ts,recoleccion.ts,reconciliacion.ts,subida.ts,uso.ts` («diecinueve»).

**Valor nuevo.** Las mismas listas con `indice.ts` (en su sitio alfabético) en `core/media` —«trece archivos»— y
`barrido.ts` en `media` —«veinte»—, y una nota que dice de dónde vienen. Ningún comodín: siguen siendo listas enteras.

**Motivo.** Los dos únicos archivos nuevos del parche en esas carpetas. `media/barrido.ts` es la tarea programada del
barrido, **preparada y sin exportar** desde `functions/src/index.ts` (A-11 es una autorización pendiente).

**Archivos afectados.** Las cuatro suites, solo esas dos comprobaciones y la nota.

## 4. El mapa de `runtime-map` — `functions/test/runtime-map.test.mjs`

**Qué vigila.** Mide el compilado (`functions/lib`): recorre los `require` desde `lib/index.js` y comprueba que los
símbolos del Core que nombra el código vivo de fuera del Core son exactamente los declarados, módulo a módulo, y que
ningún módulo del Core se usa sin figurar en el mapa.

**Valor anterior.** `core/media/objeto.js`: `PIEZA_ORIGINAL, RAIZ_DE_CUENTAS, claveDelObjeto, claveEsDeLaCuenta,
objetoEsDeLaCuenta, objetoValido, prefijoDeCuenta, referenciaDelObjeto`. `core/media/puerto.js`: `CAPACIDADES_DE_MC1,
falloDeAlmacen`. Ninguna entrada para `core/media/indice.js`, `core/media/recoleccion.js` ni
`core/media/reconciliacion.js`.

**Valor nuevo.**

| Módulo del Core | Se añade | Quién lo nombra (todos los alcanza `deleteAsset`) |
|---|---|---|
| `core/media/objeto.js` | `referenciaDeAlmacenDe` | `content/indice.js`, `content/indice-reconciliacion.js` |
| `core/media/puerto.js` | `esPrecondicionFallida`, `sabeBorrarConGeneracion` | `content/indice.js` |
| `core/media/indice.js` (nuevo en el mapa) | `POLITICA_DEL_BORRADO_INMEDIATO`, `REGISTRO_DE_CONSUMIDORES`, `cerrar`, `coberturaVigente`, `comoCrearFilaViva`, `decidirBorradoFisico`, `devolver`, `filasEsperadasDeLaFicha`, `flagAbiertaPara`, `leerFlagDelAlmacenDeActivos`, `marcaDeCobertura`, `naceCubierto`, `pasarACandidato`, `reclamar`, `registroDelIndiceValido`, `registroEsDeLaCuenta`, `rescatar`, `resumirConsumidores`, `versionDe` | `content/index.js`, `content/indice.js`, `content/indice-almacen.js`, `content/indice-reconciliacion.js` |
| `core/media/recoleccion.js` (nuevo en el mapa) | `POLITICA_DE_RECOLECCION` (solo su edad mínima) | `content/indice-reconciliacion.js` |
| `core/media/reconciliacion.js` (nuevo en el mapa) | `reconciliarIndiceDeCuenta` | `content/indice-reconciliacion.js` |

Las comprobaciones siguen siendo las mismas; como hay tres entradas más en `OTROS_DEL_CORE`, la de «ningún otro módulo
del Core está siendo usado por producción sin figurar en el mapa» pasa de la 99 a la 102.

**Motivo.** `deleteAsset` (`content/index.js`) carga `content/indice.js`, que reexporta `indice-almacen.js` e
`indice-reconciliacion.js`. **Nombrar no es ejecutar**: con la flag cerrada nada de eso corre. `media/barrido.js` y
`media/recoleccion.js` no son alcanzables (ninguna Function los exporta), y por eso `decidirRecoleccion` y el resto de
MC-5 no aparecen.

**Cómo se generó.** (1) Con las tres claves nuevas vacías y las dos de arriba sin tocar, la propia suite, sobre el
compilado del árbol con el parche, lista lo que «sobra» por módulo; esas listas se copiaron tal cual. (2) Se cotejaron
con una réplica de solo lectura de la misma medida (el grafo de `require` desde `lib/index.js` y los símbolos
`core_N.simbolo` de cada módulo vivo de fuera del Core) que además dice quién nombra cada símbolo: es la tabla de arriba.
(3) La suite entera pasa con el mapa nuevo.

**Archivos afectados.** `functions/test/runtime-map.test.mjs`, solo `OTROS_DEL_CORE` y su comentario.

## 5. Las cercas siguen mordiendo

Cada escenario mete en el árbol un cambio **no autorizado**, corre las siete suites de las cercas y deja cada archivo
exactamente como estaba (contenido y fecha de modificación, comprobados con SHA-256; sin `git checkout`). Ejecutado
sobre el commit `30855bf` (árbol limpio, compilado al día). Solo se enumeran las comprobaciones que fallan **de más**
respecto al árbol tal cual, donde ya fallaba F3 (heredada).

| Escenario | Fallan de más |
|---|---|
| S1 · archivo nuevo en `functions/src/core/media` | F1 (37); «el Core de medios son trece archivos» en las cuatro suites (135, 153, 149, 108); `runtime-map` 2 (fuente sin compilar) |
| S2 · archivo nuevo en `functions/src/media` | F1 (37); «la composición, veinte» en las cuatro suites (136, 154, 150, 109); `runtime-map` 2 |
| S3 · archivo nuevo en `functions/src/content` | F1 (37); `runtime-map` 2 |
| S4 · una línea más en `core/media/uso.ts` (no autorizado) | F1 (37); H3 (58); `runtime-map` 2 |
| S5 · una línea más en `core/media/indice.ts` (autorizado, otro **tamaño**) | H3 (58); `runtime-map` 2. F1 no, porque el nombre sí está autorizado: el tamaño lo vigila H3 |
| S6 · producción nombra un símbolo del Core no declarado (`decidirRecoleccion`, añadido al compilado de `content/indice-almacen.js`) | `runtime-map` 100 (`core/media/recoleccion.js: símbolos nombrados`) |
| S7 · producción nombra un módulo del Core que el mapa no tiene (`decidirMigracion`, de `core/media/migracion.js`) | `runtime-map` 102 (ningún otro módulo del Core sin figurar en el mapa) |

Después de los siete, las siete suites dan exactamente lo mismo que antes, y `git status` está vacío. Herramienta:
`scratchpad/activos-core-trabajo/cercas-muerden.mjs` (de trabajo, fuera del repositorio).

## 6. F3 de `puente-pre-f1d` (comprobación 39): reanclada el 2026-10-10

**Estado anterior.** F3 compara el `git diff --numstat b023f24` de `functions/src/core` y de `functions/src/content` con cifras fijas. Ya estaba en rojo en la base `8fcc5c0`, que esperaba `68 3 content/index.ts` y `126 4 content/materializador.ts`. Después la integración añadió DEC-03, el núcleo H5/H2 y los dos cambios de este cierre (C-1 y A-2) sin reanclar la cerca. Su intención escrita era «del contenido, solo F1-D, el cierre y los derechos», y no incluía DEC-03 ni H5/H2.

**Reanclaje.** Por instrucción del dueño (revisar F3 y reanclarla si está justificado), las cifras esperadas pasan a ser las NETAS del árbol contra `b023f24`. Cada una se atribuye a los commits que la producen:

| Archivo | Antes | Ahora | Commits que lo cambian |
|---|---|---|---|
| `content/index.ts` | 68 / 3 | 388 / 101 | `14d1beb` (cierre), `3faee56` (misión fal), `e526226` (mundo3d), `9469e3a` (DEC-03), `30855bf` y `fa98a29` (H5/H2), `3f52c5e` (C-1) |
| `content/indice-almacen.ts` | archivo nuevo | 298 / 0 | `30855bf`, `fa98a29` (H5/H2) |
| `content/indice-reconciliacion.ts` | archivo nuevo | 392 / 0 | `30855bf` (H5/H2) |
| `content/indice.ts` | archivo nuevo | 709 / 0 | `30855bf`, `fa98a29` (H5/H2); `3c8ac7b` (A-2, +9) |
| `content/materializador.ts` | 126 / 4 | 126 / 4 | sin cambio |
| `content/versiones.ts` | archivo nuevo | 223 / 0 | `9469e3a` (DEC-03) |
| `core/media/index.ts` | archivo nuevo | 1 / 0 | `30855bf` (H5/H2) |
| `core/media/indice.ts` | archivo nuevo | 747 / 0 | `30855bf`, `fa98a29` (H5/H2) |
| `core/media/objeto.ts` | fuera de la cerca | 107 / 4 | H5/H2 |
| `core/media/puerto.ts` | fuera de la cerca | 52 / 1 | H5/H2 |
| `core/media/recoleccion.ts` | fuera de la cerca | 7 / 1 | H5/H2 |
| `core/media/reconciliacion.ts` | fuera de la cerca | 255 / 1 | H5/H2 (`30855bf`); A-2 (`3c8ac7b`) lo llevó de 249/1 a 255/1, la misma cifra que fija H3 |
| `core/media/subida.ts` | fuera de la cerca | 2 / 1 | H5/H2 |

**Justificación.**

1. Ningún cambio de `functions/src/content` o `functions/src/core` queda fuera de la lista. Desde `b023f24` hay 15 commits sin fusión que los tocan (`git log --no-merges -- functions/src/content functions/src/core`), y todos están en la tabla.
2. Las cifras son la suma neta del árbol. No se inventa ninguna: se leen de `git diff --numstat` con el árbol de integración limpio.
3. La cerca sigue siendo de cifras exactas. Un archivo nuevo rastreado o un cambio de tamaño no declarado la rompe (sabotajes S1, S3 y S6 abajo).

**Lo que el reanclaje NO certifica.** Fija el árbol tal cual, no lo aprueba:

- No certifica DEC-03 ni H5/H2. Según el mensaje de `9469e3a`, DEC-03 dejó dos hallazgos abiertos de E-1 (H5 y H-2) que bloquean desplegar E-1. Esta cerca no los cierra ni los acredita; su estado se verifica por separado.
- No ve un archivo nuevo sin `git add` (S2) ni uno fuera de `content/core` (S5). Los caza F1 (comprobación 37).
- No ve una reedición de mismo recuento (S4). La cerca mide cifras, no contenido.

**Sabotajes medidos** (`scratchpad/cierre/F3-sabotajes.json`, worktree temporal detached en `3c8ac7b`, retirado al terminar):

| Escenario | F1 (37) | F3 (39) |
|---|---|---|
| S0 árbol tal cual | PASA | PASA |
| S1 archivo nuevo con `git add` en `functions/src/content` | FALLA | FALLA |
| S2 archivo nuevo sin `git add` en `functions/src/content` | FALLA | PASA (lo caza F1) |
| S3 una línea más en `content/materializador.ts` | PASA | FALLA |
| S4 una línea reeditada en `content/indice.ts`, mismo recuento | PASA | PASA (límite conocido) |
| S5 archivo nuevo sin `git add` en `functions/src/filmmaker` | FALLA | PASA (lo caza F1) |
| S6 una línea más en `core/media/subida.ts` | PASA | FALLA |

**Cambio de intención.** La intención de F3 pasa a ser: del contenido, la adopción de F1-D, el cierre, los derechos, DEC-03 y el núcleo H5/H2; del Core, la misión fal, el linaje 3D y el núcleo H5/H2. Cambia la intención, no la sensibilidad: el número de comprobaciones y la forma de la comparación son las de antes. El dueño puede deshacer el reanclaje con `git revert` del commit de F3; la cerca volvería a rojo.

**Estado posterior (cierre técnico de recuperación, rama `cierre/almacenamiento-recuperacion`).** F3 estaba verde en
`a2b7832` y en `6687f59` (solo pruebas). Dos correcciones de producción la ponen en rojo, y solo por la tercera de sus
condiciones, la del `numstat` de `content/`. Las otras dos (ningún cambio en `filmmaker` ni `productions`, y el `numstat` de
`core/`) se cumplen en todos los commits de la rama.

| Archivo | La cerca fija | Real | Commit |
|---|---|---|---|
| `content/index.ts` | 388 / 101 | 393 / 103 | `b952ab8` (reanudar el borrado pendiente) |
| `content/indice-almacen.ts` | 298 / 0 | 303 / 0 | `7316fcf` (el adaptador no borra sin generación) |
| `content/indice.ts` | 709 / 0 | 768 / 0 | `b952ab8` |

**No se ha reanclado.** El reanclaje exige la autorización del dueño. Una copia temporal del test con solo esas tres cifras
pasa entera; el test real y sus cifras no se tocaron. La alerta no es una regresión: cada corrección se demuestra con su
suite (`activos-recuperacion-caida`: con el código anterior fallan 13 de 30 comprobaciones; `activos-generacion-sdk`: 2 de
16) y la cadena y el barrido, por lo demás, pasan. Conservar las dos correcciones con las cifras actuales solo sería posible
reeditando otras líneas de los mismos ficheros hasta igualar el recuento (el límite S4 de arriba), y eso vaciaría la cerca de
sentido: no se hace.

## 7. Lo que NO se cambia: `ci-workflow` (comprobación 13)

`functions/package.json` no se edita. La comprobación 13 sigue en rojo con exactamente cuatro suites fuera de la cadena:
`activos-indice`, `activos-caminos`, `activos-barrido` y `activos-mutacion`. Las registra el integrador en
`scripts.test`. Las cuatro de emulador (`activos-concurrencia-*`, `activos-reconciliacion`, `activos-barrido`,
`activos-migracion`) no necesitan registro: `functions/test/_emuladores.mjs` recoge todo `*.emulator.mjs` por existir, y
corta una suite a los 300 s (ver el informe de la línea sobre sus duraciones).

## 8. Ninguna otra cerca

No se tocó ninguna otra comprobación de `puente-pre-f1d` (E4, F2, F3, F4…), ni H2 de `video-asincrono`, ni otras
suites, ni `ops/revision/baseline.json`: la puerta G3 pasa sin reanclar nada.

## Línea M (integrador, 2026-10-10): F1 de medios, composición y lectura recursiva

Autorizado por el dueño: «F1 / puente-pre-f1d» y «las listas de archivos de medios afectadas», con cambios mínimos y justificables.

### F1 · functions/test/puente-pre-f1d.test.mjs, comprobación 37

- Valor anterior: la lista de 120 ficheros nominales del parche de A1 y de las demás líneas.
- Valor nuevo: la misma lista más `DE_LA_LINEA_M`, con EXACTAMENTE cuatro ficheros de functions/src:
  `functions/src/media/procesador.ts`, `functions/src/media/optimizador/coste.ts`, `functions/src/media/optimizador/plan.ts` y `functions/src/media/optimizador/transcodificacion.ts`.
- Motivo: la corrección EXIF del procesador y los tres módulos nuevos del optimizador (plan de variantes, coste sin tarifas y contrato de transcodificación).
- Efectividad demostrada (sabotajes temporales en el worktree de integración, borrados después):
  - Archivo nuevo en functions/src/media/ (sin autorizar): la comprobación 37 FALLA.
  - Archivo nuevo dentro de functions/src/media/optimizador/ (sin autorizar): la comprobación 37 FALLA (la detección de cambios de F1 usa git y es recursiva).

### Composición de media · media-core (136), media-proceso-core (154), media-upload-core (150)

- Valor anterior: 20 entradas en la raíz de functions/src/media («veinte»).
- Valor nuevo: 21 entradas, con `optimizador` (subcarpeta) entre `migracion.ts` y `procesador-falso.ts` («veintiuno»).
- Motivo: la subcarpeta nueva del optimizador aparece como una entrada en la lectura de la raíz.
- Efectividad: un archivo nuevo en la raíz de functions/src/media/ hace fallar la composición y F1. Límite conocido: la composición no lista dentro de subcarpetas; esos ficheros los cubre F1 (ver arriba).

### Lectura de fases futuras · media-delivery-core, comprobación 32 («ninguna fase futura se coló en el código»)

- Valor anterior: lectura plana de functions/src/media/ y functions/src/core/media/. Con la subcarpeta `optimizador/`, la lectura fallaba con EISDIR (la prueba cae, no falla limpiamente).
- Valor nuevo: lectura recursiva de ambas carpetas (`archivosRecursivos`). La cobertura AUMENTA: ahora se revisan también los ficheros de subcarpetas.
- Efectividad demostrada: una palabra de fase futura (`lifecycle`) en functions/src/media/optimizador/zz-sabotaje.ts hace FALLAR la comprobación 32 (numeración global 106). Sabotaje borrado después.

### Cadena de pruebas (functions/package.json, scripts.test)

- Registradas: activos-indice, activos-caminos, activos-barrido, activos-mutacion (commit de la integración de S) y medios-optimizador-imagen, -plan, -coste y -transcodificacion (este commit).
- Efectividad: ci-workflow comprobación 13 («toda suite *.test.mjs está en la cadena») pasa; sin el registro falla.

### Pruebas tras el ajuste (worktree de integración)

- puente-pre-f1d: solo falla la comprobación 39 (F3), heredada de 9469e3a.
- media-core, media-proceso-core, media-upload-core, media-delivery-core, media-canary, media-migracion, media-uso, media-reconciliacion: exit 0.
- ci-workflow, runtime-map, video-asincrono: exit 0.
