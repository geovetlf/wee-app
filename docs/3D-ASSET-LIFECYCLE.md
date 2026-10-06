# Weë 3D — ciclo de vida, versiones y reutilización de los materiales 3D

**Estado:** preparación de arquitectura. Lo único construido es un módulo puro del Core,
[`functions/src/core/content/linaje.ts`](../functions/src/core/content/linaje.ts), y su suite,
[`functions/test/ciclo-de-vida-3d.test.mjs`](../functions/test/ciclo-de-vida-3d.test.mjs) (77 comprobaciones, $0). **Nada está
conectado a ningún camino de producción, ni desplegado.** Lo que este documento afirma del código está comprobado sobre
`main` (`a735b58`).

La pregunta que contesta: un material 3D generado en una experiencia —un mundo de Weë Studio → 3D World— tiene que
poder usarse en otra —Weë Design → 3D Design, Weë Filmmaker— sin copiarse, editarse sin perder lo anterior y llevar a
todo lo que salga de él la licencia que lo restringe. Y todo eso **sin** una segunda capa de materiales, un segundo
sistema 3D, otro núcleo, otro sistema de proyectos ni otro sistema de derechos.

## 0. Resumen

- **No hace falta ningún campo nuevo.** El contrato canónico de un material 3D **es** `Asset`
  (`core/content/asset.ts`): ya tiene clase (`world`, `model3d`), versión anterior (`previousVersionId`), origen
  (`provenance.sourceAssetIds`), vista previa (`variants`), archivo principal (`storageRef`), formato (`mimeType`),
  metadatos, derechos con jurisdicciones bloqueadas (`derechos`), estado y fechas. Lo que faltaba era la **regla** que lo
  rellena bien y lo lee igual en todas partes: eso es `linaje.ts`.
- **Una versión es otro material**, que apunta a la anterior y la lleva en su procedencia. La anterior no se toca.
  El número de versión se **deriva**; no se guarda.
- **La versión activa es por uso**: cada escena, proyecto o producción apunta al id exacto que usa. Hay una «vigente»
  (la más nueva lista) que se propone y un **aviso** de «hay una más nueva»; nadie se mueve solo.
- **Reutilizar es referenciar.** El mismo mundo en un proyecto de Studio, otro de Design y una producción de Filmmaker
  son tres referencias a **un** id: un material, un objeto. Solo **editar** (versión) y **derivar** (un resultado nuevo)
  crean un material; convertir de formato crea una **variante**.
- **Los derechos solo se endurecen** a lo largo de una línea: lo que sale de un material hereda sus restricciones —
  licencias, atribución, uso comercial, revisión y **jurisdicciones bloqueadas**— sumadas a las de la operación.
- **Hoy ningún camino escribe el linaje ni los derechos** en el material (§1.4): es el primer cambio que hay que hacer en
  los archivos compartidos (§10, P1–P2), que son los que está cambiando la misión paralela de `world.generate` y por eso
  aquí no se tocaron.

## 1. Lo que hay hoy (auditoría)

### 1.1 El material: `functions/src/core/content/asset.ts` (Fase 11 + misión fal)

| Pieza | Qué da ya | Nota |
|---|---|---|
| `AssetKind` | `text`, `image`, `video`, `audio`, `document`, `model3d`, `world` | `world` y `model3d` son aditivos (2026-10-05) |
| `StorageRef` | La identidad del archivo: proveedor, contenedor, clave (y versión del objeto) | La URL se calcula; nunca es identidad |
| `AssetVariant` | `thumbnail`, `poster`, `preview`, `transcoded` | «Una miniatura NO es un material, es una VARIANTE»; se borra con el original |
| `Provenance` | Generación, trabajo, paso, petición, capacidad, proveedor, modelo, coste y **`sourceAssetIds`** | «Lo que convierte una carpeta en una historia» |
| `DerechosDelMaterial` | Revisión, uso comercial, atribución, licencias (≤ 10, https) y **`jurisdiccionesBloqueadas`** (≤ 64, `^[A-Z]{2}$`, grupos como `EU`) | Se copian del gobierno del modelo al generarse y viajan con el material |
| `Asset` | Plano; **`previousVersionId`**; nombre, etiquetas, metadatos escalares; ciclo `uploading → processing → ready`, `failed`, `deleted` | «Una versión nueva es OTRO material» (se rechazó `versions[]` dentro) |
| Funciones | `materialValido`, `materialEsDeLaCuenta`, `retirar` (dice qué objetos borrar), `cadenaDeOrigen` | Puras |

`core/content/vista.ts` ya deduce el **origen** (`subido`/`generado`/`derivado`) de la procedencia, esconde proveedor,
modelo y coste (`generacionVisible`), elige qué objeto enseñar (`representacionPara`: miniatura, vista, original) y
expone `vieneDe` (la versión anterior).

