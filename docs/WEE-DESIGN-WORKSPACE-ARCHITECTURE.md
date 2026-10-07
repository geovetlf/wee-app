# Weë Design — arquitectura del espacio de trabajo (referencia funcional)

**Qué decide.** La estructura correcta del workspace de Weë Design, capa por capa, desde lo que ya hay en Weë, lo que hacen
Tripo y Meshy y lo que Weë Design necesita ([matriz](WEE-DESIGN-CAPABILITY-MATRIX.md)). Es **funcional y provisional**: dice
qué hay, dónde vive y qué pasa al pulsarlo; **no** fija la identidad visual, que es otra misión (§8).

**Qué no hace.** No sustituye la pantalla actual: CLAUDE.md §5 dice que las interfaces de Weë AI hechas según
[CREATOR-BUILD.md](CREATOR-BUILD.md) son la referencia visual definitiva y no se rediseñan. Por eso la referencia vive **en
paralelo**, en su ruta y detrás de su puerta (`DESIGN_REFERENCIA_EN_LA_APP = false`), con `DesignScreen` intacta por defecto.
Que algún día la sustituya es **decisión del dueño** (DEC-01).

## 1. Principios

1. **El lienzo en el centro, la caja debajo, los paneles a los lados.** Lo que se crea se ve donde se trabaja.
2. **Un comando, un sitio.** Cada capacidad vive en un lugar (su «UX location» de la matriz); la barra de comandos es el índice
   que lleva a ese lugar, no una segunda copia.
3. **Por capacidad, nunca por proveedor.** Ningún botón nombra a nadie; lo que no puede hacerse se ve apagado con su motivo.
4. **Nada duplicado.** Composer = `CajaDePrompt` (Weë Brain); trabajos = `creatorJobs`; materiales = `assets`; proyectos =
   `creatorProjects`; Credits = Credit Engine; capacidades = el catálogo del Core por su espejo; 3D = el núcleo único
   (`escena3d.ts`). Ver la [auditoría](WEE-DESIGN-UIUX-AUDIT.md) §5.
5. **La potencia después de la intención** (como Weë Studio): primero se dice qué se quiere; los controles aparecen con ello.
6. **Weë Design ≠ Weë Studio → 3D World.** Design es OBJETO · MATERIAL · ESCENA · DISEÑO · ARQUITECTURA · VISUALIZACIÓN;
   3D World es MUNDO · ENTORNO · EXPLORACIÓN. **Comparten Core** (núcleo de escena con perfiles `design` y `world`, materiales,
   linaje, derechos, Credits, Router), **no UX**. Un mundo de Studio entra en Design como **entorno**, por id de material. No se
   rediseña Studio.

## 2. Las capas

