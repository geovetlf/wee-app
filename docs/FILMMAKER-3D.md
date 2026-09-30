# 3D dentro de Filmmaker: auditoría, mapa e implementación

**Principio.** «3D vive dentro de Filmmaker; Filmmaker no vive dentro de 3D.» UN WEË · UN ASSET ENGINE · UN SISTEMA DE ELEMENTS · UN GRAN MOTOR · MUCHAS EXPERIENCIAS.

Encargo del usuario: 29-09-2026. Trabajo local en `filmmaker/core`, sin push, sin merge ni deploy, sin gasto y sin ninguna puerta abierta.

## A. La arquitectura 3D que YA existía (leída en el código)

| Capa | Qué hay | Dónde |
|---|---|---|
| Content Core (el Asset Engine) | Material de la CUENTA, de tipo **`model3d`**: con dueño, ciclo de vida, entrega y borrado. El materializador reconoce GLB, glTF y OBJ. | `core/content/asset.ts`, `content/index.ts` |
| Runtime del Core | Una salida con modalidad `3d` se guarda como `model3d`. | `runtime/materializacion.ts` |
| Media Cloud | La subida directa (`crearMaterialParaSubida`) admite GLB. **Inactiva para todos.** | `core/media/subida.ts` |
| Mis creaciones | La biblioteca de la cuenta, con el filtro «Modelos 3D» y el icono de cubo. Sin visor. | `MisCreacionesScreen.tsx` |
| Elements | La identidad: de la cuenta, versionada y archivable. Sus referencias a materiales admiten `model3d`. Puerta `elements`: `create`, `get`, `update`, `archive`, `list`, `context`. **No está desplegada en get-wee.** | `core/element.ts`, `elements/` |
| F1-A | Fichas con id persistente, vinculadas a un Element en su versión; los planos y las escenas las señalan por ID. | `filmmaker/modelo.ts` |
| Continuidad | Por identidad: el mismo ID en N planos, y los borradores del Core llevan su Element. | `filmmaker/requisitos.ts` |
| Catálogo del Gran Motor | `3d.generate`, `edit`, `analyze`, `texture`, `retopology`, `rig`, `convert` y `export`, más `scene.generate` y `render.*`. Todas **DECLARED**: sin cadena y sin adaptador. | `core/registry/capabilities.ts` |
| Registro de proveedores | Tripo y Hunyuan 3D, PENDING y sin capacidades. | `registry/matrices.ts` |
| Weë Brain | El Core admite adjuntos `model3d`; el Brain del editor propone fichas. | `core/brain.ts`, `creator/prompts.ts` |
| Seguridad | `puedeReferenciar` exige dueño, estado `ready` y la misma clase. `productions` rechaza al vincular un Element ajeno (`not_found`), archivado, de otra clase o de otra versión. | `core/element.ts`, `productions/index.ts` |

## B. Mapa: capacidad → motor → adaptador → proveedor → material → Element → Filmmaker

| Capacidad | Motor | Adaptador | Proveedor oficial (C.2) | Material | Element | Filmmaker |
|---|---|---|---|---|---|---|
| `3d.generate` · personaje | DECLARED | — | Tripo, Hunyuan 3D (Meshy si hace falta la pose A/T) | `model3d` ✔ | ref ✔ | Reparto › Crear › **En 3D** (cerrada) · la ficha |
| `3d.generate` · objeto | DECLARED | — | Tripo, Hunyuan 3D | ✔ | ✔ | Objetos › Crear › En 3D (cerrada) |
| `3d.generate` · escenario | DECLARED (y `scene.generate`) | — | **World Labs** (ni Tripo ni Hunyuan 3D hacen escenarios) | ✔ | ✔ | Lugares › Crear › En 3D (cerrada) |
| `3d.texture`, `3d.edit` | DECLARED | — | Tripo, Hunyuan 3D | ✔ | — | La ficha, sobre un modelo existente |
| `3d.rig` · animar (**no está en el catálogo**) | DECLARED / — | — | Tripo (7 tipos), Hunyuan 3D (en T), Meshy (texto → movimiento) | ✔ | — | La escena 3D, cuando exista |
| `3d.retopology` | DECLARED | — | Tripo, Hunyuan 3D | — | — | **Filmmaker no la necesita**: el vídeo lo hace Seedance |
| `3d.convert`, `3d.export` | DECLARED | — | Tripo, Hunyuan 3D | ✔ | — | Formatos dentro del adaptador; descargar desde Mis creaciones |
| `3d.analyze` | DECLARED | — | Gemini (visión, sobre vistas) | — | — | No hace falta ahora |
| Importar | subida directa inactiva | — | — | ✔ | ✔ | Crear › **Importar un modelo 3D** (cerrada) |
| Ver | — | — | — (una dependencia: C.3) | ✔ | — | Hoja contextual desde la ficha o el plano |