### 1.2 Dónde se guardan y se retiran: `functions/src/content/`

- `crearMaterialDesdeUrl` crea la ficha (acepta `provenance` y `derechos`; **no** acepta `previousVersionId` ni
  `variants`). `tipoPorMime` respeta `world`/`model3d` declarados.
- `leerMaterial` solo lee ids `asset_<32 hex>` (el contrato admite cualquier `[A-Za-z0-9_-]{4,128}`).
- `retirarMaterial` marca la ficha y **borra por clave los objetos de ese material**, sin mirar si alguien más lo usa ni
  si otra ficha apunta al mismo objeto. `anotarVariante` añade una variante.
- Media Cloud (`core/media/`): las claves nacen de cuenta + material + pieza (`accounts/<cuenta>/assets/<material>/<pieza>`);
  la recolección protege ante la duda y ya distingue referencias de material, variante y versión.

### 1.3 Proyectos, escenas, Elements, planos y Filmmaker

| Contrato | Dónde | Qué da ya | Qué falta |
|---|---|---|---|
| `Project` + `ProjectItem` | `core/project.ts` | Relación N:M material ↔ proyecto por **filas** (`claveDeElemento`, `proyectosDe`); «el proyecto organiza, no posee»; el material **no** lleva `projectId` | Nadie escribe `projectItems` (reglas cerradas); la app usa `creatorProjects` + `creatorJobs.projectId` (escalar, por trabajo) |
| `Escena3D` | `core/escena3d.ts` | Un núcleo, tres perfiles (`world`, `design`, `filmmaker`); nodos con papel, `assetId`/`elementId` y transformación; cámaras; zonas; `entorno {worldAssetId, previewAssetId}`; **ids, nunca URL**; `materialesDeLaEscena3D` | Sin persistencia (decisión pendiente); la luz no tiene parámetros; no hay acabados de superficie; no se comprueba la clase de material por papel |
| `Element` | `core/element.ts` | Una cosa con nombre (`scene`, `place`, `object`…) que **referencia** materiales con papel y clase; `puedeReferenciar` (dueño, listo, clase) | — |
| `SceneNode` / `ShotNode` | `core/shot.ts` | El eje temporal; `ElementBinding` (Element + versión); `producedAssetId`; «el grafo ya existe: `Element.related`, `sourceAssetIds`, `previousVersionId`» | Nada propaga `stale` (a propósito) |
| Producción | `functions/src/filmmaker/` | `ProductionReference.kind` admite cualquier `AssetKind` —también `world`—; el servidor (F1-B) comprueba cada `assetId` que entra nuevo con `leerMaterial` + `puedeReferenciar`; la línea de tiempo se deriva; `duplicate` no copia materiales | Los requisitos de un plano solo llevan referencias `image`/`video` (§9.3) |

### 1.4 Quién escribe el material hoy, y lo que **no** escribe nadie

Cuatro caminos crean las fichas de lo que genera la IA (las subidas y el texto tienen los suyos, sin linaje que
escribir): `materialesDeResultado` (`creator/index.ts`, `CreatorFlow`), `materialDeWee`
(`runtime/index.ts`, el conductor del Core), `materializadorDeWee` (`content/materializador.ts`, lo asíncrono) y el vídeo
de Weë Studio (`creator/video.ts`). **Ninguno escribe `previousVersionId`, `provenance.sourceAssetIds` ni `derechos`.**
El adaptador de fal deja los derechos del modelo en `meta.derechos`, y ahí se pierden (`runCapability` descarta `meta`;
`PeticionDeMaterializacion` no tiene dónde llevarlos). Consecuencia: hoy un mundo nacería **sin** sus jurisdicciones
bloqueadas, y nada de lo que saliera de él podría heredarlas. Ver P1–P2.

### 1.5 «Mis creaciones» y Weë Design

- `screens/MisCreacionesScreen.tsx` lista por `ownerAccountId` (las dos caras ven lo mismo) con filtro por clase; abre un
  material en su mesa de trabajo por `metadata.experienceId` + `provenance.jobId`. No conoce versiones.
- El espejo de cliente `services/vistaDeAsset.ts` **no tiene `world`** en su `AssetKind` ni en `CLAVE_DE_TIPO`, ni
  `derechos` en su `AssetDoc`.
- `docs/DESIGN.md` ya pide «extender el linaje (`previousVersionId`, `sourceAssetIds`) al editar» y deja abiertas D3
  (editar) y D7 (puertas 3D).

### 1.6 Qué sería duplicar, y por eso no se hizo

