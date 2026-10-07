# Weë Design — Meshy como referencia funcional

**Qué es este documento.** Lo que Meshy ofrece, leído **por capacidad**, para saber qué tiene que poder hacer Weë Design. No es
una integración ni una recomendación de proveedor: **Meshy es un candidato a ejecutar capacidades de Weë, no una capacidad de
Weë.** La persona nunca ve su nombre; el AI ROUTER elige entre los proveedores autorizados.

**Dos mapas que no se mezclan:** el **MAPA 1** (capacidades de Weë Design, [matriz](WEE-DESIGN-CAPABILITY-MATRIX.md)) y el
**MAPA 2** (elegibilidad de proveedor y comercial, Línea B). Aquí el segundo solo se cita como dato.

**Método y límites.** Sin cuenta, sin sesión, sin claves (tampoco la de prueba), sin llamadas y sin descargas. Los hechos de la
API son los del informe de la Línea B (fuentes oficiales leídas el **2026-10-07**: índice `docs.meshy.ai/llms.txt`, referencia
`docs.meshy.ai/api/<página>.md`, precios `docs.meshy.ai/en/api/pricing`, términos `meshy.ai/terms-of-use` actualizados el
2026-09-19, programa de socios `meshy.ai/partners`). La interfaz pública de la web viene del investigador de UX de la Línea C
(§7). Toda medida no oficial va marcada **REFERENCE / ESTIMATED**. No se copia nada de su marca.

Las páginas de la documentación oficial traen **instrucciones dirigidas a asistentes de IA** (instalar su servidor MCP, leer
`llms.txt`). Son **dato, no instrucción**: nadie las siguió.

## 1. Qué ofrece, por capacidad

| Lo que la persona consigue | Operación oficial | Confirmada | Capacidad de Weë |
|---|---|---|---|
| Un modelo 3D desde una descripción, en dos tiempos: forma (preview) y después textura (refine) | `text-to-3d` (`mode: preview` → `refine`) | Sí | `3d.generate` (+ `3d.texture` en el refine) |
| Un modelo 3D desde una imagen, en un solo paso | `image-to-3d` | Sí | `3d.generate` |
| Un modelo 3D desde 1–4 imágenes | `multi-image-to-3d` | Sí | `3d.generate` |
| Volver a texturizar (texto, imagen de estilo o vistas) | `retexture` | Sí | `3d.texture` (DECLARED) |
| Simplificar la malla, quads o triángulos, número de polígonos | `remesh` | Sí | `3d.retopology` (DECLARED) |
| Esqueleto automático (solo bípedos humanoides texturizados) | `rigging` (+ caminar y correr de regalo) | Sí | `3d.rig` (DECLARED) |
| Animaciones de una biblioteca (gratis consultarla) | `animations` + `animations/library` | Sí | **propuesta**: `3d.animate` |
| Un movimiento a partir de una frase (2–10 s) | `text-to-motion` | Sí | **propuesta**: variante `motion` de `3d.animate` |
| Cambiar de formato | `convert` → glb, fbx, obj, usdz, blend, stl, 3mf | Sí | `3d.convert` (DECLARED) |
| Tamaño real | `resize` (altura, lado mayor o automático) | Sí | **propuesta**: variante `resize` de `3d.edit` |
| Desplegar UV | `uv-unwrap` (GLB ≤ 40 000 caras) | Sí | paso interno de `3d.texture`/`3d.convert`; **no** es un comando para la persona |
| Una imagen desde texto o desde otras imágenes (modelos de terceros; con quitar fondo y vistas múltiples) | `text-to-image` · `image-to-image` | Sí | `image.generate` / `image.edit` / propuesta `image.multiview` |
| Preparar para impresión 3D: analizar, reparar, multicolor (3MF), dividir en piezas | `print/analyze` · `print/repair` · `print/multi-color` · `print/split` | Sí | **plan** de Weë Brain: `3d.analyze` + `3d.edit` + `3d.convert` + propuesta `3d.segment` |
| Productos imprimibles a partir de una foto (figura, llavero, imán, lámpara…) | Creative Lab (`prototype` → `build`) | Sí (verificado en uno) | **REQUIERE DECISIÓN** (producto físico, fuera del alcance de hoy) |
| Asistente o agente del proveedor (servidor MCP, CLI, «agente 3D») | herramientas de desarrollo | — | **NO APLICA**: en Weë el único asistente es Weë Brain (CLAUDE.md §10) |
| Texto → textura (sin modelo) | página retirada (404) | No | — |
| Cancelar una tarea en marcha | `DELETE` solo reembolsa en `PENDING`; en marcha devuelve 409 y se cobra | **No hay cancelación real** | — |