**Relación con el vídeo, sin inventar compatibilidad.** Seedance no recibe modelos 3D.
1. **Del modelo, sus vistas.** Se renderizan como imágenes y se guardan en el MISMO Element. Entran por la vía de la Fase 18 cuando se abran las referencias en la toma: contrato 1, puerta `aiSettings/referencias`, modelo validado y canary. Las vistas las da el proveedor 3D o un render propio.
2. **De la escena 3D, un clip guía.** Una referencia de movimiento o de cámara: pide el editor, el contrato `staging` de F1-A, un render y el contrato 1.

## C. Estado de cada capacidad

### C.1 Por categoría

| Estado | Capacidades |
|---|---|
| **YA FUNCIONA** (antes de este trabajo) | Material `model3d`; Elements con referencias `model3d`; fichas con ID vinculadas a un Element; continuidad por ID; vincular a un guardado; Weë Brain proponiendo fichas |
| **UX FALTANTE → HECHA ahora** | Guardar para reutilizar · crear desde lo guardado en un paso · crear desde Mis creaciones (imagen o modelo 3D) · desde el plano, «Desde tus guardados» con el MISMO ID · «Detectar el reparto» · las entradas cerradas con su porqué |
| **CONTRATO NECESARIO** (espera autorización) | F1-A `staging` · F1-A tipo de ficha · F1-D contrato 1 · catálogo: `3d.animate` y las variantes de `3d.generate` · motor: pasar `3d.*` a enrutable (`CapabilityId` + `DEFAULT_ROUTING`) |
| **CANARY NECESARIO** | Cada capacidad `3d.*` por proveedor (C.2) · la puerta `elements` en producción (sin gasto; pide deploy) · la subida de Media Cloud (sin gasto; pide activarla) |
| **PROVEEDOR NECESARIO** | `3d.generate` (personaje, objeto, escenario), `texture`, `edit`, `rig`, animar |
| **NO EXISTE** | El visor 3D, el editor de escena 3D, el render de vistas o de clips desde un modelo |

### C.2 Proveedores: solo API oficial, nunca intermediarios (investigación del 29-09-2026, con fuentes)