| Tentación | Por qué no |
|---|---|
| Un tipo `Asset3D` o una colección de materiales 3D | `world`/`model3d` ya son clases del único `Asset` |
| `versions[]` dentro del material | `asset.ts` lo rechazó: no se puede consultar ni borrar por versión |
| Un número de versión guardado | Se deriva del orden; guardado sería una segunda verdad |
| `nextVersionId` / «reemplazado por» | Un puntero hacia delante es una segunda verdad (el mismo motivo por el que `ShotNode` no tiene `nextShotId`) |
| `projectId` o `projectIds[]` en el material | `project.ts` lo rechazó: la relación es una fila (`ProjectItem`) |
| Copiar los derechos dentro de la escena | La escena referencia; sus derechos se **calculan** de lo que usa |
| Guardar una escena como material | La escena compone materiales; no es uno |
| Un registro de derechos aparte | `Asset.derechos` ya viaja con el material |

## 2. Las cuatro piezas

```
  PROYECTO  ── organiza (filas ProjectItem; no posee) ──────────────────────────┐
     │                                                                          │
     ├── ESCENA (Escena3D) ── compone por id ──► MATERIAL (Asset) ◄── por id ───┤
     │      modo world  = un MUNDO (Weë Studio → 3D World)    ▲                 │
     │      modo design = Weë Design → 3D Design              │ sourceAssetIds  │
     │      modo filmmaker = previz de Filmmaker              │ previousVersionId
     │                                                        │                 │
     └── PRODUCCIÓN (Filmmaker) ── ProductionReference ──────►┘                 │
            escena → planos → línea de tiempo → ShotNode.producedAssetId ──────┘
```

- **MATERIAL (Asset):** el recurso reutilizable. Bytes con id, dueño (la **cuenta**), procedencia, derechos y ciclo de
  vida. Un mundo es un material de clase `world`; un objeto, de clase `model3d`. Su vista previa es una variante.
- **ESCENA (`Escena3D`):** una composición que **referencia** materiales por id —entorno, nodos con transformación,
  cámaras, zonas—. No tiene bytes ni URL ni derechos propios; vive en un proyecto (`projectId`).
- **MUNDO:** una escena de modo `world` (la experiencia de Weë Studio → 3D World) cuyo entorno es un material `world`.
  «El mundo» como experiencia es la escena; «el mundo» como archivo es el material. Una escena se puede rehacer y mover
  de versión; el material no cambia.
- **PROYECTO:** el contenedor del trabajo de la persona. Agrupa por referencia: la misma cosa cabe en varios.

## 3. El contrato canónico de un material 3D

| Lo pedido | Lo que ya existe | Decisión |
|---|---|---|
| assetId | `Asset.assetId` | Existe. Para el almacén de Weë, `asset_<32 hex>` (lo único que lee `leerMaterial`) |
| assetType | `Asset.kind` (`world`, `model3d`) | Existe |
| version | Posición en su línea por fecha | **Derivado** (`lineaDeVersiones`), no se guarda |
| parentAsset | `previousVersionId` (versión de) + `provenance.sourceAssetIds` (salió de) | Existe; `linaje.ts` los rellena juntos |
| projectId | `ProjectItem` (N:M) y `Escena3D.projectId` | Existe; **no** va en el material |
| source | `provenance` (`capability`, `jobId`, `generationId`…) + `origenDe` | Existe |
| preview | `variants` (`preview`, `thumbnail`) | Existe; ver §8 y P4 |
| main output | `storageRef` (+ `bytes`) | Existe |
| format | `mimeType` | Existe; el de `world_file` aún no está verificado (P4) |
| metadata | `name`, `tags`, `metadata` (escalares acotados) | Existe |
| rights | `derechos` | Existe |
| jurisdiction restrictions | `derechos.jurisdiccionesBloqueadas` | Existe |
| provenance | `provenance` | Existe |
| createdAt / updatedAt / status | `createdAt`, `updatedAt`, `status` | Existe |

**Conclusión: cero campos nuevos.** El único añadido es el módulo `linaje.ts`, con funciones puras sobre esos campos y
tipos de entrada y salida que **no** se guardan en ninguna parte. Un campo opcional `lineaId` solo haría falta si una
línea tuviera que listarse en una sola consulta (P6, aplazado).

## 4. Versiones: V1 → editar → V2

```
   FOTO (image, «subido»)
     │  sourceAssetIds
     ▼
   MUNDO v1 (world) ◄──previousVersionId── MUNDO v2 ◄──previousVersionId── MUNDO v3 (vigente)
     ▲                                     src: [v1]                       src: [v2, foto de referencia]
     └──previousVersionId── MUNDO v2b (rama: otra edición de la v1)        MUNDO v4 (preparándose, «última»)
```

