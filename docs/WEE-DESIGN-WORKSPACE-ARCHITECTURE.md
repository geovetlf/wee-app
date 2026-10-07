# Weë Design — arquitectura del espacio de trabajo (referencia funcional)

**Qué decide.** La estructura correcta del workspace de Weë Design, capa por capa, desde lo que ya hay en Weë, lo que hacen
los candidatos (Tripo, Meshy, Sloyd, Seed3D 2.0 y los de las investigaciones globales de la Línea B) y lo que Weë Design
necesita (el [mapa maestro](WEE-DESIGN-CAPABILITY-MAP.md), generado del registro, y su razonamiento en la
[matriz](WEE-DESIGN-CAPABILITY-MATRIX.md)). Es **funcional y provisional**: dice qué hay, dónde vive y qué pasa al pulsarlo;
**no** fija la identidad visual, que es otra misión (§19).

**Qué no hace.** No sustituye la pantalla actual: CLAUDE.md §5 dice que las interfaces de Weë AI hechas según
[CREATOR-BUILD.md](CREATOR-BUILD.md) son la referencia visual definitiva y no se rediseñan. Por eso la referencia vive **en
paralelo**, en su ruta y detrás de su puerta (`DESIGN_REFERENCIA_EN_LA_APP = false`), con `DesignScreen` intacta por defecto.
Que algún día la sustituya es **decisión del dueño** (DEC-01).

## 1. Principios

1. **El lienzo en el centro, la caja debajo, los paneles a los lados.** Lo que se crea se ve donde se trabaja.
2. **Un comando, un sitio.** Cada capacidad vive en un lugar (su punto de entrada del registro); la barra de comandos es el
   índice que lleva a ese lugar, no una segunda copia.
3. **Por capacidad, nunca por proveedor.** Ningún botón nombra a nadie; lo que no puede hacerse se ve apagado con su motivo.
   Lo que hoy nadie puede ejecutar **se queda** («NO PERDER NINGUNA CAPACIDAD IMPORTANTE»), y nada se ata a quien la ejecute
   («NO QUEDAR ATADOS A NINGÚN PROVEEDOR»): §11.
4. **Nada duplicado.** Composer = `CajaDePrompt` (Weë Brain); trabajos = `creatorJobs` y el Job Engine; materiales = `assets`;
   proyectos = `creatorProjects`; Credits = Credit Engine; capacidades = el catálogo del Core por su espejo; 3D = el núcleo único
   (`escena3d.ts`). Ver la [auditoría](WEE-DESIGN-UIUX-AUDIT.md) §5.
5. **La potencia después de la intención** (como Weë Studio): primero se dice qué se quiere; los controles aparecen con ello.
6. **Weë Design ≠ Weë Studio → 3D World.** Design es OBJETO · MATERIAL · ESCENA · DISEÑO · ARQUITECTURA · VISUALIZACIÓN;
   3D World es MUNDO · ENTORNO · EXPLORACIÓN. **Comparten Core** (núcleo de escena con perfiles `design` y `world`, materiales,
   linaje, derechos, Credits, Router), **no UX**. Un mundo de Studio entra en Design como **entorno**, por id de material. No se
   rediseña Studio.

## 2. Las capas

| Capa | Qué es | En Weë Design | De dónde sale |
|---|---|---|---|
| 1 · Shell global | La navegación de la app y el marco de Weë AI | La de siempre: en escritorio sin barra inferior; en tableta y teléfono la barra global sigue (ocultarla en el workspace es DEC-05). El marco es **`CreatorShell`**, el mismo que la producción de Filmmaker: en escritorio trae la barra lateral de Weë AI (con el saldo) y la barra superior; en tableta y teléfono, la franja compacta con volver y el saldo, y la caja anclada abajo (`pie`). Así el saldo sale por donde la regla manda (`credits-weeai` 11: solo el marco y las cabeceras dibujan `CreditsPill`) | `NavegacionGlobal.tsx`, `CreatorShell.tsx` |
| 2 · Navegación del workspace | Volver, dónde estoy, en qué proyecto | Barra de comandos: sello «Referencia funcional» · proyecto activo · brújula «Todo lo que hace Weë Design» | `projectsService` |
| 3 · Barra de comandos | El índice de lo que se puede hacer | **Crear · Transformar · Editar · Materiales · Animar · Escena · Imprimir · Entregar**; cada grupo lleva al sitio donde viven sus comandos (§4) y se puede enlazar (`/design/referencia/<grupo>`). El saldo lo pone el marco (capa 1), no esta barra | Registro `constants/designReferencia.ts` |
| 4 · Panel izquierdo (biblioteca) | Lo que hay para trabajar | Pestañas **Creaciones** (las de la cuenta: imagen, modelo 3D, mundo, con filtro) · **Proyecto** (trabajos del proyecto activo) · **Escena** (los papeles del perfil `design`: entorno, objetos, personajes, luz, objetivo de cámara) · **Referencias** (lo adjuntado en esta sesión) | `assetsService`, `projectsService`, `PERFILES_DE_COMPOSICION` |
| 5 · Lienzo (viewport) | Lo que se está mirando | §7: la tira «De la imagen al objeto», la barra del lienzo (vista), lo elegido y lo que sigue | `vistaDeAsset`, `TarjetaTresD`; visor: DEC-09 |
| 6 · Composer | Donde se dice qué se quiere | Debajo del lienzo y anclada: en escritorio, dentro de la columna central con `CajaAnclada` (tope: 45 % de la columna); en tableta y teléfono, como `pie` del marco. **Intención** (Crear · Transformar · Editar), capacidades de esa intención, «¿qué diseñas?» (con «No sé»), fichas y la caja común ([Composer](WEE-DESIGN-COMPOSER-REFERENCE.md)) | `CajaDePrompt`, `CajaQueCrece`, `destinoDeIntencion`, `ContextoDeExperiencia` |
| 7 · Inspector (derecha) | Lo que se sabe y se puede hacer con lo elegido | §8: secciones **Objeto · Material · Textura · Malla · Esqueleto · Animación · Escena · Cámara · Luz · Impresión 3D · Exportar**, solo las que tocan a lo elegido | `vistaDeAsset`, `frasesDeDerechos`, registro |
| 8 · Franja inferior | Lo que está pasando y lo que pasó | **Trabajos** (los de Design y Hogar & Diseño, con el estado unificado) · **Versiones** (apagado hasta el linaje) | `creatorService.getMyJobs` |
| 9 · Biblioteca de materiales | Todo el material de la cuenta | Dentro del panel izquierdo y, entero, en «Mis creaciones» | `assetsService` |
| 10 · Generación y resultado | Pregunta → plan → precio → trabajo → resultado | **`CreatorFlow`**, el de siempre: el workspace le pasa el contexto y recibe la vuelta por los trabajos y los materiales | `CreatorFlowScreen`, `creatorQuote`, `ResultCard` |
| 11 · Entrega | Llevárselo | Inspector · Exportar: descargar, exportar **por destino** con sus ajustes, imprimir, publicar, guardar en proyecto, presentar en vídeo, otros programas (§11.4) | `assetDownload`, `Create` (prefill), `ProjectPicker` |
| 12 · Asistente de diseño | Quien entiende y pregunta | **Weë Brain**, por la misma caja; no hay otro (§12) | CLAUDE.md §10 |