| Proveedor | Veredicto | Cubre | No cubre | Precio oficial orientativo | Datos y licencia |
|---|---|---|---|---|---|
| **Tripo** (candidata) | ✔ API oficial | texto, imagen y multivista → 3D; criaturas; objetos; PBR y textura; retopología; **riggeo de 7 tipos**; animación por presets (retarget); partes; conversión (GLB/FBX/OBJ/USDZ). Webhooks firmados con HMAC | escenarios; texto → movimiento | 1 crédito = 0,01 USD. Imagen → 3D con textura, 0,30 · texto → 3D, 0,20 · riggeo, 0,25 · animación, 0,10 · conversión, 0,05–0,10 | Los resultados son del cliente; no entrena con tus datos |
| **Hunyuan 3D** (Tencent Cloud, candidata) | ✔ API oficial | texto, imagen y multivista (hasta 7 vistas) → 3D; PBR; edición de textura; topología; riggeo en T; 48 presets de animación; partes; conversión | escenarios; texto → movimiento | ~0,34–0,50 por modelo; riggeo ~0,14–0,20 | **Exige etiquetar lo publicado como generado con IA**; Tencent puede usar el contenido para mejorar su servicio |
| **Meshy** (nueva candidata) | ✔ API oficial (su texto → imagen NO: revende otros modelos) | personaje en **pose A/T**; riggeo humanoide; animación; **texto → movimiento (la única API así)**; retextura; conversión | escenarios; criaturas riggeadas | imagen → 3D ~0,38–0,60; riggeo ~0,06–0,10 | Sin plan Enterprise, entrena con tus datos; **borra los resultados a los 3 días** (hay que guardarlos al momento, algo que el pipeline ya hace) |
| **World Labs** (nueva candidata) | ✔ API oficial | **escenarios navegables** (Marble) desde texto, imagen o vídeo, con malla GLB | objetos sueltos; personajes | ~1,26 por mundo; malla HQ 2,80 | Los resultados son del cliente; en pago se puede excluir del entrenamiento |
| Rodin (Deemos) | ✔ oficial, opcional | calidad «héroe» | riggeo | exige el plan Business: 120 USD/mes | No entrena; borra a los 7 días |
| **BytePlus ModelArk «3D»** | ✘ **revende** Rodin e Hitem3d | — | — | — | Choca con la regla de no usar intermediarios |
| Seed3D (ByteDance) | ✘ solo en Volcano Engine (China) | — | — | — | Sin listado en BytePlus |

**¿Hace falta otro proveedor además de Tripo o Hunyuan 3D?**
- **Sí, para escenarios:** World Labs.
- **Opcional, para texto → movimiento:** Meshy.
- **Las hojas de personaje en varias vistas ya las cubren los proveedores de hoy** (Nano Banana, Seedream, FLUX).

Tripo, Hunyuan 3D, Meshy y World Labs quedan en el registro como **PENDING y sin capacidades**: nada puede elegirlos.

**Canaries 3D propuestos** (cada uno, un pase; céntimos a pocos dólares, precio oficial; nada se ejecuta sin tu autorización):

| Canary | Proveedor | USD aprox. |
|---|---|---|
| 3D-1 personaje, imagen → 3D | Tripo o Hunyuan 3D | 0,30 / 0,50 |
| 3D-2 objeto, texto → 3D | Tripo | 0,20 |
| 3D-3 riggear el personaje | Tripo | 0,25 |
| 3D-4 una animación por preset | Tripo | 0,10 |
| 3D-5 escenario navegable | World Labs | 1,26 |
| 3D-6 convertir a GLB | Tripo | 0,05 |

Antes de cualquier canary hacen falta:
- tu elección de proveedor y su cuenta, con la clave en Secret Manager;
- el adaptador;
- los precios oficiales en el catálogo de Credits;
- pasar `3d.*` a enrutable (contrato del motor).

### C.3 El visor (decisión pendiente)

| Opción | Plataformas | Para qué basta |
|---|---|---|
| `<model-viewer>` (Google) en web + `react-native-webview` en el teléfono | Todas | Ver y girar un modelo (lo más simple) |
| React Three Fiber sobre `expo-gl` | Una sola base de código para las tres | Lo que pediría el editor de escena 3D |

Las dos añaden dependencias. **No se añadió ninguna.** El visor aparecerá en una hoja contextual, nunca como pantalla.

## D. Dónde aparece cada cosa (sin secciones nuevas)

| Sitio que ya existía | Qué se añadió | Estado |
|---|---|---|
| Proyecto › Reparto / Lugares / Objetos | Se queda «Añadir», como antes. Al lado, **«Crear de otra forma»**, que se abre en el sitio de la lista con cinco formas:<br>• Desde tus guardados<br>• Desde Mis creaciones<br>• Imagen con IA<br>• En 3D con IA<br>• Importar un modelo 3D | ✔ · ✔ · cerrada: autorización · cerrada: proveedor · cerrada: activación y visor |
| Cada ficha | **«Guardar para reutilizar»** · «Crear su versión 3D» | ✔ · cerrada |
| Ficha de lugar | «Abrir la escena 3D» | cerrada: editor y contrato |
| Plano › Quién sale / Qué hay / Dónde | **«Desde tus guardados»**: el MISMO ID si ya está en la producción | ✔ |
| Plano | «Puesta en escena en 3D» | cerrada: editor y contrato |
| Proyecto › Referencias | «Modelo 3D» | cerrada: ninguna toma recibe 3D |
| Weë AI Director (caja de Weë Brain) | **«Detectar el reparto»** | ✔ propone; la persona decide |