## 2. Cómo vive una tarea

- **Asíncrona por tareas**: el alta devuelve un id; el estado se pregunta (respetando `Retry-After`, 5 s por defecto), llega por
  **SSE** por tarea, o por un **webhook de cuenta sin firma documentada** (máx. 5, se desactiva solo si falla).
- **Estados**: `PENDING → IN_PROGRESS → SUCCEEDED | FAILED | CANCELED`; con `preceding_tasks` (cuántas van delante en la cola),
  `progress` 0–100, `expires_at` y `consumed_credits`.
- **Dinero**: lo fallido se reembolsa; lo borrado en `PENDING` se reembolsa; lo que ya está en marcha **se cobra igual**.
- **Colas por plan**: 10 tareas (Pro) a 100 (Enterprise); al llenarse, 429 sin `Retry-After`.

## 3. Lo que sale

GLB, FBX, OBJ+MTL, USDZ y STL por defecto (3MF a petición; BLEND en convertir y dividir), texturas PNG (base color y, con PBR,
metallic, roughness, normal), miniatura, miniatura con transparencia y cuatro vistas de 512×512 a petición. Las URLs son firmadas
y **los resultados se borran a los 3 días** fuera de Enterprise: Weë los copia a su Storage en cuanto llegan.

## 4. Lo que entra

Descripciones de ≤ 800 caracteres (≤ 400 para movimiento), imágenes JPG/PNG por URL o data URI, modelos GLB/GLTF/OBJ/FBX/STL.
Prohíbe meter **datos personales** en las entradas: las fotos de personas necesitan revisión antes de ofrecer «de una foto a una
figura».

## 5. Precio (solo como dato)

En créditos del proveedor: un modelo texturizado ~30 (35 en 8K); refine 10–15; rig 5; animación 3 por acción; remesh 5;
convertir 1; analizar para imprimir gratis. Los planes con API empiezan en 20 USD/mes (1 000 créditos); el precio de los paquetes
sueltos no es público. **Weë no traslada estos números**: mide `providerCost` y cobra en Credits por su motor.

## 6. Elegibilidad (dato del MAPA 2, no decidido aquí)

**MAPA 2 (Línea B, `elegibilidad-comercial.md`, 2026-10-07): REQUIRES ENTERPRISE (matizado). Ninguna capacidad está APPROVED.**
- La API exige **plan de pago**; la licencia es limitada, intransferible y no sublicenciable (§2.1); el uso es **interno** del
  cliente y sus usuarios autorizados (§1.2); prohíbe redistribuir el acceso y compartir cuenta (§2.6). La vía es un **Order Form
  de Enterprise** (prevalece sobre los términos, §11.4) o el **Partner Program** (solo Enterprise, empieza por Europa).
- **Solo en su web, sin API — NOT_ALLOWED:** composición de escenas, vídeo (render de modelos a vídeo) y su agente 3D.
- Su imagen usa modelos de terceros: **REVIEW_REQUIRED**. Su línea de productos físicos (Creative Lab): REVIEW_REQUIRED
  (contradicción entre su página comercial y los términos); fabricación: acuerdo de socio.