## 3. Disposición por tamaño (sin comprimir el escritorio)

El marco cambia en los cortes de la app (`hooks/useResponsive.ts`: escritorio ≥ 1024), pero **la disposición del workspace se
decide por el ancho que de verdad le queda** (medido), porque en escritorio la barra lateral de Weë AI se come 232 puntos: un
portátil de 1024 deja ~760 para trabajar. La regla del dueño: en el teléfono se **adapta** la navegación, no se encoge el
escritorio ([CREATOR-BUILD.md](CREATOR-BUILD.md) §21).

| | Tres columnas (ancho útil ≥ 1000) | Dos columnas (720–999) | Una superficie (< 720) |
|---|---|---|---|
| Dónde se da | Escritorio de 1280 o más | Escritorio pequeño y tableta | Teléfono |
| Barra de comandos | Una fila: sello, proyecto, brújula, grupos | Igual; los grupos se desplazan en horizontal | Igual, y debajo el **selector de superficie** |
| Biblioteca | Columna fija a la izquierda | Pestaña del **panel lateral** | Superficie |
| Lienzo | Centro | Izquierda, el ancho que sobra | Superficie principal |
| Composer | Anclada bajo el lienzo (escritorio) | Anclada: en la columna (escritorio) o abajo, como `pie` del marco (tableta) | Abajo, como `pie` del marco, **solo** en la superficie «Lienzo» |
| Inspector | Columna fija a la derecha | Pestaña del panel lateral | Superficie |
| Trabajos | Franja inferior | Pestaña del panel lateral | Superficie |
| Selector de superficie | — | — | Lienzo · Biblioteca · Propiedades · Trabajos |

Todas las capacidades siguen al alcance en los tres: lo que en escritorio es una columna, en el teléfono es una superficie
entera, no una columna estrecha. Lo que necesita pantalla propia —la conversación, el plan y el precio— ya la tiene: `CreatorFlow`.

### Medidas (ninguna inventada)

| Medida | Valor | Tipo | Método |
|---|---|---|---|
| Cortes del marco | 768 / 1024 | **REFERENCE** | `hooks/useResponsive.ts` |
| Barra lateral de Weë AI (escritorio) | `scale(232)` | **REFERENCE** | `CreatorSidebar.tsx` |
| Corte a tres columnas | ancho útil ≥ 1000 | **ESTIMATED** | biblioteca 280 + lienzo mínimo 400 + inspector 320 |
| Corte a dos columnas | ancho útil ≥ 720 | **ESTIMATED** | lienzo mínimo 400 + panel 320 |
| Alto del lienzo en tableta y teléfono | 62 % del alto de la ventana, entre 460 y 680 | **ESTIMATED** | que quepan la tira de la cadena, la barra del lienzo, lo elegido y lo que sigue; la caja va aparte, anclada |
| Alto de la barra superior | `scale(64)` | **REFERENCE** | La barra superior de `CreatorShell` |
| Ancho de la biblioteca | `scale(280)` | **REFERENCE** | La barra lateral de escritorio de la app (`leftSidebar`) |
| Ancho del inspector | `scale(320)` | **REFERENCE** | La columna derecha de la app (`rightSidebar`); el panel de Filmmaker usa 380 como techo |
| Alto de la franja de trabajos | `scale(132)` | **ESTIMATED** | Una fila de fichas de trabajo (alto de ficha + aire) |
| Alto máximo de la caja | 45 % del alto de la columna central | **ESTIMATED** | Que al menos media pantalla de lienzo quede a la vista con la caja llena |
| Botones táctiles | 44 de alto mínimo en filas, 40 en fichas | **REFERENCE** | `CajaDePrompt.tsx` (42/50) y las pautas de accesibilidad de la app |

## 4. Dónde vive cada grupo de comandos

El grupo es un **verbo**, no una herramienta (§6). Qué capacidad hay en cada sitio lo dice el registro; esta tabla es su índice.