| Capa | Qué es | En Weë Design | De dónde sale |
|---|---|---|---|
| 1 · Shell global | La navegación de la app y el marco de Weë AI | La de siempre: en escritorio sin barra inferior; en tableta y teléfono la barra global sigue (ocultarla en el workspace es DEC-05). El marco es **`CreatorShell`**, el mismo que la producción de Filmmaker (`ProductionScreen.tsx:215`): en escritorio trae la barra lateral de Weë AI (con el saldo) y la barra superior; en tableta y teléfono, la franja compacta con volver y el saldo, y la caja anclada abajo (`pie`). Así el saldo sale por donde la regla manda (`credits-weeai` 11: solo el marco y las cabeceras dibujan `CreditsPill`) | `NavegacionGlobal.tsx`, `CreatorShell.tsx` |
| 2 · Navegación del workspace | Volver, dónde estoy, en qué proyecto | Izquierda de la barra superior: ← · «Weë Design» · sello «Referencia funcional» · selector de proyecto | `projectsService.list` |
| 3 · Barra de comandos | El índice de lo que se puede hacer | **Crear · Transformar · Editar · Animar · Escena · Entregar**; cada grupo lleva al sitio donde viven sus comandos (§4). El saldo lo pone el marco (capa 1), no esta barra | Registro `constants/designReferencia.ts` |
| 4 · Panel izquierdo (biblioteca) | Lo que hay para trabajar | Pestañas **Materiales** (los de la cuenta: imagen, modelo 3D, mundo) · **Proyecto** (trabajos del proyecto activo) · **Escena** (los papeles del perfil `design`: entorno, objetos, luces, objetivo de cámara) · **Referencias** (lo adjuntado en esta sesión, con su clase) | `assetsService`, `projectsService`, `PERFILES_DE_COMPOSICION` |
| 5 · Lienzo (viewport) | Lo que se está mirando | Vacío con invitación · imagen del material elegido · tarjeta 3D (`TarjetaTresD`) mientras no haya visor. Encima, la **barra del lienzo**: vista (imagen / 3D), cámaras, modos de vista, luz, medir — apagados hasta que exista el visor | `vistaDeAsset`, `TarjetaTresD`; visor: DEC-09 |
| 6 · Composer | Donde se dice qué se quiere | Debajo del lienzo y anclada: en escritorio, dentro de la columna central con `CajaAnclada` (tope: 45 % de la columna); en tableta y teléfono, como `pie` del marco (la misma caja anclada de Weë Brain, que se apoya en el teclado). **Intención** (Crear · Transformar · Editar), fichas de lo adjuntado y la caja común | `CajaDePrompt`, `CajaQueCrece`, `destinoDeIntencion`, `ContextoDeExperiencia` |
| 7 · Inspector (derecha) | Lo que se sabe y se puede hacer con lo elegido | Pestañas **Propiedades** (clase, estado, origen, derechos, versiones, usos) · **Cambiar** (editar) · **Animar** · **Entregar** | `vistaDeAsset`, `frasesDeDerechos`, registro |
| 8 · Franja inferior | Lo que está pasando y lo que pasó | **Trabajos** (los de Design y Hogar & Diseño, con el estado unificado) · **Versiones** (apagado hasta el linaje) | `creatorService.getMyJobs`, `claveDelEstado` |
| 9 · Biblioteca de assets | Todo el material de la cuenta | Dentro del panel izquierdo (Materiales) y, entero, en «Mis creaciones» | `assetsService` |
| 10 · Generación y resultado | Pregunta → plan → precio → trabajo → resultado | **`CreatorFlow`**, el de siempre: el workspace le pasa el contexto y recibe la vuelta por los trabajos y los materiales | `CreatorFlowScreen`, `creatorQuote`, `ResultCard` |
| 11 · Entrega / export | Llevárselo | Inspector · Entregar: descargar, exportar **por destino**, imprimir, publicar, guardar en proyecto, presentar en vídeo | `assetDownload`, `Create` (prefill), `ProjectPicker` |
| 12 · Asistente de diseño | Quien entiende y pregunta | **Weë Brain**, por la misma caja; no hay otro | CLAUDE.md §10 |

## 3. Disposición por tamaño (sin comprimir el escritorio)

El marco cambia en los cortes de la app (`hooks/useResponsive.ts`: escritorio ≥ 1024), pero **la disposición del workspace se
decide por el ancho que de verdad le queda** (medido), porque en escritorio la barra lateral de Weë AI se come 232 puntos: un
portátil de 1024 deja ~760 para trabajar. La regla del dueño: en el teléfono se **adapta** la navegación, no se encoge el
escritorio ([CREATOR-BUILD.md](CREATOR-BUILD.md) §21).

| | Tres columnas (ancho útil ≥ 1000) | Dos columnas (720–999) | Una superficie (< 720) |
|---|---|---|---|
| Dónde se da | Escritorio de 1280 o más | Escritorio pequeño y tableta | Teléfono |
| Barra de comandos | Una fila: sello, proyecto, grupos | Igual; los grupos se desplazan en horizontal | Igual, y debajo el **selector de superficie** |
| Biblioteca | Columna fija a la izquierda | Pestaña del **panel lateral** | Superficie |
| Lienzo | Centro | Izquierda, el ancho que sobra | Superficie principal |
| Composer | Anclada bajo el lienzo (escritorio) | Anclada: en la columna (escritorio) o abajo, como `pie` del marco (tableta) | Abajo, como `pie` del marco, **solo** en la superficie «Lienzo» |
| Inspector | Columna fija a la derecha | Pestaña del panel lateral | Superficie |
| Trabajos | Franja inferior | Pestaña del panel lateral | Superficie |
| Selector de superficie | — | — | Lienzo · Biblioteca · Inspector · Trabajos |