1. **Independientes.** Cada versión es un `Asset` con su id, sus bytes, sus variantes y su ciclo. `nuevaVersion(anterior,
   datos, otrasFuentes)` la construye: misma clase que la anterior (no la elige quien llama), `previousVersionId` = la
   anterior, la anterior la primera en `sourceAssetIds`, nombre y etiquetas heredados, variantes **propias**.
2. **Relación:** `previousVersionId` dice «es la misma cosa, mejorada»; `sourceAssetIds`, «salió de» (la anterior y lo
   que además se usó). Las dos existían; no se inventa una tercera.
3. **Número:** `lineaDeVersiones` recorre hacia atrás hasta la raíz y hacia delante todas las que cuelgan de ella —con
   ramas—, solo de la misma cuenta, y numera por fecha. Si falta una anterior o la cadena se cierra, lo dice
   (`incompleta`) y no inventa nada.
4. **Activa = por uso.** Cada consumidor guarda el id exacto. La línea ofrece `vigenteId` (la más nueva **lista**, la que
   se propone al usarla por primera vez) y `ultimaId` (la más nueva no retirada). `versionMasNueva(linea, enUso)` es un
   **aviso**; cambiar de versión es un acto explícito. Es la misma disciplina que `ElementBinding` (Element + versión) y
   que Filmmaker con `stale`: nada pagado se rehace solo.
5. **Volver atrás** es volver a apuntar la referencia (`volver_a_una_version` → `referencia`) o editar desde la versión
   vieja (una rama). Nunca se modifica ni se borra una versión más nueva, y **nunca se «restaura» compartiendo los bytes
   de la vieja**: `retirarMaterial` borra por clave, así que dos fichas con el mismo objeto se lo borrarían la una a la
   otra (regla 4, `objeto_compartido`).
6. **Retirar una versión** deja su ficha: no renumera nada y la vigente pasa a la más nueva que siga lista. Antes de
   retirar hay que preguntar quién la usa (P5).
7. **Derechos y procedencia se conservan:** los de la versión = los de la anterior + los de las otras fuentes + los de la
   operación (§7); la procedencia lleva la operación (generación, trabajo, paso, petición, capacidad) y las fuentes, que
   pone el linaje y no puede pisar la operación.
8. **Guardarla:** con `create` (idempotente, nunca `set` sobre una existente) y un id `asset_<32 hex>` calculado por
   quien llama, como hace el materializador.

## 5. Reutilización

```
                             ┌─ ProjectItem(proyStudioA, asset, W) ─┐
                             ├─ Escena3D «mundo-a» (world, entorno W)┴─ Proyecto A · Weë Studio → 3D World
  W = asset_… (world) ◄──────┼─ ProjectItem(proyDesignB, asset, W) ─┐
  1 ficha · 1 objeto         ├─ Escena3D «salon-b» (design, nodo W) ┴─ Proyecto B · Weë Design → 3D Design
                             ├─ ProductionReference(kind world, W) ── Producción C · Filmmaker
                             └─ Element «Playa» (refs: W)           ── la cuenta (sin proyecto)
```

El mundo `W` está en tres proyectos de tres experiencias y sigue siendo **un** material con **un** objeto. Cada
consumidor sabe decir qué usa con su propia función, y `usosDelMaterial` / `proyectosQueUsan` / `usosPorVersion` solo lo
juntan (sin guardar nada):

| Consumidor | De dónde salen sus ids |
|---|---|
| proyecto | `ProjectItem` (`kind: 'asset'`) |
| escena3d | `materialesDeLaEscena3D(escena)` + su `projectId` |
| elemento | `Element.refs[].assetId` |
| plano | `ShotNode.producedAssetId` + su `projectId` |
| produccion | `ProductionReference.assetId` |
| contenido | `Content.assetRefs[].assetId` (mientras viva: `usaElMaterial`) |

**Cuándo hace falta un material nuevo** (`CONSECUENCIA_DE_OPERACION`, la tabla entera):

| Operación | Consecuencia |
|---|---|
| añadir a un proyecto · insertar en una escena · colocar (mover, girar, escalar) · añadir a un Element · referenciar en una producción · publicar · volver a una versión | `referencia`: nada se copia |
| renombrar o etiquetar | `misma_ficha` |
| convertir de formato o de calidad | `variante` del mismo material |
| **editar** (otra luz, otra forma, otra textura) | `nueva_version` |
| **derivar** (un vídeo que recorre el mundo, un objeto extraído) | `material_derivado` |
| llevarlo a otra cuenta | `no_admitido`: el material es de su cuenta; una copia arrastraría licencias a quien no las aceptó (decisión de producto y legal si algún día se quiere) |

