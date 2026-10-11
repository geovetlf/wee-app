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
`a2b7832` y en `6687f59` (solo pruebas). Cuatro commits de producción la ponen en rojo (`b952ab8`, `7316fcf`, `b41999f` y
`f96212a`), y solo por la tercera de sus condiciones, la del `numstat` de `content/`. Las otras dos (ningún cambio en
`filmmaker` ni `productions`, y el `numstat` de `core/`) se cumplen en todos los commits de la rama, y los commits que solo
tocan pruebas o documentos no mueven ninguna cifra (análisis commit a commit en `r4-f3-por-commit.log`).

| Archivo | La cerca fija | Real | Commits |
|---|---|---|---|
| `content/index.ts` | 388 / 101 | 393 / 103 | `b952ab8` (reanudar el borrado pendiente) |
| `content/indice-almacen.ts` | 298 / 0 | 303 / 0 | `7316fcf` (el adaptador no borra sin generación) |
| `content/indice.ts` | 709 / 0 | 812 / 0 | `b952ab8` (+59), `b41999f` (+36: la concesión se comprueba antes del borrado físico) y `f96212a` (+8: también las marcas y las filas vivas) |

### Auditoría del 2026-10-11 y decisión de reanclar

El dueño autorizó el 2026-10-11 reanclar F3 **en la rama local** solo si una auditoría independiente demostraba que las
diferencias son legítimas, que las correcciones deben conservarse y que la nueva referencia representa exactamente el
estado aprobado. La auditoría se hizo sobre `238ad84` (árbol limpio). Antes de editar nada se registraron el estado de Git,
la salida completa del fallo y su desglose por archivo; la cerca no se tocó hasta cerrar la auditoría.

**Las tres cifras, reproducidas.** Con el comando de la propia cerca (`git diff --numstat b023f24 -- functions/src/content`)
y por otros caminos (`r5-auditoria-cifras.log`, `r5-index-ts-algoritmos.log`):

| Cifra | Antes | Ahora | Cómo se reprodujo | Qué lo causa |
|---|---|---|---|---|
| `content/index.ts` | 388 / 101 | 393 / 103 | el comando de la cerca; el cambio de la rama es +5 / −2 con el algoritmo por defecto, `--minimal`, `--patience` e `--histogram` | `b952ab8`: el tipo de `ya_retirado` (1 línea) y el campo `pendingPhysicalDeletion` de la respuesta del callable |
| `content/indice-almacen.ts` | 298 / 0 | 303 / 0 | el comando de la cerca, y contando las líneas del archivo (nuevo respecto a la base) | `7316fcf`: el borrado sin generación se rechaza (+7 / −2) |
| `content/indice.ts` | 709 / 0 | 812 / 0 | el comando de la cerca, y contando las líneas del archivo (nuevo respecto a la base) | `b952ab8` (+59: la reanudación), `b41999f` (+36: la comprobación previa de la concesión) y `f96212a` (+8: las marcas y las filas vivas) |

Los valores «Antes» son los de la constante de la cerca y coinciden con lo que git daba en `a2b7832`, donde F3 estaba verde.
Ninguna cifra sale de la copia temporal del diagnóstico anterior: el reanclaje se hace con lo que da el comando sobre la rama
real. Los otros tres archivos de `content/` (`indice-reconciliacion.ts` 392 / 0, `materializador.ts` 126 / 4,
`versiones.ts` 223 / 0), los 19 de `core/` y `filmmaker`/`productions` no cambian. `git log a2b7832..238ad84 -- functions/src`
son exactamente los cuatro commits de arriba, y el test de F3 es byte a byte el de `a2b7832`; tampoco cambiaron
`ops/revision/baseline.json`, `functions/package.json` ni el corredor de la cadena.

**Una advertencia sobre la propia cerca.** El nivel absoluto de `content/index.ts` depende del algoritmo de diff por defecto
de git: con `--minimal`, `--patience` o `--histogram` el archivo da 384 / 97 en `a2b7832` y 389 / 99 en HEAD, y con el
algoritmo por defecto 388 / 101 y 393 / 103 (la misma diferencia de 4 / 4 líneas en los dos puntos). La cerca mide con el
algoritmo por defecto y el reanclaje conserva su método; lo que no depende del algoritmo es el cambio, +5 / −2. No está
demostrado que otra versión de git (la de la CI) dé las mismas cifras. En los otros dos archivos, nuevos respecto a la
base, todos los algoritmos coinciden.