Todas las capacidades siguen al alcance en los tres: lo que en escritorio es una columna, en el teléfono es una superficie
entera, no una columna estrecha. Lo que necesita pantalla propia —la conversación, el plan y el precio— ya la tiene: `CreatorFlow`.

### Medidas (ninguna inventada)

| Medida | Valor | Tipo | Método |
|---|---|---|---|
| Cortes del marco | 768 / 1024 | **REFERENCE** | `hooks/useResponsive.ts:15-19, 51-53` |
| Barra lateral de Weë AI (escritorio) | `scale(232)` | **REFERENCE** | `CreatorSidebar.tsx:110-113` |
| Corte a tres columnas | ancho útil ≥ 1000 | **ESTIMATED** | biblioteca 280 + lienzo mínimo 400 + inspector 320 |
| Corte a dos columnas | ancho útil ≥ 720 | **ESTIMATED** | lienzo mínimo 400 + panel 320 |
| Alto del lienzo en tableta y teléfono | 45 % del alto de la ventana, entre 240 y 520 | **ESTIMATED** | que quepan el lienzo y la caja anclada sin desplazar en un teléfono de 640 de alto |
| Alto de la barra superior | `scale(64)` | **REFERENCE** | La barra superior de `CreatorShell` (`CreatorShell.tsx:416-423`) |
| Ancho de la biblioteca | `scale(280)` | **REFERENCE** | La barra lateral de escritorio de la app (`MainStackNavigator.tsx`, `leftSidebar`) |
| Ancho del inspector | `scale(320)` | **REFERENCE** | La columna derecha de la app (`rightSidebar`); el panel de Filmmaker usa 380 (`ProductionScreen.tsx:224-226`) como techo |
| Alto de la franja de trabajos | `scale(132)` | **ESTIMATED** | Una fila de fichas de trabajo (alto de ficha + aire) |
| Alto máximo de la caja | 45 % del alto de la columna central | **ESTIMATED** | Que al menos media pantalla de lienzo quede a la vista con la caja llena |
| Botones táctiles | 42 / 50 | **REFERENCE** | `CajaDePrompt.tsx:233-251` |
| Alto de la barra global inferior | `scale(52)` (46,8 en web) | **REFERENCE** | `BarraInferior.tsx:74`, `utils/scale.ts` |

## 4. Dónde vive cada grupo de comandos

| Grupo (barra) | Lleva a | Qué hay dentro |
|---|---|---|
| **Crear** | Composer, intención «Crear» | Concepto y propuestas (C01, conectado) · vistas (C02) · modelo 3D desde texto (C03) · render (C04) · entorno (C05) · inspiración (C06) |
| **Transformar** | Composer, intención «Transformar» | Rediseñar mi espacio (C07, conectado) · de una imagen a 3D (C08) · de varias vistas a 3D (C09) · presentar en vídeo (C10) |
| **Editar** | Inspector · Cambiar (necesita algo elegido) | Cambiar la imagen (C11) · otra versión (C12, conectado como «recrear») · quitar fondo (C13) · más resolución (C14) · cambiar el modelo (C15) · materiales (C16) · separar en partes (C18) · tamaño real (C19) |
| **Animar** | Inspector · Animar | Esqueleto (C21) · animar (C22) · movimiento desde una frase (C23) |
| **Escena** | Biblioteca · Escena | Componer (C24) · cámaras (C25) · luces (C26) |
| **Entregar** | Inspector · Entregar | Descargar (C30, conectado) · exportar para… (C31; aligerar C17 va dentro) · imprimir (C32) · publicar (C33, conectado para imagen) · guardar en proyecto (C34, conectado) · importar un modelo (C35, en la biblioteca) |

## 5. Cómo lo implementa la referencia (código de esta rama)

