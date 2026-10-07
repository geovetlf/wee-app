# Weë Design — Tripo como referencia funcional

**Qué es este documento.** Lo que Tripo ofrece, leído **por capacidad**, para saber qué tiene que poder hacer Weë Design. No es
una integración ni una recomendación de proveedor: **Tripo es un candidato a ejecutar capacidades de Weë, no una capacidad de
Weë.** La persona nunca ve su nombre; el AI ROUTER elige entre los proveedores autorizados (CLAUDE.md: «El usuario elige el
resultado. Weë elige la IA»).

**Dos mapas que no se mezclan** (instrucción del dueño, 2026-10-07):
- **MAPA 1 — capacidades de Weë Design** ([matriz](WEE-DESIGN-CAPABILITY-MATRIX.md)): qué puede hacer Weë Design.
- **MAPA 2 — elegibilidad de proveedor y comercial** (Línea B): quién puede ejecutar cada capacidad y en qué condiciones.
  Aquí solo se cita como dato; este documento no decide elegibilidad.

**Método y límites.** Sin cuenta, sin sesión, sin claves, sin llamadas a la API y sin descargas. Los hechos de la API son los
del informe de la Línea B (fuentes oficiales leídas el **2026-10-07**; índice en `developers.tripo3d.ai/llms.txt`, referencia
en `developers.tripo3d.ai/en/docs/…`, términos en `developers.tripo3d.ai/en/terms`, actualizados el 2025-07-11). Lo que la
interfaz pública de la web enseña viene del investigador de UX de la Línea C (§7). Toda medida que no sea oficial va marcada
**REFERENCE / ESTIMATED**. No se copia nada de su marca: ni logos, ni iconos, ni imágenes, ni textos, ni estilos.

## 1. Qué ofrece, por capacidad

| Lo que la persona consigue | Operación oficial (API v3) | Confirmada | Capacidad de Weë |
|---|---|---|---|
| Un modelo 3D desde una descripción | `generation/text-to-model` (familias H y P) | Sí | `3d.generate` (DECLARED) |
| Un modelo 3D desde una foto o un boceto | `generation/image-to-model` | Sí | `3d.generate` |
| Un modelo 3D desde varias vistas (frontal obligatoria, mínimo 2) | `generation/multiview-to-model` | Sí | `3d.generate` |
| Varias vistas coherentes de un objeto a partir de una imagen | `generation/image-to-multiview` (4 vistas) · `edit-multiview` | Sí | **propuesta**: `image.multiview` o variante `multiview` de `image.generate` |
| Una imagen desde texto o desde otra imagen | `generation/text-to-image` · `image-to-image` (modelos de terceros; una familia deja marca de agua invisible) | Sí | `image.generate` / `image.edit` (Weë ya las sirve) |
| Texturas y materiales PBR (y volver a texturizar) | `models/texture` (texto, imagen de estilo, 1 o 4 vistas; hasta 8K) | Sí | `3d.texture` (DECLARED) |
| Cambiar de formato | `models/convert` → GLTF, FBX, USDZ, OBJ, STL, 3MF | Sí | `3d.convert` (DECLARED) |
| Traer un modelo propio | `models/import` (GLB/GLTF/FBX/OBJ/STL ≤ 150 MB) | Sí | ninguna: es una **subida** al Content Core (`model3d`) |
| Refinar un borrador · estilizar | `models/refine` · `models/stylize` | **Parcial** (solo tabla de equivalencias y un SDK) | `3d.edit` (DECLARED) · propuesta de variante `stylize` |
| Saber si se puede animar | `animations/rig-check` (gratis) | Sí | parte de `3d.rig` |
| Esqueleto automático (bípedo, cuadrúpedo y otras morfologías) | `animations/rig` | Sí | `3d.rig` (DECLARED) |
| Animaciones predefinidas | `animations/retarget` | Sí | **propuesta**: `3d.animate` |
| Separar en partes · completar partes | `mesh/segment` (geométrica o semántica) · `mesh/complete` | Sí | **propuesta**: `3d.segment`; completar como variante de `3d.edit` |
| Simplificar la malla (retopología, quads, low-poly) | `mesh/decimate`; parámetros `quad`, `smart_low_poly`, `face_limit` | Sí | `3d.retopology` (DECLARED) |
| Escala real en metros | parámetro `auto_size` | Sí | **propuesta**: variante `resize` de `3d.edit` |
| Gaussian splat | `generation/image-to-splat` | **Parcial** (solo un SDK) | ninguna (sin caso de uso definido en Weë) |
| Mundos o escenas | — | **No existe** | `world.generate` lo sirve otro candidato |
| Animación libre desde texto | — | **No existe** | — |
| Cancelar una tarea | — | **No documentado** | — |

## 2. Cómo vive una tarea

- **Asíncrona**: cada operación devuelve un `task_id`; el estado se pregunta (cada 1–2 s, con un tope) o llega por un **webhook de
  cuenta** firmado (HMAC-SHA256), nunca por petición.