En el teléfono (360/390) aparecen las mismas piezas en las mismas secciones del editor: «Proyecto» monta el proyecto y la hoja «Ajustes» monta las propiedades del plano.

## E. Lo que el Gran Motor tenía y Filmmaker no alcanzaba

| Qué | Estado ahora |
|---|---|
| `elements.create` | Ya alcanzable (Guardar para reutilizar, Desde Mis creaciones) |
| `elements.update` y `elements.archive` | Siguen sin UI (la biblioteca de Elements no es de Filmmaker) |
| `model3d` en Mis creaciones | Ya alcanzable al crear |
| La subida de Media Cloud | Inactiva |
| El catálogo `3d.*` | Visible y cerrado donde toca |

## F. Duplicaciones evitadas

1. El mapa de entradas (`constants/assetsDeFilmmaker.ts`) no es un segundo registro de capacidades. No guarda proveedores, modelos ni precios, y una prueba lo ata al catálogo del Core.
2. Ni un visor como pantalla, ni una biblioteca 3D, ni una entidad «3DAsset».
3. Desde el plano no se duplican fichas.
4. El Element APUNTA a los materiales, nunca los copia.
5. Las filas de la matriz ya existentes (I02 hoja con IA, I11 escena 3D) se actualizaron en vez de repetirse.

## G. Contratos: actual → cambio → motivo → impacto → alternativa → ¿hace falta ya?

1. **F1-A `staging`.**
   - Actual: `continuity.spatial` en texto.
   - Cambio: la puesta en escena de la escena o del plano: fichas POR ID (posición, rotación, escala), cámara y luces, con versión.
   - Motivo: la escena 3D.
   - Impacto: espejo, validación, firmas de rehacer y pruebas.
   - Alternativa: el texto de hoy.
   - ¿Ya? **No:** sin editor ni render no aporta nada.
2. **F1-A tipo de ficha.**
   - Cambio: humano, criatura, animal o estilizado; habitación, edificio, ciudad, paisaje o fantástico.
   - Motivo: elegir el esqueleto y la forma en 3D, y que la toma lo diga.
   - Impacto: espejo y plantilla de la toma.
   - Alternativa: la descripción, que ya llega.
   - ¿Ya? **No:** hasta que `3d.generate` tenga proveedor.
3. **F1-D contrato 1** (vistas o clip guía como entrada de la toma).
   - ¿Ya? **No:** va con las referencias en la toma.
4. **Catálogo.**
   - Cambio: + `3d.animate` y las variantes de `3d.generate` (personaje, escenario, objeto).
   - Motivo: que Weë Brain y el Planner sepan pedirlas.
   - Impacto: aditivo; la prueba del registro pasa.
   - ¿Ya? No es imprescindible. **Espera tu autorización.**
5. **Motor.**
   - Cambio: `3d.*` en `CapabilityId` y sus cadenas en `DEFAULT_ROUTING`.
   - Motivo: que se puedan enrutar.
   - ¿Ya? Solo con el proveedor elegido y su adaptador.

**Ninguno hizo falta para lo implementado.**

## H. Lo implementado y lo que queda cerrado

**Implementado, sin contratos, gasto ni deploy:**
- guardar para reutilizar;
- crear desde lo guardado y desde Mis creaciones;
- desde el plano, con el mismo ID;
- «Detectar el reparto»;
- las entradas cerradas con su porqué, en los 11 idiomas;
- Meshy y World Labs en el registro, PENDING y sin capacidades.

**Queda cerrado y documentado:**
- los proveedores y sus canaries;
- los contratos de la sección G;
- el visor y su dependencia;
- el deploy de `elements`;
- la activación de Media Cloud.

**No se creó ninguna sección, pestaña, pantalla, ruta, workspace, biblioteca ni motor 3D.**