`materialesQueCompartenObjeto(materiales)` comprueba la regla 4 sobre una cuenta (dos materiales vivos nunca comparten
objeto, ni con otra versión del mismo objeto) y los constructores se niegan a crear un material con los bytes de su
fuente.

## 6. El grafo de escena

`core/escena3d.ts` representa, con un solo contrato para los tres perfiles: **escena** (`Escena3D`), **mundo**
(`modo: 'world'` + `entorno.worldAssetId` + `zonas[].worldAssetId`), **objetos** (nodos `object`/`character`),
**materiales** (por `assetId` o `elementId`, **nunca URL**: lo rechaza la validación), **transformaciones**
(`posicion`, cuaternión, `escala`), **cámaras** (`posicion`, `objetivo`, `fovGrados`) y **luces** (nodos `light`). La
suite comprueba que una escena guarda ids y nada del material (ni referencias de almacén, ni URL, ni derechos), que todo
lo que usa existe como material de la cuenta, y que el perfil `filmmaker` referencia el mismo mundo.

**No es otra capa de materiales:** no tiene bytes, ni procedencia, ni derechos propios; sus derechos se calculan con
`derechosDeLosMateriales(materialesDeLaEscena3D(escena), materiales)`, y si falta la ficha de algo que usa no se afirma
nada (`material_desconocido`).

Lo que falta, como **propuesta** (P7; `escena3d.ts` no se tocó): parámetros de luz, acabados de superficie, la clase de
material esperada por papel, recorridos de cámara para Filmmaker y la colección donde guardar escenas.

## 7. Derechos y procedencia

**La regla:** lo que sale de un material no puede ser más libre que aquello de lo que salió.
`combinarDerechos` junta los de todas las fuentes y los de la operación, dimensión a dimensión:

| Dimensión | Gana | Orden (de menos a más estricto) |
|---|---|---|
| `revision` | la más estricta | `APPROVED` < `REVIEW_REQUIRED` < `BLOCKED_GLOBAL` (el de la elegibilidad) |
| `usoComercial` | el más estricto | `ALLOWED` < `RESTRICTED` < `UNCLEAR` < `NOT_ALLOWED` — lo que no se sabe pesa más que una restricción conocida |
| `atribucion` | exigirla | `false` < `'UNKNOWN'` < `true` |
| `licencias` | **todas** | unión, ordenada |
| `jurisdiccionesBloqueadas` | **todas** | unión, ordenada (los grupos como `EU` se conservan tal cual) |

- **Falla cerrado:** unos derechos que no se entienden no se tratan como ausentes (`derechos_invalidos`), y una unión que
  no cabe en el contrato no se recorta (`no_representables`): recortar sería soltar obligaciones.
- **Una dimensión nueva no se pierde:** si `DerechosDelMaterial` gana un campo (una obligación de etiquetar lo
  generado, de entregar copia de la licencia…), el validador de hoy lo deja pasar, y copiar solo lo conocido lo tiraría.
  Por eso unos derechos con algo que el linaje aún no sabe juntar —también dentro de una licencia— no se juntan
  (`derechos_desconocidos`) y nunca cuentan como igual de estrictos, hasta que se enseñe aquí cómo se endurece.
- **Invariante comprobable:** `derechosNoSeRelajan(hijo, fuentes)` y `almenosTanEstrictos(a, b)`. La suite comprueba que
  muerde con siete formas de relajar.
- **Dónde viajan:** versión (`nuevaVersion`), derivado (`materialDerivado`: vídeo, objeto extraído, vista previa como
  material aparte, la toma de un plano de Filmmaker), escena y producción (`derechosDeLosMateriales`). Un material
  retirado sigue obligando: su ficha y sus derechos se quedan.
- **La procedencia** se conserva igual: la operación (sin proveedor ni modelo en lo que se enseña, `generacionVisible`)
  y las fuentes; `cadenaDeOrigen` vuelve del vídeo a la foto.
- **Lo que NO hace `linaje.ts`:** evaluar si algo se puede enseñar en un sitio. Eso es la regla territorial
  (`abarca` + `GRUPOS_DE_JURISDICCIONES`, en `engine/elegibilidad.ts`), y dónde se aplica a lo que se muestra es una
  decisión pendiente (DECISIONES-PENDIENTES, «Dónde se cumple lo que un material no puede mostrar»). Ver P10.

## 8. «Mis creaciones» → Materiales 3D → Mundo → Objetos → Versiones