- **Estados**: `queued → running → success | failed | cancelled`, más `banned` (contenido) y `expired` (archivos ya no disponibles).
- **Progreso**: un entero de **0 a 100** por tarea. Es un dato que Weë hoy no enseña en ningún trabajo (el progreso de Weë es
  por pasos, a propósito: `JobProgress.tsx:20-25`).
- **Dinero**: los créditos del proveedor se **congelan** al crear y **solo se cobran si sale bien**; una tarea fallida o cancelada
  no se cobra. No hay clave de idempotencia: **cada envío se factura**.
- **Tiempos orientativos** (oficiales, ficha del modelo H3.1): ~40 s sin textura, ~120 s con textura.
- **Concurrencia por cuenta** (por defecto): 10 tareas H, 5 P, **1 de imagen**, 10 de animación, 5 de procesado, 10 de malla.

## 3. Lo que sale

- **GLB con PBR** (base color, metallic, roughness, normal) y una **imagen de vista previa**; `quad=true` fuerza FBX.
- Conversión a GLTF, FBX, USDZ, OBJ, STL y 3MF, con opciones de texturas, escala, pivote, animación y preajustes para
  herramientas de 3D.
- Las URLs son **firmadas y temporales** (unos 5 min según los SDK oficiales): hay que copiar el resultado al Storage de Weë en
  el momento, como ya hace el materializador con los mundos.

## 4. Lo que entra

Imágenes JPEG/PNG (≤ 20 MB, recomendado ≥ 256×256), modelos GLB/GLTF/FBX/OBJ/STL (≤ 150 MB), descripción de ≤ 1024 caracteres
(y una «negativa» de ≤ 255). En Weë, la persona nunca escribe nada de esto: lo arma Weë Brain por dentro
([CREATOR.md](CREATOR.md) §6: «Los prompts deben ser invisibles»).

## 5. Precio (solo como dato)

1 crédito del proveedor = 0,01 USD. Ejemplos oficiales: image-to-3D con textura estándar = 30 créditos; texto a 3D sin textura
= 10. **Weë no traslada estos números a la interfaz ni inventa un precio:** el coste real se mide (`providerCost`) y el precio en
Credits sale del Credit Engine (CLAUDE.md §7; [COSTES.md](COSTES.md)).

## 6. Elegibilidad (dato del MAPA 2, no decidido aquí)

**Estado: REVIEW_REQUIRED** hasta que el MAPA 2 de la Línea B diga otra cosa. Hechos ya conocidos:
- Los términos piden **autorización previa por escrito** del titular (Holymolly Ltd) para poner el servicio a disposición de
  terceros, usuarios finales incluidos (§3.2): **bloqueante** para servir a la gente de Weë sin ese permiso.
- En planes de pago la persona conserva los derechos del resultado y el proveedor no entrena con él; en el gratuito, no.
- Ley de Hong Kong y arbitraje HKIAC.

En la interfaz de Weë esto se ve, como mucho, como **«pendiente de autorización»** en la capacidad, sin nombrar a nadie.

## 7. La interfaz oficial (lo que enseña la web)

> Esta sección resume el informe del investigador de UX de la Línea C (`tripo-ux.md`). **Si no consta aquí, ese informe aún
> no estaba disponible al cerrar este documento**, y lo que se diga de la interfaz queda **REVIEW_REQUIRED**.

_(Se completa con el informe; ver §7 de [decisiones](WEE-DESIGN-UIUX-DECISIONS.md) para el estado.)_

## 8. Qué aprende Weë Design

| Lo que hace Tripo | Qué significa para Weë Design | Dónde vive |
|---|---|---|
| Separa crear (texto, imagen, vistas) de procesar (textura, malla, animación, formato) | El workspace distingue **crear**, **editar/transformar** y **entregar**, con el mismo lienzo | [arquitectura](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md) |
| Encadena tareas por id (`input` = el `task_id` anterior) | Un **flujo de varios pasos** (imagen → 3D → textura → formato) es un plan de Weë Brain, no una cadena que monta la persona | [flujos](WEE-DESIGN-FLOWS.md) |
| Progreso 0–100 por tarea | Un trabajo 3D podrá enseñar avance real si el contrato lo trae (Línea B); sin él, por pasos, como hoy | `JobProgress`, contrato 3D |
| Sin cancelación | «Cancelar» en un trabajo 3D solo es honesto antes de enviarlo al proveedor; después, se dice qué pasa con el dinero | [flujos](WEE-DESIGN-FLOWS.md) §cancelar |
| URLs que caducan en minutos | El material vive en el Storage de Weë desde que llega; nunca se enseña la URL del proveedor | Content Core |
| Destinos de formato (juego, impresión, AR…) | Exportar por **destino** («¿para qué lo quieres?»), no por extensión | [Composer](WEE-DESIGN-COMPOSER-REFERENCE.md), entrega |

## 9. Lo que no se copia, nunca

Ni su nombre en un botón, ni su logo, ni sus iconos, ni sus textos, ni su paleta, ni su disposición exacta. Weë Design toma
**qué** se puede hacer, no **cómo** lo dibuja otro.