| Grupo (barra) | Lleva a | Qué hay dentro (filas del mapa) |
|---|---|---|
| **Crear** | Lienzo · caja, intención «Crear» | Concepto (C01, conectado) · vistas (C02) · modelo 3D desde palabras (C03) · inspiración (C06) · lote de fotos (C37) · en piezas (C76) · variaciones (C82) · plantilla 3D (C88) · imagen lista para 3D (C83) · de la idea al objeto (C84) · boceto (C40) · render (C04) |
| **Transformar** | Lienzo · caja, intención «Transformar» | Rediseñar mi espacio (C07, conectado) · de una imagen a 3D (C08) · de varias vistas a 3D (C09) · reconstruir un objeto real (C75) |
| **Editar** | Propiedades · Objeto (+ intención «Editar» en la caja) | Cambiar con palabras (C11, parcial) · otra versión (C12, conectado) · quitar fondo (C13) · más resolución (C14) · rehacer una zona (C39) · cambiar el modelo (C15) · aligerar (C17) · separar y unir piezas (C18, C42) · tamaño real (C19) · estilo (C20) · reparar (C43) · refinar (C80) · ajustar con controles (C86) · volver a generar (C81) |
| **Materiales** | Propiedades · Material / Textura | Materiales y texturas (C16) · retocar una zona (C38) · propiedades del material (C46) · pintar (C90) · textura que se repite (C92) |
| **Animar** | Propiedades · Esqueleto / Animación | Esqueleto (C21) · animar (C22) · movimiento con palabras (C23) · pose (C47) · articular (C77) |
| **Escena** | Biblioteca · Escena y Propiedades · Escena / Cámara / Luz | Componer (C24) · cámaras (C25) · luces (C26) · entorno desde una foto (C05) · fondo (C48) · fondo de 360° (C87) · escena entera (C41) · estructura (C79) |
| **Imprimir** | Propiedades · Impresión 3D | Preparar (C32) · ¿se puede imprimir? (C51) · varios colores (C52) · base o llavero (C91) · al laminador (C53) |
| **Entregar** | Propiedades · Exportar | Descargar (C30, conectado) · exportar para un programa (C31, con sus ajustes, §11.4) · publicar (C33, conectado para imagen) · guardar en proyecto (C34, conectado) · presentar en vídeo (C10) · a tu programa 3D (C70) · listo para simulación (C78) · captura, vídeo girando, sprites (C49, C50, C89) |

## 5. Cómo lo implementa la referencia (código de esta rama)

| Pieza | Archivo | Qué es |
|---|---|---|
| Puerta | `constants/designReferencia.ts` → `DESIGN_REFERENCIA_EN_LA_APP = false` | Cerrada: la ruta existe en la pila, el enlace `design/referencia/:grupo?` solo con la puerta abierta, y la pantalla cerrada no lee ni llama a nada |
| Registro (mapa maestro) | `constants/designReferencia.ts` → `CAPACIDADES_DE_DESIGN` | Las filas C01–C93 en CLAVES (nunca frases): categoría A–L, grupo, punto de entrada, capacidades del Core (o propuestas marcadas), orden (`integracion`), qué necesita, qué le falta, decisiones, elegibilidad **como dato** (sin nombres), jurisdicción, recorrido, salida, impacto en el material, cancelación, experiencia en el teléfono, estado del mapa y quién la ejecuta (`ejecutaPor`) |
| La cadena | `constants/designReferencia.ts` → `CADENA_DE_DESIGN`, `AJUSTES_DE_ENTREGA`, `AJUSTES_DE_GENERACION_3D` | Los seis eslabones con su clase de hoy (§11) y los ajustes de entrega y de creación en 3D, de Weë |
| Puerta de gobierno | `ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false` | Elegir quién ejecuta una capacidad (§16): cerrada no se pinta; abierta, solo «Automático» y todo apagado |
| Disponibilidad | `utils/designReferencia.ts` → `estadoDeLaCapacidad` | Pura. Disponible solo si (1) tiene un manejador de verdad, (2) sus capacidades del Core son `ROUTABLE` en el catálogo **leído del espejo**, (3) no es propuesta, (4) su elegibilidad no la bloquea. Si no, devuelve el motivo, en orden: autorización, revisión, sin candidato, propuesta, Core, escenas, linaje, visor, decisión, servidor |
| Recorrido y cobertura | `utils/designReferencia.ts` → `RECORRIDO_POR_PERFIL`, `recorridoDe`, `coberturaDe`, `loQueFalta` | Los diecinueve pasos de cada capacidad y las doce columnas de la matriz; los documentos de cobertura se **generan** de aquí (`scripts/design-cobertura.mjs`) |
| Trabajos | `utils/designReferencia.ts` | Los quince estados, sus transiciones, la traducción desde `creatorJobs.status` y desde el contrato 3D, la simulación y la cancelación honesta ([flujos](WEE-DESIGN-FLOWS.md) §1) |
| Linaje simulado | `utils/designReferencia.ts` → `simularResultado`, `encadenaCon`, `recorrerCadena`, `pasosDesde` | Un resultado simulado lleva material, trabajo, padre, relación y linaje; si lo de antes le sirve de entrada, entra **por referencia** |
| Contexto hacia Weë Brain | `utils/designReferencia.ts` → `contextoDeDesign` | Arma el `ContextoDeExperiencia` (`workspace: 'design'`, `experienceId` por `destinoDeIntencion` dentro de `design`, `presets`, `adjuntos`, `imageUri`); no interpreta nada |
| Disposición | `utils/designReferencia.ts` → `disposicionDelWorkspace` | Pura: tres columnas, dos o una superficie, según el ancho útil medido |
| Pantalla | `screens/DesignReferenciaScreen.tsx` | El workspace; un manejador por tipo de orden (un `Record` total); `enTemaClaro` |
| Piezas | `components/designReferencia/*` | Barra de comandos, biblioteca, lienzo con la tira de la cadena, composer, inspector, franja, detalle de una capacidad (con su recorrido y su simulación), «Todo lo que hace Weë Design», botón de capacidad (apagado con motivo) |
| Textos | `i18n/textos/*/designRef.ts` | Todo lo visible, en los dieciséis diccionarios |
| Datos de documentación | `docs/wee-design-capacidades.json`, `docs/wee-design-proveedores.json` | Las descripciones del mapa y la **Matriz B** (candidatos por capacidad, dato de la Línea B). La app no los lee; la prueba exige que la elegibilidad del registro sea la que sale de la Matriz B |
| Pruebas | `functions/test/design-referencia.mjs` (grupo I de `foundation-de-experiencias`), `navegacion-enlaces` (31–34), `cajas-weeai` | Ver el informe y §15 |