**Las correcciones, revisadas.** Cuatro commits de producción, 117 líneas añadidas (31 de comentarios). Se revisaron a
mano, con una revisión independiente de solo lectura de los cuatro y otra anterior de la comprobación previa y de su
suite (sin pasarles mis conclusiones), con las pruebas y con la prueba inversa:

- `b952ab8` (repetir la retirada reanuda el borrado pendiente): solo llama a `completarBorrado`, así que se aplican la
  misma reclamación y la misma decisión de MC-5 (marcas, concesión, cobertura, filas vivas, consumidores); un reintento no
  borra nada que la decisión proteja; solo el dueño lo dispara (el callable exige sesión y T1 comprueba la cuenta antes de
  reanudar); la marca `pendingPhysicalDeletion` solo baja cuando no queda nada pendiente. Es idempotente. Quitada del
  código final, fallan 13 de 30 de `activos-recuperacion-caida`.
- `7316fcf` (el adaptador no borra sin generación): cerrado por defecto. Sin generación, vacía o que no sea texto no se
  pide nada al SDK; un estado desconocido no autoriza un borrado. Quitada, fallan 2 de 16 de `activos-generacion-sdk`.
- `b41999f` y `f96212a` (la comprobación previa al borrado físico): solo puede impedir un borrado que MC-5 ya había
  autorizado, y toda lectura fallida lo impide. Quitada entera, fallan 26 de 59 de `activos-lease-antiguo`; quitadas solo
  las marcas y las filas, 4 de 59. Cada condición rota por separado en el código compilado hace fallar la suite (11 de 11
  mutantes que cambian el comportamiento; el único que sobrevive es equivalente).
- Con cada corrección quitada y restaurada, los ficheros compilados vuelven a tener el mismo hash.
- Ninguna rebaja una protección frente a `a2b7832`; el Core (`core/`) es idéntico. Ninguna cambia consumidores, flags,
  reglas ni Credits (el diff de producción se limita a tres archivos de `content/`).

**Lo que la revisión encontró y no se corrige aquí.** Todo es latente: en producción los consumidores se declaran
desconocidos y ninguna reclamación prospera, y la reconciliación no tiene llamador. Se anota para quien siga:

- El barrido y el colector MC-5 (`media/barrido.ts`, `media/recoleccion.ts`) reclaman y borran sin la comprobación
  previa. No están cableados (severidad media si se cablearan).
- La ventana entre la comprobación y la petición: el SDK reintenta (tres veces, hasta 600 s) las peticiones con
  precondición de generación y `rescatar` conserva la generación. No hay margen mínimo de concesión.
- La comprobación no relee las fichas vivas por clave (las que la reclamación cuenta), la flag ni la cobertura.
- Una negativa por `marcado`, `referenciado` o `referencias_inciertas` no devuelve el objeto: queda `borrando`, y un
  objeto `borrando` no se entrega por el camino de entrega de MC (`core/media/entrega.ts`). Solo ocurre en estados
  contradictorios o con una lectura fallida; lo resuelve la caducidad de la concesión, la reconciliación o una persona.
- `b952ab8`: la reanudación no tiene disparador automático ni en el cliente (`MisCreacionesScreen` quita el elemento tras
  una llamada); una lectura fallida a mitad del bucle rechaza el callable tras cerrar algún objeto (se puede repetir); no
  repasa las marcas de otras fichas por los objetos que cerró una pasada interrumpida; el registro de la ficha se lee sin
  forzar su `assetId`, igual que la primera retirada.
- Un comentario de `content/index.ts` (el de `retirarMaterial`, «no hay ninguna operación que la complete…») ya no es
  cierto con la flag abierta. Reescribirlo con las mismas líneas no mueve la cifra de este archivo (comprobado sobre una
  copia temporal: 393 / 103 antes y después); si cambia el número de líneas, hay que mover el ancla otra vez.
- `7316fcf`: `esObjetoAusente` toma cualquier 404 (también un cubo inexistente) por «ya no estaba», y el puerto sigue
  declarando `object.delete`.