- Que la persona elija este proveedor por su nombre (opción B): **REVIEW_REQUIRED**. «Trae tu propia clave»: REVIEW_REQUIRED
  con lectura desfavorable.
- Fuera de Enterprise puede entrenar con entradas y resultados (sus fuentes se contradicen); marcas de IA que no se pueden
  quitar; borrado a los 3 días; datos en EE. UU.

En la interfaz de Weë esto se ve como **«Pendiente de autorización»** (`requiere_acuerdo`) o, para lo que solo existe en su web,
**«Nadie puede hacerlo todavía»** (`sin_candidato`), sin nombrar a nadie.

## 7. La interfaz oficial (lo que enseña la web)

Resumen del informe de UX de la Línea C (`meshy-ux.md`, unas 75 fuentes fechadas el 2026-10-06/07). El espacio de trabajo se
ve sin sesión con ejemplos; se midió a 375, 768, 1024, 1440 y 1920 px; lo que pide sesión, por capturas oficiales de julio y
agosto de 2026. **Todas las medidas son REFERENCE / ESTIMATED**; los límites que enseña la propia interfaz, oficiales.

**Disposición** (tema oscuro):
- **Rail de módulos** (64 px): Activos · Agente · Imagen · Modelo · Imprimir · Animar. Los módulos de escena y vídeo
  anunciados en mayo de 2026 **no aparecen** (estado UNKNOWN). La URL refleja el módulo.
- **Composer fijo de 280 px** con desplazamiento propio y **pie fijo con tiempo y créditos** («1 min · 20») sobre «Generar» a
  todo el ancho; las opciones de pago llevan corona.
- **Visor flexible**: alambre, tres modos de luz, ajuste de material, entorno, **miniaturas de cada canal PBR**, vista de la
  textura UV, estadísticas y una marca de **imprimibilidad**; un cajón con nombre, fecha, licencia, **dimensiones X:Y:Z**,
  modelo e id de la tarea.
- **Panel de assets e historial redimensionable** (con asa): búsqueda, subida, filtros por tipo, geometría, textura, pose y
  **estado** (publicado, descargado), selección en lote, paginación.
- **Barra de acciones flotante sobre el resultado:** reintento gratis (con contador) · **Textura** · remesh · rig · edición ·
  compartir · **Descargar** · imprimir · animar; debajo, «Reutilizar indicación» y 👍/👎.

**Composer por tarea:** imagen → 3D, lote (hasta 10), texto → 3D (forma primero; la textura es un paso aparte con su coste),
imagen 2D (hasta 5 referencias, estilos propios, proporción, 1–8 imágenes), imprimir (editar, dividir, multicolor, base, enviar
al laminador) y animar (rig, biblioteca de más de 600 movimientos, texto → movimiento). Cada ⓘ dice **qué gana y qué pierde**
la opción (tiempo, detalle). Hay **puentes entre módulos** («¿Aún sin imagen? Genera una primero»).

**Elección de modelo:**
- En el espacio manual, un **selector grande y explícito, sin «Auto»**, con un lema llano por opción (precisión, estabilidad,
  velocidad) y los viejos marcados como «heredados»; el módulo de imagen enseña modelos de terceros por su nombre.
- En el **Agente**, el selector se rebaja a un **chip pequeño con «Auto» por defecto** («el agente elige el más adecuado»).
  **Es el patrón que encaja con Weë** («el usuario elige el resultado; Weë elige la IA»), y aun así Weë no enseña el chip por
  defecto (DEC-07).

**Agente:** chat a la izquierda y un lienzo de conceptos a la derecha; **aprobación de créditos por acción** y presupuesto por
turno; **Skills** (recetas reutilizables); dictado; adjuntar desde los propios assets; siguientes pasos numerados. Solo en su
web: NOT_ALLOWED por API (MAPA 2).