| Pieza | Archivo | Qué es |
|---|---|---|
| Puerta | `constants/designReferencia.ts` → `DESIGN_REFERENCIA_EN_LA_APP = false` | Cerrada: la ruta existe en la pila, el enlace `design/referencia` solo con la puerta abierta, y la pantalla cerrada no lee ni llama a nada |
| Registro de capacidades | `constants/designReferencia.ts` | Las filas C01–C36 del MAPA 1 en CLAVES (nunca frases), con su grupo, su capacidad del Core (o propuesta marcada), dónde viven, de qué dependen, decisiones y el estado de elegibilidad **como dato** |
| Disponibilidad | `utils/designReferencia.ts` → `estadoDeLaCapacidad` | Pura. Una capacidad solo está disponible si (1) tiene un punto de integración real, (2) su capacidad del Core es `ROUTABLE` en el catálogo **leído del espejo**, (3) no espera backend, proveedor, decisión ni visor. Si no, devuelve el motivo |
| Estados de trabajo | `utils/designReferencia.ts` | Los once del dueño (+ NOT_AVAILABLE, CANCELLING), sus transiciones y la traducción desde `creatorJobs.status` |
| Contexto hacia Weë Brain | `utils/designReferencia.ts` → `contextoDeDesign` | Arma el `ContextoDeExperiencia` (`workspace: 'design'`, `experienceId` por `destinoDeIntencion` dentro de `design`, `presets`, `adjuntos`, `imageUri`); no interpreta nada |
| Disposición | `utils/designReferencia.ts` → `disposicionDelWorkspace` | Pura: tres columnas, dos o una superficie, según el ancho útil medido |
| Pantalla | `screens/DesignReferenciaScreen.tsx` | El workspace; `enTemaClaro` |
| Piezas | `components/designReferencia/*` | Barra, biblioteca, lienzo, composer, inspector, franja, botón de capacidad (apagado con motivo) |
| Textos | `i18n/textos/*/designRef.ts` | Todo lo visible, en los dieciséis diccionarios |
| Ruta | `MainStackNavigator.tsx` (`DesignReferencia`), `App.tsx` (enlace con la puerta abierta) | — |

**Conectado de verdad** (con la puerta abierta y una cuenta): crear un concepto y transformar un espacio (→ `CreatorFlow`), los
materiales de la cuenta, los proyectos, los trabajos, el saldo, descargar, publicar una imagen, guardar en un proyecto, los
derechos visibles, el selector de fotos para referencias. **Apagado con motivo**: todo lo demás, cada cosa con el suyo.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Que la referencia se lea como el diseño final | Sello «Referencia funcional» en la barra; estética neutra con los tokens del tema; misión de identidad aparte (§8) |
| Que alguien la abra sin querer en producción | Puerta en código (`false`), sin enlace con ella cerrada, sin entrada en ningún menú; una prueba lo fija |
| Que un comando apagado parezca roto | Cada uno dice por qué (motivo + dependencia) al tocarlo; ninguno queda mudo |
| Que el registro diga «disponible» de algo que el Core no enruta | La disponibilidad se calcula con el catálogo del Core; una prueba hace caer cualquier capacidad disponible que no sea `ROUTABLE` |
| Duplicar el visor o el Composer | Composer = `CajaDePrompt`; visor = el de Weë (DEC-09); pruebas que lo vigilan |
| Ocultar la barra global en el workspace del teléfono | No se hace: es DEC-05 |

## 7. Lo que espera al dueño

DEC-01 (sustituir la pantalla), DEC-02 (dónde se entra), DEC-05 (barra global en el teléfono), DEC-09 (visor) y las D1–D9 de
[DESIGN.md](DESIGN.md). Todas en [decisiones](WEE-DESIGN-UIUX-DECISIONS.md).

## 8. La segunda misión (no empieza ahora)

**«TRANSFORMAR WEE DESIGN FUNCTIONAL REFERENCE EN WEE DESIGN IDENTITY»**: lenguaje visual, Composer, navegación, iconografía,
color, tipografía, movimiento, interacción, sistema de paneles, responsive, accesibilidad y marca. Parte de esta referencia
—las funciones ya están todas descubiertas, colocadas y conectadas— y no cambia qué se puede hacer, sino cómo se siente.