- Sin demostrar en infraestructura real: si el Storage contesta 404 o 412 a un DELETE condicional de un objeto ya borrado.
  Con un 412, un borrado físico completado cuyo cierre falló se devolvería con `generacion_distinta` sin cerrarse jamás
  (falla cerrado, no borra de más).
- Fuera de esta rama, alcanzable hoy: el borrado de la foto única de WeeTalk (`burnViewOnce`) no usa índice, concesión ni
  generación (ver `docs/ACTIVOS-CONCURRENCIA.md`).

**La suite G del barrido: tres barridos, dos fallos.** `activos-concurrencia-3-g` obtuvo ✔ en 164,9 s en el barrido de
`382b604` (`r3-barrido.log`, 40 / 40), ✘ en 82,6 s en el de `238ad84` (`r4-barrido.log`, 39 / 40), ✘ en 115,2 s en el de
`bba4363` (`r5-barrido.log`, 39 / 40) y ✔ en 134,6 s en un tercero sobre `bba4363` con el diagnóstico cargado
(`r5-barrido-diag.log`, 40 / 40; ya estaba en marcha cuando se pidió no lanzar más barridos y no se lanzó ninguno después).
Los dos fallos tienen la misma firma: `Transaction lock timeout`, código 10, «not classified as transient». Es la que la
cabecera de la propia suite documenta desde antes de esta rama («Sin reintento, la excepción escapa, tumba la suite y no
prueba nada»). La producción de `238ad84` y la de `bba4363` es la misma (mismos hashes compilados).

Lo que se midió sobre la causa, con el diagnóstico `r5-diag-ab-resumen.txt` y `r5-barrido-diag.lock10.log`:

- En una ejecución que pasa, la suite recibe de 3 a 10 rechazos con código 10, de 8 a 10 s de espera cada uno. En el tercer
  barrido fueron 10: nueve en la transacción de la reclamación (`reclamarParaBorrar`, `indice.js:294`), que `completarBorrado`
  captura, y uno en la primera transacción de `retirarConIndice` (`indice.js:559`), que en esa ejecución no hizo fallar la
  suite. Ninguno es de las dos lecturas de la comprobación previa, que están en un `try` y no pueden ser la excepción que
  escapa.
- Con el código de producción de `a2b7832` (sin las cuatro correcciones) la suite, aislada, recibe un número parecido de
  rechazos (7, 3 y 3 frente a 3, 5, 5 y 4 con el final) y pasa las tres veces.
- Aislada y con la máquina quieta pasa 8 de 8 con el código final y 8 de 8 con el de la base; el grupo de las cuatro
  suites de concurrencia, 2 de 2.
- Con el código final, 26 ejecuciones: 22 ✔ y 4 ✘ (tres con esa firma y una de arranque, un `ECONNABORTED` al subir al
  emulador de Storage sin ejecutar ninguna comprobación). Con el de la base, 11 ✔ y 0 ✘. El brazo «sin `f96212a`» del
  experimento no se ejecutó por un error de nombre de archivo de mi script.

Conclusión: es la intermitencia del emulador bajo bloqueos que la suite ya documentaba, y las correcciones no cambian cuántos
bloqueos recibe. No se midió la tasa de fallo de la base con potencia suficiente, así que no se descarta que las correcciones
la aumenten algo, y por eso el barrido no se da por verde: el resultado es 40 / 40 una vez y 39 / 40 dos veces, y la suite
queda como intermitente. No se ha tocado la suite.

**Decisión: reanclar.** Se cumplen las siete condiciones (cifras reproducidas, causa de cada una identificada, correcciones
revisadas y probadas, las otras dos condiciones de F3 intactas, alcance de F3 sin cambios, propuesta correspondiente a
`238ad84` y a los mismos ficheros compilados, y ninguna señal de que se normalice una regresión). El reanclaje es un
commit aparte que solo toca `functions/test/puente-pre-f1d.test.mjs`: las tres cifras de
`CONTENIDO_DE_LA_MISION_Y_DE_LOS_ACTIVOS` y su comentario de historial, con los valores anteriores. No se añade ninguna
exclusión, no se cambia ningún `git diff` de la cerca ni se toca ninguna otra comprobación, cerca o baseline.