```
Mis creaciones
└── Materiales 3D                    kind ∈ {world, model3d}  (una consulta por clase, como hoy)
    └── Playa al atardecer           una LÍNEA: la vigente arriba; «v3 · 3 versiones»
        ├── Objetos                  derivadosDe(ids de la línea): lo que salió del mundo (silla extraída, vídeo)
        ├── Usado en                 usosDelMaterial: proyectos, escenas, producciones (contados, sin copiar nada)
        └── Versiones                lineaDeVersiones: 1 … n, con su estado; «hay una más nueva» por uso
```

Lo que la interfaz futura necesita, y de dónde sale (nada de esto es texto: claves e ids; las frases, por i18n):

| Dato | Fuente |
|---|---|
| Clase, estado visible, origen, nombre, miniatura y vista | `vistaDeMaterial` (ya existe) |
| Línea: raíz, versiones numeradas, vigente, última, incompleta | `lineaDeVersiones` |
| Versión anterior de una ficha | `previousVersionId` / `vieneDe` |
| Objetos y resultados que salieron de un mundo | `derivadosDe` |
| Dónde se usa cada versión | `usosPorVersion` sobre las referencias de cada consumidor |
| Restricciones (licencia, atribución, territorios) | `Asset.derechos` (el espejo de cliente aún no lo trae: P9) |

Leer una línea sin campos nuevos: hacia atrás, lecturas por id; hacia delante, consultas de igualdad
`ownerAccountId == cuenta && previousVersionId == id` (sin índice compuesto). Si las líneas crecieran, P6.

## 9. Studio, Design y Filmmaker

### 9.1 Weë Studio → 3D World
El mundo nace como material `world` (con sus derechos, tras P1) y su escena de modo `world` lo referencia. Editarlo es
`nuevaVersion`; la escena decide cuándo pasarse a la nueva.

### 9.2 Weë Design → 3D Design
Una escena de modo `design` usa el mismo mundo (nodo `environment`) y los mismos objetos `model3d`, por id. Las
ediciones de Design (D3) son `nuevaVersion` con su linaje, como pide `DESIGN.md`.

### 9.3 Weë Filmmaker: material 3D → escena → plano → línea de tiempo
Comprobado en la suite (J1–J6), sin construir Filmmaker:

```
asset world ─► ProductionReference {kind: world, role: location}
            ─► ProductionLocation.referenceIds ─► ProductionScene.locationId ─► ProductionShot(s)
            ─► lineaDeTiempo (derivada) ─► ShotRequirement.input.location ─► toma
            ─► materialDerivado('video', [mundo]) ─► ShotNode.producedAssetId
```

- La producción es válida y está lista con un `world`; el servidor de producciones lo admitiría con la regla de
  siempre (`puedeReferenciar`).
- La toma es un **derivado** del mundo: hereda sus jurisdicciones bloqueadas.
- El perfil `filmmaker` de `Escena3D` referencia el mismo mundo para una previsualización.
- **Nada del contrato lo impide.** Lo que habrá que añadir cuando toque (P8): un enlace opcional de una escena de la
  producción a su `Escena3D`, y que los requisitos dejen pasar referencias `world`/`model3d` a la capacidad que sepa
  usarlas (hoy `REFERENCIAS_DE_IMAGEN_O_VIDEO` las filtra, y es correcto: ninguna capacidad de vídeo consume un mundo).

## 10. Cambios propuestos en archivos compartidos (no se tocaron)

Todos son **aditivos y compatibles hacia atrás**. Van por orden de importancia.