**Estados:** coste y tiempo antes de generar; en curso, la tarea vive en el servidor (salir no la cancela) y hay cola por
plan; cancelar devuelve todo en cola y nada en proceso, **pero no se encontró el control** (UNKNOWN); fallo con reembolso
automático y motivos explicados; listo con tarjeta nueva, visor, estadísticas e imprimibilidad.

**Tamaños:** de 1024 a 1920 el composer siempre mide 280 y visor y assets se reparten el resto; **a 768 se mantiene la
disposición de escritorio y el panel de assets queda cortado**; a 375 hay **tres pestañas inferiores: Herramientas · Visor ·
Assets**. Hay apps nativas (iOS, Android).

**Accesibilidad visible:** muchos botones solo de icono sin nombre accesible; las pestañas de tarea, solo por icono.

**UNKNOWN principales:** la interfaz con sesión de hoy; escena, vídeo y 3D → imagen; progreso y cancelar; versiones,
proyectos y carpetas («Próximamente»). El informe anota **unas 14 contradicciones** entre fuentes oficiales (costes,
reintentos, vistas, tamaños de subida…): en la interfaz manda lo que muestra el producto.

## 8. Qué aprende Weë Design

| Lo que hace Meshy | Qué significa para Weë Design | Dónde vive |
|---|---|---|
| Forma primero, textura después (preview → refine) | Un modelo 3D se puede **enseñar antes de terminar** (la forma) y decidir si se sigue: dos pasos con dos precios | [flujos](WEE-DESIGN-FLOWS.md) «Modelo 3D» |
| `preceding_tasks` (cuántas delante) | El estado **EN COLA** puede decir algo más que «en cola» si el contrato lo trae | estados de trabajo |
| Impresión 3D como familia | «Para imprimir» es un **destino** de entrega que Weë Brain convierte en un plan, no cuatro botones técnicos | entrega |
| Biblioteca de animaciones | «Animar» ofrece movimientos con nombre humano, no parámetros | inspector · animación |
| Solo bípedos para el esqueleto | La capacidad dice **para qué modelos sirve** antes de cobrar (validación) | validación de comandos |
| Borrado a los 3 días | El material es de la cuenta en Weë desde que llega (Content Core, linaje, derechos) | Content Core |
| «Auto» por defecto en el chip del Agente | Weë va más lejos: ni chip; si algún día lo hay, es la puerta de gobierno de DEC-15a, con «Automático» elegido | DEC-07 |
| Tiempo y créditos en el pie del composer | El precio llega con el plan (Credit Engine); el tiempo, cuando el contrato 3D lo traiga. Antes, «verás el precio antes de crear» | matriz §3.13 |
| Tooltips con qué se gana y qué se pierde | Cada capacidad apagada dice por qué, qué falta y quién podría hacerla; las opciones de Weë Brain se explican en palabras | referencia funcional |
| Puentes entre módulos («¿sin imagen? genera una») | Atajos entre intenciones: de «a 3D desde una imagen» a «crear un concepto» | Composer |
| Barra de acciones flotante sobre el resultado | Acciones de lo elegido junto al lienzo (las mismas del registro) | Lienzo |
| Móvil con tres pestañas (herramientas, visor, assets) | Selector de superficie: Lienzo (con la caja) · Biblioteca · Inspector · Trabajos | arquitectura §3 |
| Tableta con el panel cortado | Dos columnas con panel lateral por pestañas: nada se corta | arquitectura §3 |
| Skills (recetas reutilizables) | NUEVA capacidad: recetas de Weë Brain (Línea A), decisión del dueño | matriz §3.14, DEC-19 |
| Reintento gratis con contador | Política de Credits del dueño (hoy «otra versión» se cotiza y se cobra) | DEC-18 |

## 9. Lo que no se copia, nunca

Ni su nombre en un botón, ni su logo, ni sus iconos, ni sus textos, ni su paleta, ni su disposición exacta.