**Huellas del estado aprobado** (para el registro: la cerca mide tamaños, estas huellas fijan el contenido).

| Archivo (`functions/src/content/`) | blob de git en `238ad84` | blob en `a2b7832` |
|---|---|---|
| `index.ts` | `545c6f21cc1ae90ffd486a6ad2f0834ce813415d` | `0dc2fcb391ab54cf57026877d2cfc5ec8e1fe602` |
| `indice-almacen.ts` | `eec934da207d87f0eb134d908d4a78b5a1238fd7` | `b16909040fee49a0b2c0a53498ed561289e10a7f` |
| `indice.ts` | `424d254cf5110c4e777cff9804abe13b033fbe38` | `f63a9d838713e4ea35004685f433c83dc4b34aa7` |
| `indice-reconciliacion.ts` | `a21853914d35bf2e5bae1d5b264389ac29591032` | igual |
| `materializador.ts` | `646a6497accfa5186d1aa83728af4c2975ad5e2c` | igual |
| `versiones.ts` | `b7d61f9e2333c50212eaf47433bbbb047e8321fc` | igual |

Compilado (sha256 de `functions/lib/content`): `indice.js` `e91cd7f8235f637f4ae97867127079d5a35855893647d5953c4a01ccf4df13d6`, `index.js`
`9adde7e44bf6ee02897f52595131f43215837e902b7b35b59fb44b54765d7934`, `indice-almacen.js` `3d0637c3acf58731be218cd84189b7e8ca6d6be5ac52e91648273647622ba8e9`.

**Resultado tras el reanclaje (`bba4363`).** El commit solo cambia `functions/test/puente-pre-f1d.test.mjs` (+7 / −2): cinco
líneas de comentario y las dos de la constante `CONTENIDO_DE_LA_MISION_Y_DE_LOS_ACTIVOS`. El código de la comprobación, los
`git diff` que compara y las demás comprobaciones son los de antes.

| | Antes (`238ad84`) | Después (`bba4363`) |
|---|---|---|
| F3 aislada (`node test/puente-pre-f1d.test.mjs`) | exit 1 · 40 ✔ · 1 ✘ (la 39) | exit 0 · 41 ✔ · 0 ✘ |
| Cadena sin emulador (`node test/_cadena.mjs`) | 299 / 300 · 19 995 ✔ · 343 s (solo F3) | 300 / 300 · 19 996 ✔ · 440 s |

Pasa por la corrección y no por una relajación: la evaluación de las tres condiciones con las constantes del propio test da
`=` en los 19 archivos de `core/` y en los 6 de `content/`, y la cerca sigue mordiendo. Con el árbol ya reanclado, una línea
más en `content/indice.ts` (S1) o en `core/media/indice.ts` (S2) la hace fallar, y una en `productions` (S3) hace fallar F1 y
F3. Un cambio de contenido con el mismo número de líneas (S4) no lo ve: el límite ya documentado. Con el árbol de
`a2b7832`, la referencia nueva no se cumple: fallan exactamente las tres cifras (`r5-f3-referencia-nueva-contra-a2b7832.log`).

Regresión posterior, sobre código de producción idéntico al de `238ad84` (mismos hashes de lo compilado): build y `tsc`
con salida 0; recuperación 30 / 30, MC-9 32 / 32, A-2 70 / 70, frontera del SDK 16 / 16 y lease 59 / 59, con el corredor
oficial; `media-objetos`; las tres puertas ligeras y las 23 políticas. No se repitió la exportación web (92 ficheros, sin
secretos ni código del servidor, huella idéntica a la de las rondas anteriores), ni el grupo `activos-`, ni el barrido
completo más allá de los tres descritos: el reanclaje solo toca un test y documentos.

**Lo que el reanclaje no certifica.** Fija el árbol tal cual, no lo aprueba para producción. La cerca sigue midiendo
tamaños, no contenido: una edición del mismo tamaño pasa desapercibida (el límite S4 de arriba). Siguen sin demostrar en
infraestructura real la garantía de `ifGenerationMatch`, los reintentos del SDK, la ventana entre la comprobación y la
petición, y la latencia y la concurrencia entre instancias de Cloud Functions.

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