| | Archivos | Qué | Consumidores |
|---|---|---|---|
| **P1** | `gateway/index.ts` (`runCapability`), `creator/index.ts` (`materialesDeResultado`), `runtime/index.ts` (`materialDeWee`), `runtime/materializacion.ts` (`PeticionDeMaterializacion.derechos?`), `content/materializador.ts` | Que `meta.derechos` del adaptador llegue a `crearMaterialDesdeUrl({ derechos })`, validado con `derechosValidos`. Sin esto, la raíz de toda línea 3D nace sin restricciones | Los cuatro caminos que crean fichas; `proveedor-fal`, `texto-material`, `video-asincrono`, `runtime-*` |
| **P2** | Los mismos + `content/index.ts` | Escribir el linaje: `sourceAssetIds` con los materiales de entrada del paso (la foto, si es material) y, en pasos de edición o de derivación, construir la ficha con `nuevaVersion` / `materialDerivado`. Hace falta un escritor que acepte el `Asset` ya construido (o `previousVersionId?` en `NuevoMaterialDesdeUrl`), con `create` | `creator/index.ts`, `creator/video.ts`, `runtime/index.ts`, el materializador |
| **P3** | `creator/inputs.ts`, `services/creatorUploads.ts` | Que la foto que sube la persona tenga ficha (`subido`) cuando se usa, para que la línea empiece en ella (`utils/crearMundo3D.ts` ya admite elegir un material) | `CreatorFlow`, 3D World |
| **P4** | `engine/providers/fal.ts` (`archivosDelResultado`), `fal-modelos.ts` (papel de cada archivo de salida), `content/index.ts` (`tipoPorMime`), `creator/index.ts` | **La vista previa de un mundo es una VARIANTE** (`anotarVariante`, `kind: 'preview'`), no un segundo material `world` (hoy cada archivo de la salida sería un `world`). `entorno.previewAssetId` queda para una portada que elija la persona. Si se prefiere un material aparte, que sea `materialDerivado('image', [mundo])` (hereda los derechos). El formato real del mundo, en `mimeType` cuando se verifique | 3D World, «Mis creaciones», el visor |
| **P5** | `content/index.ts` (`retirarMaterial`, `deleteAsset`), `services/assetsService.ts`, `screens/MisCreacionesScreen.tsx`, i18n | Antes de retirar, preguntar `usosDelMaterial` y contestar `en_uso` con recuentos (sin frases) para que la persona confirme; no borrar un objeto que otra ficha viva usa (`materialesQueCompartenObjeto`) | `deleteAsset` y su pantalla |
| **P6** | `core/content/asset.ts` | *Aplazado.* `lineaId?: string` (la raíz), inmutable, solo si una línea tiene que listarse en una consulta | `lineaDeVersiones`, «Mis creaciones» |
| **P7** | `core/escena3d.ts` | Parámetros de luz en nodos `light` (`luz?: { tipo, color, intensidad }`); **acabados** de superficie por id (`acabados?: { ranura, assetId }[]`; no se llaman «materiales», que en Weë es `Asset`); la clase esperada por papel (`environment` → `world`, `object`/`character` → `model3d`), comprobada donde se guarde la escena con las fichas leídas; recorrido de cámara para Filmmaker; y una colección propia que **no** sea `scenes` (la usa `SceneNode`). Ojo: `validarEscena3D` compara el contrato por igualdad, así que lo aditivo no sube el número (o se valida con `contratoCompatible`) | 3D World, 3D Design, Filmmaker, el espejo de cliente |
| **P8** | `functions/src/filmmaker/` (+ espejo) | `ProductionScene.escena3dId?` (previz), en la lista cerrada de campos; referencias `world`/`model3d` en los requisitos solo hacia una capacidad que las consuma; la toma con su linaje (P2) | Filmmaker F3+ |
| **P9** | `services/vistaDeAsset.ts`, `screens/MisCreacionesScreen.tsx`, i18n | `world` en el `AssetKind` y en `CLAVE_DE_TIPO` del espejo, y su filtro; `derechos` en el `AssetDoc` del espejo para una marca de restricción; las versiones, con un espejo **generado** de `linaje.ts` (como el de Filmmaker), nunca escrito a mano | «Mis creaciones» |
| **P10** | `engine/elegibilidad.ts` → Core | Llevar `abarca` + `GRUPOS_DE_JURISDICCIONES` (puros) al Core para que el motor y lo que enseña (muro, compartir, página pública) usen la misma regla con `jurisdiccionesBloqueadas` | Elegibilidad, publicación |
| **P11** | `services/projectsService.ts`, `components/creator/ProjectPicker.tsx`, `firestore.rules` | Escribir filas `ProjectItem` al «Guardar en proyecto» (la siguiente pieza que ya anota `F11-MIGRACION.md`), en vez del `projectId` escalar del trabajo | Proyectos de las tres experiencias |

## 11. Conflictos futuros

- **`functions/package.json`:** las dos misiones añaden una suite a la misma línea de `scripts.test`. Al fusionar, la
  cadena es la unión (lo exige `ci-workflow` 13).
- **Las guardas de frontera que fijan qué se tocó del servidor:** `puente-pre-f1d` (F1 y F3) y `video-asincrono` (H3)
  enumeran, por nombre y por `numstat` exacto, lo que cambió en `functions/src` y en `functions/src/core` desde su base.
  Esta rama registra sus dos archivos en constantes propias (`DEL_CICLO_DE_VIDA_3D`, `CORE_DEL_CICLO_DE_VIDA_3D`:
  `3 0 core/content/index.ts` y `651 0 core/content/linaje.ts`). La misión de `world.generate` tocará las mismas guardas
  —y cambiará los números de `asset.ts`—: al fusionar, la unión de las listas y los `numstat` recalculados sobre el
  árbol fusionado.
- **`functions/src/core/content/index.ts`:** esta rama añade `export * from './linaje';` justo detrás de `./asset` y una
  línea en su comentario. Si la otra misión añade otro módulo al Content Core, se juntan las dos líneas.