**Conectado de verdad** (con la puerta abierta y una cuenta): crear un concepto y transformar un espacio (→ `CreatorFlow`), las
creaciones de la cuenta, los proyectos, los trabajos, el saldo, descargar, publicar una imagen, guardar en un proyecto, abrir un
trabajo, los derechos visibles, el selector de fotos. **Apagado con motivo y recorrible en simulación**: todo lo demás.

## 6. Navegación: verbos, no herramientas

**Decisión (DEC-23, de esta misión).** La navegación del workspace son **ocho grupos de comandos con nombre de verbo** (Crear,
Transformar, Editar, Materiales, Animar, Escena, Imprimir, Entregar) y un índice completo («Todo lo que hace Weë Design»). **No**
se copia el riel de módulos por herramienta de un candidato (Agente · Imagen · Modelo · Imprimir · Animar…) ni las rutas por
herramienta de otro, por tres razones:

1. **Nombran herramientas y motores, no resultados.** Weë dice qué consigue la persona; el motor es cosa del Router.
2. **Duplican sitios.** Un riel por herramienta pone cada capacidad en su página; en Weë cada capacidad vive en UN sitio del
   workspace (principio 2) y el grupo solo lleva hasta él.
3. **Rompen el «lienzo en el centro».** Cambiar de herramienta en un candidato cambia la página; en Weë cambia el panel y el
   lienzo se queda.

Lo que sí se toma: **cada grupo se puede enlazar** (`/design/referencia/<grupo>`, solo un id conocido; otro se ignora), como las
herramientas enlazables de las dos referencias. La barra lateral de Weë AI (`CreatorShell`) sigue siendo la navegación entre
experiencias; el workspace no añade otra.

## 7. El lienzo: lo que se ve, poco a poco

De arriba abajo, y **solo cuando hace falta** (divulgación progresiva):

1. **La tira «De la imagen al objeto»** (§11): seis eslabones con su clase de hoy. Toca uno y se abre su detalle.
2. **La barra del lienzo**: girar y encuadrar, modos de vista (con luz, sin luz, sólido, alambre, canales de material), mover,
   girar y escalar. Apagada hasta el visor de Weë (DEC-09); ningún visor de mentira.
3. **Lo elegido**: vacío con invitación · una imagen · la tarjeta 3D de siempre (`TarjetaTresD`) para un modelo o un mundo · un
   trabajo con su primera imagen y su estado · un **resultado simulado** en un marco discontinuo que dice que nada se ha generado,
   con su relación («Sale de…», «Versión nueva de…») y su linaje.
4. **Lo que sigue** (C55): solo las acciones con sentido para ese tipo de resultado (`SIGUIENTES_POR_RESULTADO`). Un archivo
   entregado no tiene «lo que sigue» y lo dice.

## 8. El inspector: «¿qué elegí?» y «¿qué puedo hacer con esto?»

Solo las secciones que tocan a lo elegido (`SECCIONES_POR_SELECCION`): una imagen enseña Objeto y Exportar; un modelo 3D, Objeto,
Material, Textura, Malla, Esqueleto, Animación, Impresión 3D y Exportar; un mundo, Objeto, Escena y Exportar; una escena, Escena,
Cámara y Luz. En **Objeto**, los **datos de producto** —tipo, estado, origen (subido, generado, derivado), fecha, versión,
derechos visibles— **separados de lo interno**: ni proveedor, ni modelo, ni ids de nadie, ni parámetros de una API. Un resultado
simulado enseña además su relación, su trabajo (simulado) y su linaje. **Exportar** enseña los destinos y los ajustes de entrega
(§11.4), apagados con su motivo hasta que Weë convierta modelos.

## 9. Proyecto, material, versión y trabajo: cuatro cosas distintas

| Cosa | Qué es | Dónde vive | En el workspace |
|---|---|---|---|
| **Proyecto** | Agrupa trabajos de varias experiencias | `creatorProjects`; el trabajo lleva su `projectId` | En la barra de comandos (el activo) y en Biblioteca · Proyecto |
| **Material** (asset) | Un archivo de la cuenta con su ficha: clase, estado, derechos, procedencia | `assets` (Content Core), Storage de Weë (`users/{uid}/…`) | Biblioteca · Creaciones; se elige y va al lienzo y al inspector |
| **Versión** | **Otro material** que apunta al anterior por `previousVersionId`; la anterior no se toca | `assets` (`core/content/linaje.ts`: `nuevaVersion`) | Franja · Versiones (apagada hasta que alguien escriba el linaje: P1/P2/P9) |
| **Trabajo** | Una petición con su estado, su plan, su precio y sus resultados | `creatorJobs` (y el Job Engine para lo asíncrono) | Franja · Trabajos; se elige y va al lienzo |

Lo elegido es **un material o un trabajo** (`SeleccionDeDesign`), nunca una mezcla; un resultado simulado es un tercer caso que
no habilita nada real. Las reglas del linaje son las del Content Core y no se reescriben aquí: **editar** deja una versión nueva,
**derivar** deja un material derivado (con `provenance.sourceAssetIds`), **convertir de formato** deja una variante del mismo
material, y **poner en un proyecto, en una escena o publicar** es una referencia que no copia nada
(`CONSECUENCIA_DE_OPERACION`). Los derechos **solo se endurecen** a lo largo de una línea (`combinarDerechos`).

## 10. Trabajos y Credits, para la persona

**Trabajos** ([flujos](WEE-DESIGN-FLOWS.md) §1): quince estados genéricos, los mismos para todo lo que hace Weë Design, sea quien
sea quien lo ejecute. Lo que se promete es lo que se puede cumplir:

- **Avance**: por pasos, salvo que el contrato del trabajo traiga un avance real (ningún candidato 3D lo garantiza; uno da etapas,
  otro solo «en cola» y «trabajando»). Nunca una barra inventada.
- **Tiempo**: no se inventa. Si la capacidad declara una clase de duración («puede tardar varios minutos»: un candidato 3D tarda de
  varios a más de diez), se dice esa clase, sin cronómetro.
- **Salir y volver**: se puede salir; el trabajo sigue y vuelve por la franja y por «Mis creaciones».
- **Cancelar**: «que no empiece» solo en cola; «pedir parar» solo donde la parada se confirma; en el resto, se dice que no se
  puede parar y que lo que salga se guarda. Nunca se finge una cancelación del proveedor.
- **Lo que caduca no se pierde**: el resultado de un proveedor puede caducar (un ZIP a las 24 h) o estar en un cubo público; el
  servidor lo **materializa** enseguida en el Storage de Weë (`content/materializador.ts`) y la persona solo ve su material.
- **Reintentar** es el MISMO trabajo (mismo `requestId`) cuando el desenlace es incierto; una petición = una generación = un cobro.

**Credits** (CLAUDE.md §7, [CREDITS.md](CREDITS.md)): el precio sale **siempre del Credit Engine al cotizar** (`creatorQuote`,
la operación `cotizar` de una puerta asíncrona) y se ve **antes de crear**; la pantalla no tiene ni un número. Lo que no tiene
quien lo haga dice «Precio pendiente: se sabrá cuando haya quien lo haga». Si faltan Credits: WAITING_FOR_CREDITS, nunca FAILED.
Si la IA falla, reembolso automático. En una cadena, **cada eslabón se cotiza** y un plan de varios pasos enseña su total con el
desglose (`StepEstimate`), como ya hace `PlanCard`. Sin reintentos gratis (DEC-18) mientras no se mida el coste real.

## 11. MODEL-AGNOSTIC CHAINING — de la imagen al objeto sin salir de Weë Design

**Lo que pidió el dueño (2026-10-07).** Un candidato hace correr modelos de imagen de terceros **dentro** de su herramienta 3D
(los nombra en el primer control de su caja de imagen), y los candidatos ofrecen complementos para programas 3D. Weë tiene que
poder **encadenar imagen → editar → vistas → 3D → materiales → entregar** sin que la persona salga de Weë Design, con lo que
sale de cada paso entrando en el siguiente **como material o versión con su linaje**, nunca como un archivo descargado y vuelto a
subir; con la capacidad de imagen **que Weë ya tiene**; y sin nombrar a nadie.

### 11.1 Qué capacidades tienen que ser agnósticas de modelo y de proveedor, y por qué

Toda capacidad del registro dice quién la ejecuta (`ejecutaPor`), y eso decide de qué tiene que ser independiente:

| Quién la ejecuta | Cuántas | Tiene que ser agnóstica de… | Por qué |
|---|---|---|---|
| **El motor** (el Router elige) | todas las de IA: generar, editar, vistas, 3D, texturas, malla, esqueleto y animación, escena, imprimir, convertir | **modelo y proveedor**: la orden, sus ajustes, el precio, el trabajo, el material y el texto | 1) CLAUDE.md: «El usuario elige el resultado. Weë elige la IA»; un proveedor nuevo es un adaptador y una línea, y las cadenas se cambian en Firestore. 2) **MAPA 2**: ningún candidato 3D está aprobado; la elegibilidad cambia por contrato y por territorio (uno solo vale en China continental; otro exige autorización escrita; otro Enterprise; otro está en revisión): una interfaz atada a uno se quedaría muerta. 3) La misma capacidad la ofrecen tres o cuatro candidatos con **parámetros distintos** (una imagen o hasta cuatro; GLB o un ZIP con glb/obj/usd/usdz; 100 000 a 1 000 000 de caras o de 100 a 15 000; textura de 128 px a 4K o ninguna): por eso los ajustes son de Weë (`AJUSTES_DE_GENERACION_3D`: para qué es, detalle, malla, color y materiales, pose, estilo) y cada adaptador los traduce; lo que un candidato no sabe hacer lo hace Weë después o ese candidato no sirve para esa petición. 4) Los resultados tienen que ser **materiales de Weë**: las URL de los candidatos caducan o son públicas |
| **Weë sin IA** | proyectos, biblioteca, versiones, linaje, escena, visor, subir, capturar, publicar, descargar | **quién hizo el material** | Una versión, una escena o una descarga funcionan igual con una imagen de Weë que con un modelo de cualquier candidato: trabajan sobre la ficha del Content Core, no sobre el formato de un proveedor |
| **Otro programa** (laminadores, programas 3D) | 2 | **el programa** | Formatos abiertos y ajustes de entrega de Weë (§11.4); un complemento sería de Weë, nunca de un proveedor |

Por eso no hay selector «Automático · uno · otro» (§16): la persona elige el **resultado** y el **para qué**; el Router elige
quién, y la cadena sigue funcionando el día que cambie.

### 11.2 Cómo lo hacen posible las piezas que ya existen