- **Nombres por `export *`:** los de `linaje.ts` no chocan hoy con nada del Core; uno igual añadido en `asset.ts` daría
  `TS2308` al fusionar.
- **La escena de un mundo por id de versión:** `idDeEscenaDelMundo` (en `utils/crearMundo3D.ts`, de la misión de la
  experiencia 3D) deriva el id de la escena del id del material (`mundo_<assetId>`). Con versiones y reutilización, el
  mismo mundo en dos proyectos de Studio daría la misma escena, y al pasar la escena a la v2 su id seguiría diciendo v1.
  Mejor: el id de la composición, o proyecto + raíz de la línea.
- **La vista previa:** `asset.ts` dice «sus variantes son su vista previa»; `Escena3D` tiene `previewAssetId` (un
  material); la experiencia 3D prevé «su vista previa, kind `image`». Hay que elegir una (P4). Este módulo admite las
  dos y, en la segunda, exige heredar los derechos.
- **P1 sin P2:** escribir los derechos en el material raíz basta para un mundo nuevo, pero si las ediciones no pasan por
  `nuevaVersion` (o el mismo `combinarDerechos`), la v2 puede perderlos.
- **Un campo nuevo en `DerechosDelMaterial`** (si la misión de `world.generate` añade, por ejemplo, el etiquetado del
  punto 12 de la política de uso o la copia del acuerdo a terceros): desde ese momento el linaje se niega a crear
  descendientes de los materiales que lo lleven (`derechos_desconocidos`) hasta que `linaje.ts` aprenda cómo se junta.
  Es a propósito —lo contrario sería perderlo en silencio—, y la suite F11 lo vigila.
- **Versiones de contrato por igualdad:** `materialValido` y `validarEscena3D` comparan `contract` con `===`; subir el
  menor invalidaría lo guardado. Lo aditivo no sube número o se valida con `contratoCompatible`.
- **Ids que el almacén no lee:** una versión con un id que no sea `asset_<32 hex>` es válida para el contrato y
  invisible para `leerMaterial`.
- **El espejo de Filmmaker:** si algún día Filmmaker importa `linaje.ts`, entra en `ARCHIVOS_DEL_ESPEJO`
  (`scripts/espejo-filmmaker.mjs`, que también toca la otra misión).

## 12. Pruebas

`functions/test/ciclo-de-vida-3d.test.mjs` — 77 comprobaciones, deterministas, sin red ni proveedores ni Firestore,
sobre el compilado (`npm run build` antes):

| Sección | Qué demuestra |
|---|---|
| A | El mundo es un material: válido, de la cuenta, `world`, derivado de la foto, sin proveedor en lo que se cuenta |
| B | Versionar: otro material, misma clase, apunta a la anterior, la anterior intacta; 12 formas de no crear nada, cada una con su motivo |
| C | Recuperar una versión: línea desde cualquier miembro, ramas, vigente y última, aviso por uso, otra cuenta fuera, cadena rota o cerrada, retirada sin renumerar |
| D | Reutilizar es referenciar: la tabla de consecuencias, Design mueve la escena y no el material, Element, volver a una versión |
| E | Un material en Studio A, Design B y Filmmaker C: un id, un objeto, usos sin repetir, cada uso en su versión |
| F | Derechos: unión estricta, canónica, falla cerrado, herencia en versiones y derivados, la invariante muerde (7 formas), los de una escena, y una dimensión nueva no se pierde |
| G | Procedencia: la operación y las fuentes, que nadie pisa; de vídeo a foto; lo que se cuenta; lo que salió de un mundo |
| H | Vista previa separada: variante, original aparte, muere con el mundo, propia de cada versión; como material aparte, con derechos |
| I | La escena referencia por id, no guarda nada del material, rechaza URL; el perfil de Filmmaker |
| J | Filmmaker: material 3D → escena → plano → línea de tiempo → toma derivada con sus restricciones |
| K | Sin duplicación: seis usos, un material; compartir objeto se detecta y no puede nacer; lo que nace es un `Asset` |
| L | Fronteras: Core puro, sin proveedores, sin tipos ni contratos nuevos, una sola puerta, un solo núcleo 3D, en la cadena |

Además se sabotearon 16 reglas del módulo compilado (perder jurisdicciones, tirar una dimensión desconocida, aceptar fuentes ajenas, no comprobar el
objeto compartido, que gane la primera y no la más estricta…): las 16 ponen la suite en rojo.

Fuera de esta suite solo cambian dos guardas de frontera, para registrar los dos archivos del Core que toca esta rama
(`puente-pre-f1d` F1/F3 y `video-asincrono` H3, §11), y la cadena de `npm test`.