| Pieza | Qué pone en la cadena | Qué existe hoy (código) | Qué falta |
|---|---|---|---|
| **Composer** | Una sola caja para cada eslabón; lo elegido viaja como **contexto** | `CajaDePrompt` + `ContextoDeExperiencia` (`imageUri`, `adjuntos`, `presets`) | Que el contexto lleve **un material por su id** (no una URL ni una foto local) |
| **Agente** | Weë Brain arma el plan de varios pasos y pide el sí al concepto antes del 3D | `CreatorFlow` → `creatorChat` → `creatorQuote` → `creatorRun`; planes con varios pasos (`PlanStep.dependsOn`) | El plan de la cadena (C84, Línea A), con su total y su desglose |
| **Provider Registry** | Capacidad → candidatos elegibles → adaptador, eslabón a eslabón | WEË AI ENGINE: `engine/registry.ts` (imagen: cadena de Weë), elegibilidad y jurisdicción (`engine/elegibilidad.ts`, `engine/jurisdiccion.ts`) | Los adaptadores 3D y su registro (**Línea B**); **ningún** registro propio de Weë Design |
| **Trabajos** | Cada eslabón es un trabajo con su estado y su `requestId` | `creatorJobs`; el Job Engine y la puerta asíncrona del mundo (`creator/mundo.ts`: cotizar · crear · estado · cancelar) | El contrato canónico 3D asíncrono (Línea B) |
| **Credits** | Cada eslabón se cotiza y se cobra por sí mismo | Credit Engine; `aiPricing.ts` (precios de las tarifas oficiales, p. ej. el nivel `ai_image_pro` para la calidad máxima de imagen) | El precio de lo 3D: medir primero `providerCost` (DEC-10) |
| **Materiales** | Lo que sale de un eslabón es un material de la cuenta | `materialesDeResultado` → `crearMaterialDesdeUrl` (Storage de la cuenta, `users/{uid}/ai-generations/`, con `provenance.jobId/stepId/capability`); el motor ya acepta como entrada una imagen de la carpeta de la cuenta (`assertInputImageUrl` → `direccionDeLaCuenta`); la puerta del mundo ya resuelve una entrada **por id de material** en el servidor (`resolverImagen`: de la cuenta, imagen, lista, Storage de Weë) | Que `CreatorFlow`/`creatorRun` acepten esa entrada por id, como el mundo |
| **Versiones y linaje** | Editar → versión; derivar → derivado; convertir → variante; derechos que solo se endurecen | `core/content/linaje.ts`: `nuevaVersion`, `materialDerivado`, `lineaDeVersiones`, `combinarDerechos`, `CONSECUENCIA_DE_OPERACION` — **puras y sin llamadores** | Que la materialización las use (escribir `sourceAssetIds` y `previousVersionId`) |

### 11.3 Cada eslabón, hoy (comprobado en el código el 2026-10-07)

| Eslabón | Capacidad (alternativas) | Entra → sale | Clase | Por qué | Le falta |
|---|---|---|---|---|---|
| **1 · Imagen** | Concepto C01 (imagen lista para 3D C83, boceto C40) | palabras → imagen | **EXISTING** | La plantilla `design` hace el concepto y tres imágenes con `image.generate`, ROUTABLE, por la cadena de imagen de Weë; los resultados se materializan como `assets` | — |
| **2 · Editar** (opcional) | Retocar la imagen C11 (quitar fondo C13, más resolución C14, rehacer una zona C39) | imagen → imagen (versión) | **PARTIAL** | `image.edit`, `image.background_remove`, `image.object_remove` e `image.upscale` son ROUTABLE y la plantilla de fotos ya los usa sobre una foto de entrada; en Weë Design, «editar» hoy **vuelve a crear** con el cambio en palabras | Material como entrada; linaje |
| **3 · Vistas** (opcional) | Vistas del objeto C02 | imagen → imagen (derivado) | **BACKEND_REQUIRED** | No hay capacidad de vistas en el Core; `image.reference` (ROUTABLE, la cadena de Weë) la puede servir como variante `multiview` (DEC-22): no hace falta otro proveedor | La variante y su paso de plantilla; material como entrada; linaje |
| **4 · Modelo 3D** | Desde una imagen C08 (desde vistas C09, reconstruir C75) | imagen → modelo 3D (derivado) | **PROVIDER_REQUIRED** | `3d.generate` es DECLARED: sin adaptador ni cadena; ningún candidato elegible (MAPA 2) | Quien lo haga (Línea B); el linaje |
| **5 · Materiales** (opcional) | Materiales y texturas C16 (retocar una zona C38) | modelo → modelo (versión) | **PROVIDER_REQUIRED** | `3d.texture` es DECLARED; un candidato no texturiza mallas ajenas y otro solo las suyas | Quien lo haga; el linaje |
| **6 · Entregar** | Exportar para un programa C31 (descargar C30, a tu programa C70) | modelo → archivo (variante) | **BACKEND_REQUIRED** | `3d.convert` y `3d.export` son DECLARED; la conversión es de Weë (DEC-20) para que la entrega no dependa de quién hizo el modelo (un candidato solo da GLB; otro elige el formato al crear, dentro de un ZIP) | Un conversor de formatos de Weë |

Los eslabones 2, 3 y 5 se pueden saltar: de la imagen se puede ir directo al modelo, y del modelo directo a entregar
(`pasosDesde`). La tabla generada, con la cadena simulada de punta a punta, está en la
[matriz de cobertura](WEE-DESIGN-COVERAGE-MATRIX.md) §5; la prueba exige que lo que sale de un eslabón sea lo que entra en el
siguiente (también saltando los opcionales), que la operación de cada uno sea la del Content Core, y que su clase cuadre con su
capacidad.

**Cómo se recorre en la referencia**: la tira del lienzo abre cada eslabón en su detalle; «Recorrer en simulación» enseña sus
estados (con el precio dicho como pendiente donde no hay cotización de verdad) y «Ver en el lienzo» deja un resultado SIMULADO
que entra en el siguiente **por referencia** (relación y linaje a la vista en el lienzo y en el inspector); «Siguiente» y «Saltar
a» llevan al paso que toca. Nada se genera ni se cobra.

### 11.4 Programas 3D, laminadores y complementos: capacidades de ENTREGA de Weë

Lo que los candidatos ofrecen como «enviar a Blender, Unity, Unreal, Godot, Maya, 3ds Max, ZBrush, Roblox…» o a un laminador es,
para Weë, **entregar**: capacidades de Weë, no de un proveedor.

| Qué | En Weë Design | Clase | Motivo |
|---|---|---|---|
| **Formato** (GLB, FBX, OBJ, USDZ, STL, 3MF) | Ajuste de C31 | BACKEND_REQUIRED | El conversor de Weë (DEC-20) |
| **Escala y unidades** (mm, cm, m, in, ft; tamaño real) | Ajuste de C31; C19 | BACKEND_REQUIRED | Igual; el tamaño real estimado lo hace un candidato hoy, como parámetro |
| **Ejes** (arriba en Y o en Z) | Ajuste de C31 | BACKEND_REQUIRED | Cada programa espera el suyo; uno de los candidatos orienta por programa al exportar |
| **Punto de origen** (base o centro) | Ajuste de C31 | BACKEND_REQUIRED | Igual |
| **Niveles de detalle** (LOD) | Ajuste de C31; aligerar C17 | BACKEND_REQUIRED / PROVIDER_REQUIRED | El LOD se puede hacer con un reductor de Weë; aligerar con IA es de un candidato |
| **Texturas dentro o aparte** | Ajuste de C31 | BACKEND_REQUIRED | Depende del formato (GLB las lleva dentro; OBJ con su MTL y sus imágenes aparte) |
| **Destino** (juego, animación, impresión, web y AR, imagen de presentación, programa profesional, 🤷) | Destinos de C31 (DEC-06a) | BACKEND_REQUIRED | Cada destino fija un conjunto de ajustes; la persona no tiene que saber de formatos |
| **Descargar** | C30 | EXISTING | `assetDownload` |
| **Al laminador** | C53 | REVIEW_REQUIRED | Un archivo o un esquema de URL del laminador; decisión del dueño (DEC-21) y revisión de cada laminador |
| **A tu programa 3D, con un complemento** | C70 | REVIEW_REQUIRED + BACKEND_REQUIRED | Un complemento «Weë para Blender/Unity/…» necesita una API autenticada para listar y bajar los materiales de la cuenta, vincular el dispositivo y distribuirse en cada tienda: decisión del dueño (DEC-21). Los complementos de los candidatos son para quien tiene cuenta con ellos: **no sirven** a la gente de Weë (MAPA 2: NOT_ALLOWED como integración) |
| **Listo para simulación** (articulaciones, masa, fricción) | C78 | REVIEW_REQUIRED | Solo existe en investigación (sin API); las fuentes se contradicen sobre si es producto |

### 11.5 Los modelos de imagen «dentro» de la herramienta 3D

Un candidato enseña los modelos de imagen de terceros como **primer control** de su caja; otro, con el logo de cada uno y su
tiempo; otro no enseña ninguno (elige por el destino). Weë toma el tercer patrón, que es su regla:

- Los pasos de imagen de la cadena son la **capacidad de imagen de Weë** (`image.generate`, `image.edit`, `image.reference`,
  `image.background_remove`, `image.upscale`, todas ROUTABLE), por el WEË AI ENGINE: **no hay un segundo sistema de imágenes** y
  ningún modelo de imagen de un candidato 3D es candidato de una capacidad de imagen de Weë.
- Lo que la persona puede elegir es la **calidad** (estándar, alta, máxima: `QualityChoice` de `PlanCard`), que decide el nivel
  de precio (`aiPricing`), nunca el nombre de un modelo.
- «Imagen lista para 3D» (C83) es una **variante** de `image.generate` pensada para convertirse en modelo (un objeto, fondo
  limpio, vista clara): BACKEND_REQUIRED, sin proveedor nuevo (DEC-22).

## 12. Weë Brain en Weë Design (el agente)

Hay **una** inteligencia, Weë Brain (CLAUDE.md §10), y la caja de Weë Design es una de sus puertas: el contexto (la intención,
«¿qué diseñas?», lo elegido, lo adjuntado) viaja por `ContextoDeExperiencia` para que no vuelva a preguntar lo que ya está
delante. Lo que se toma del patrón de agente de un candidato —el que mejor encaja con «el usuario elige el resultado»—:
«Automático» por defecto y **ningún** modelo a la vista; pedir el sí al **concepto en 2D antes de pasar a 3D**; y terminar con
**los siguientes pasos** numerados, que en Weë son «Lo que sigue» (C55) en el lienzo. Lo que no se toma: un segundo asistente, un
modo «agente» aparte, recetas guardadas (DEC-19) ni el asistente de otra empresa (C74, fuera de Weë Design). El Algorithm Engine
de la Línea A **no** se toca: la referencia llega a Weë Brain por `CreatorFlow`, como todas las secciones.

## 13. El teléfono: «Design Companion»

En el teléfono Weë Design no es un escritorio encogido: es un **acompañante** con cuatro superficies (Lienzo · Biblioteca ·
Propiedades · Trabajos) y la caja anclada abajo en el Lienzo. Cada capacidad dice cómo es en el teléfono (`movil`):

| Experiencia | Qué es | Ejemplos |
|---|---|---|
| **Completa** | Igual que en el escritorio | Crear, transformar, quitar fondo, modelo 3D desde una imagen, descargar, publicar, imprimir, guardar en un proyecto |
| **Simplificada** | Lo esencial, en una lista en vez de un panel | Componer una escena, cámaras y luces, ajustar con controles (los controles en lista, **nunca escondidos**: un candidato los oculta a 375 px y deja la herramienta coja) |
| **En el escritorio** | Se ve y se explica, y se termina en el escritorio | Pintar sobre el modelo, articular, enviar al laminador o a un programa 3D, listo para simulación |
| **Solo para ver** | Se mira, no se toca | La estructura del objeto |

Lo interno (desplegar las UV) no tiene pantalla propia, tampoco en el teléfono. La conversación, el plan y el precio son
`CreatorFlow`, que ya es pantalla entera en todos los tamaños.

## 14. Atajos entre capacidades

Ninguna capacidad deja a la persona en un callejón: lo que le falta antes tiene un **atajo** («Antes: Concepto y propuestas» en
el modelo desde una imagen, las vistas y el modelo desde varias vistas; «Antes: ¿Se puede imprimir?» en el laminador; «Antes:
Ponerle esqueleto» en animar), y lo que viene después está en **Lo que sigue** del lienzo y del detalle (por tipo de resultado).
La tira de la cadena añade «Siguiente» y «Saltar a». Todos abren el **detalle** de la otra capacidad: desde ahí se usa (si se
puede) o se recorre en simulación.

## 15. Lo que vigilan las pruebas

`functions/test/design-referencia.mjs` (grupo I de `foundation-de-experiencias`, ya en la cadena de `npm test`) ejecuta el
registro y su lógica y hace caer: una capacidad sin punto de entrada o sin recorrido; una orden sin manejador; un resultado sin lo
que sigue; un proveedor o un parámetro de su API en el código o en los dieciséis diccionarios; algo bloqueado (pendiente de
autorización, en revisión, sin candidato, propuesto) presentado como disponible, incluso con todo el catálogo enrutable; un precio
escrito; un trabajo sin estado o una transición que salte el precio; una cancelación que prometa de más; un material sin linaje,
un resultado sin trabajo o una versión sin su anterior; una entrega sin capacidad; una capacidad sin experiencia en el teléfono;
un trabajo sin capacidad; una clave sin traducir; los documentos de cobertura desfasados; una elegibilidad distinta de la Matriz
B; las puertas abiertas; Weë Design de siempre tocado; un segundo sistema; una segunda caja; y una cadena incoherente. Cada
detector lleva su CONTROL. `navegacion-enlaces` (31–34) vigila el enlace con la puerta cerrada y abierta.

## 16. Elegir quién lo hace: normal y avanzado

| Modo | Qué ve la persona | Estado |
|---|---|---|
| **Normal** (siempre) | Nada: ni «Automático», ni un nombre. Elige el resultado y el para qué | Así funciona |
| **Avanzado de gobierno** | En el detalle de una capacidad: «Automático: Weë elige», elegido y apagado; «Elegir quién lo hace», apagado, con «la persona elige el resultado y Weë elige la IA». **Nunca un nombre** | Puerta `ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false`: cerrada no se pinta. Abrirla —y, más aún, nombrar a alguien— exige contrato, revisión de marca y decisión del dueño (DEC-07); en el MAPA 2, que la persona elija proveedor es REVIEW_REQUIRED en todos los candidatos |

## 17. Riesgos

| Riesgo | Mitigación |
|---|---|
| Que la referencia se lea como el diseño final | Sello «Referencia funcional» en la barra; estética neutra con los tokens del tema; misión de identidad aparte (§19) |
| Que alguien la abra sin querer en producción | Puerta en código (`false`), sin enlace con ella cerrada, sin entrada en ningún menú; una prueba lo fija |
| Que un comando apagado parezca roto | Cada uno dice por qué al tocarlo, con su recorrido y su simulación; ninguno queda mudo |
| Que una simulación se tome por un resultado | Marco discontinuo, «Simulado» y «no se ha generado ni cobrado nada»; los ids empiezan por `sim-` y no habilitan descargar, publicar ni guardar |
| Que el registro diga «disponible» de algo que el Core no enruta o que nadie puede servir | La disponibilidad se calcula con el catálogo del Core y con la elegibilidad; la prueba lo fuerza con todo el catálogo enrutable |
| Que la interfaz se ate a un proveedor | Ningún nombre ni parámetro de una API en la app (prueba); los ajustes son de Weë y los traduce el adaptador |
| Duplicar visor, Composer, router, Credits o el registro de proveedores | Prohibido por diseño y vigilado por pruebas; la Matriz B es documentación, no código |
| Que un proveedor caduque o publique un resultado | Se materializa enseguida en el Storage de Weë; la persona nunca recibe la URL de un proveedor |

## 18. Lo que espera al dueño

DEC-01 (sustituir la pantalla), DEC-02 (dónde se entra), DEC-05 (barra global en el teléfono), DEC-06 (destinos de entrega),
DEC-07 (elegir proveedor), DEC-09 (visor), DEC-20 (conversión de Weë), DEC-21 (complementos y laminadores), DEC-22 (variantes de
imagen para 3D), DEC-24 (personas reales en fotos y vídeos) y las D1–D9 de [DESIGN.md](DESIGN.md). Todas en [decisiones](WEE-DESIGN-UIUX-DECISIONS.md).

## 19. La segunda misión (no empieza ahora)

**«TRANSFORMAR WEE DESIGN FUNCTIONAL REFERENCE EN WEE DESIGN IDENTITY»**: lenguaje visual, Composer, navegación, iconografía,
color, tipografía, movimiento, interacción, sistema de paneles, responsive, accesibilidad y marca. Parte de esta referencia
—las funciones ya están todas descubiertas, colocadas y conectadas— y no cambia qué se puede hacer, sino cómo se siente.
