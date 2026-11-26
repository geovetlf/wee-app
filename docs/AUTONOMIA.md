# Autonomía del personaje (Perfil Weë) con IA

Estado: **diseño + paso 1 (la ficha) hecho. La autonomía todavía no existe.**

## Idea en una frase

El personaje (alter ego) lo maneja su dueño. Solo puede actuar solo si el dueño
**lo activa**, y entonces cada acción es **IA que gasta Credits**. Ese gasto, más
unos topes, es el filtro que evita una red de personajes hablando solos.

## Por qué hay filtro (lo que mostró la simulación V1.5)

- Con el personaje autónomo gratis, los personajes llegaban a ~18 % de la
  actividad (31 % si mucha más gente tuviera Perfil Weë); con créditos, ~12 %.
- **El precio casi no frena**: entre mitad de precio, base y doble, la parte de
  actividad apenas se movía (12,0 / 12,2 / 11,2 %). Quien activa paga sin problema
  acciones de 1 a 5 Credits.
- Lo que más pesó fue **cuántas acciones hace por día** (1 por día: ~5 %; 6: ~20 %).
- El resto de la red perdía ~1 punto de retención a 30 días.
- Todo eso son supuestos de la simulación, no datos reales.

Conclusión de diseño: **el costo no basta**. Hacen falta topes de acciones y de
gasto por día, y reglas de no-bucle (ver «Filtros»).

## Los dos modos (qué decide solo y qué pide aprobación)

Decisión del dueño (2026-11-23): solo dos modos, **Semiautomático** (id `basico`) y **Automático** (id `alto`). El nivel intermedio desapareció; una ficha antigua que lo traiga se lee como Semiautomático.

Tabla en `utils/personajeFicha.ts` (`MATRIZ_DE_APROBACION`), con prueba.

| Acción | Semiautomático | Automático |
|---|---|---|
| Comentar una publicación | solo | solo |
| Responder en una comunidad | solo | solo |
| Responder en WeeTalk a quien le escribió primero | solo | solo |
| Publicar una obra o texto | **aprobación** | solo |
| Escribir primero por WeeTalk | **aprobación** | solo |
| Encargar imagen | **aprobación** | solo (con tope) |
| Encargar vídeo | **aprobación** | solo (con tope) |

**WeeTalk sí entra**: alguien le escribe a un personaje («cuéntame de tu universo
y de tu libro») y el personaje contesta. Responder a quien escribe primero es
automático en todos los niveles; escribir primero pide aprobación hasta el nivel alto.

**Quién paga en WeeTalk (decisión del dueño, 2026-11-22).** La mensajería de WeeTalk
sigue siendo gratuita para todos y **no es una excepción** a «WeeTalk gratuito». Lo que
se cobra es el **uso de la autonomía con IA** del personaje: un servicio aparte que
gasta Credits de la cuenta dueña del Perfil Weë, esté donde esté el personaje
(comunidades, publicaciones o WeeTalk). En concreto:
- quien escribe al personaje nunca paga;
- el dueño escribiendo a mano como su Perfil Weë no paga;
- con la autonomía apagada, WeeTalk no toca Credits;
- el cobro vive en el módulo de autonomía y se registra como «autonomía del personaje»,
  nunca como mensajería; el código de WeeTalk sigue sin importar el Credit Engine.

**Con qué se paga (decisión del dueño, 2026-11-22).** Por ahora la autonomía se paga
con los **Credits de siempre** (paquete de USD 5 = 500 Credits). **No hay suscripción
todavía**: los planes de USD 4,99 y 9,99 al mes se deciden al terminar el producto. El
cobro es **por acción, en Credits enteros**, con una tarifa por tipo de acción sacada
del costo real más el margen (provisional hasta medir). Queda abierta para después la
idea del dueño de vender la autonomía en bloques («X Credits por X acciones»): el
diseño por acción la admite sin rehacer nada.

**El pase de autonomía (decisiones del dueño, 2026-11-22).**
- **30 Credits = 24 horas** de autonomía desde que se activa (precio provisional y
  configurable). Incluye las interacciones del personaje (responder en WeeTalk,
  comentar, responder en comunidades, publicar texto) y su memoria, con un **tope de 30
  acciones por bloque de 24 h**. Al llegar al tope se pausa hasta el siguiente bloque.
- **Lo que encarga a Weë AI se cobra aparte, a precio de Weë AI**: diseño, imagen,
  vídeo, y también investigar en la web (precio de búsqueda).
- **Duración programada por el dueño**: 24 h, 3 días o una semana, elegida ANTES.
  Termina al cumplirse; **no se renueva sola**.
- **Cobro por bloque**: cada bloque de 24 h se cobra al empezar. Si el dueño apaga antes,
  los bloques que no empezaron no se cobran.
- **Si Weë falla** (caída, error de la IA): esas horas **no cuentan**; el reloj se para y
  se reanuda hasta completar el tiempo programado. No hay reembolso porque no se consume.
- **Mismo precio para los dos modos**: los niveles cambian qué decide solo, no cuánto hace.

**La aprobación no es «a cada rato»**: llega como una bandeja que se revisa en lote
y **caduca a las 24 horas**; lo que caduca no se ejecuta.

**Lo que NINGÚN nivel decide solo** (`SIEMPRE_PERSONA`): dinero o pagos, datos
personales del dueño, quedar en persona o pasar a otra red/teléfono, salud o crisis,
denuncias o conflictos, lo que la propia ficha prohíbe y lo que marque moderación.
«Alto» no es «sin límites».

## Paso 1 — la ficha (HECHO)

- Contrato y validación: `utils/personajeFicha.ts` (nombre, quién es, personalidad,
  rasgos, tono, historia, temas, límites, ejemplo de voz, saludo, idiomas, nivel).
- Guardado: `services/characterService.ts` → `users/{perfilWeë}/character/ficha`.
- Reglas (`firestore.rules`): solo el dueño lee y escribe `ficha`, con campos y topes;
  cualquier otro documento de `character` (`autonomia`, la bandeja) solo lo escribe el servidor.
- Pantalla: `screens/CharacterSheetScreen.tsx`, ruta `CharacterSheet`, entrada desde el
  Perfil Weë propio. Textos en `character.*` (11 idiomas, sin revisión nativa).
- La ficha entra al modelo **como dato, no como orden** (`fichaComoContexto`).
- Prueba: `functions/test/personaje-ficha.test.mjs`.
- **No activa nada**: ni llama a IA ni gasta Credits.

## Paso 1b — el material del personaje (CONSTRUIDO 2026-11-22, sin commit ni despliegue)

Piezas:
- Contrato puro (límites, troceado, palabras con `Intl.Segmenter`, índice y búsqueda
  BM25): `functions/src/personajes/material.ts`. Lo mismo para la app:
  `utils/personajeMaterial.ts` (una prueba vigila que no se separen).
- Extracción sin IA: `functions/src/personajes/extraer.ts` con `unpdf` 2.1.0 (MIT),
  `mammoth` 1.13.0 (BSD-2) y `fflate` 0.8.3 (MIT), versiones fijas. Un PDF escaneado
  se rechaza (`sinTexto`): leerlo pediría OCR con IA.
- Servidor: `materialServidor.ts` — disparador de Storage `procesarMaterialDelPersonaje`
  (cupo de 5 archivos en transacción, extrae, indexa en `personajes/{perfil}/material/{id}.json`,
  **borra el original**) y callable `materialPersonaje` (borrar). Lectura para
  responder: `materialLectura.ts` (sin disparadores, con caché por instancia).
- Prompt: `bloqueDeMaterial` en `creator/prompts.ts` — el material entra como DATO
  delimitado en la MISMA llamada que el pase ya paga (responder y publicar).
- Reglas: Storage `users/{perfil}/character-material/{archivo}` (solo crea el dueño del
  Perfil Weë, 20 MB, formatos, metadato `derechos`; nadie lee ni borra el original);
  Firestore `users/{perfil}/characterMaterial/{id}` (lee el dueño, escribe el servidor).
- App: `services/materialService.ts`, `components/personaje/MaterialDelPersonaje.tsx`
  (sección 7 de la ficha). En web, el selector del navegador; en iOS y Android
  (decisión del dueño, 2026-11-22) el selector del sistema con `expo-document-picker`
  ~14.0.8, sin plugin ni permisos nuevos (no usa iCloud Drive como contenedor).
  Es un módulo NATIVO: hace falta un build nuevo de Android y de iOS que lo incluya;
  en un build anterior el botón muestra el error de subida en vez de romperse.
- Prueba: `functions/test/personaje-material.test.mjs` (lee de verdad PDF, DOCX y EPUB).
- Pendiente: prueba de reglas en el emulador de Storage; verificación en pantalla;
  borrar el material al borrar la cuenta (junto con el resto de datos del personaje).

Decisión del dueño (2026-11-22): **la ficha y el material son gratis.** El dueño puede
subir los archivos que crea convenientes —el libro de «Jay Reads», una biografía, las
características de su mundo— para que el personaje tenga memoria y conocimiento. Es
necesario para darle personalidad, y **no cuesta Credits**: lo único que se cobra es el
modo autónomo (el pase). Y **subir no le cuesta nada a Weë** (precisión del dueño,
2026-11-22): al subir no se llama a ninguna IA ni API de pago.

Diseño previsto:
- Formatos: PDF, EPUB, DOCX, TXT/MD. Suben al Storage de Weë bajo el Perfil Weë, privados,
  con límites de número y tamaño (lo único con coste es almacenamiento/cómputo de Firebase,
  céntimos).
- Al subir, el servidor solo extrae el texto con librerías libres (sin IA) y lo guarda
  troceado. Sin pase, el personaje no actúa y nada se vectoriza.
- El material **no se vectoriza con ninguna API**: se indexa por palabras (BM25, código
  abierto) en el servidor. Cuando el personaje habla —solo con el pase activo— el motor
  busca en ese índice los fragmentos que vienen al caso y los mete en el prompt que el
  pase ya paga, junto a la ficha. Cero coste extra para Weë y para el usuario.
- El personaje responde **desde** su material (explica, resume, cita fragmentos cortos),
  nunca lo recita entero.
- Borrar un archivo borra sus recuerdos. El dueño declara que tiene derecho a usarlo.

## Embeddings de BytePlus (preparado; memoria de los personajes)

La memoria del personaje (recordar quién le escribió, de qué hablaron, su propia
historia) necesita convertir texto en vectores para buscar por significado.
Proveedor elegido: **BytePlus ModelArk, Skylark-embedding-vision**.

- Adaptador: `functions/src/engine/providers/byteplusEmbedding.ts` (contrato de la
  documentación oficial: `POST {ARK_BASE_URL}/embeddings/multimodal`, texto y/o imagen,
  1024 o 2048 dimensiones, plantillas oficiales de `instructions` para consulta y documento).
- Motor: `functions/src/engine/embeddings.ts` (`vectorizar`, configuración, huella,
  similitud). **No pasa por el router**: un solo modelo fijado, sin respaldo silencioso.
  Cada vector se guarda con su **huella** (`proveedor:modelo:dimensiones`) y solo se
  compara con vectores de la misma huella.
- Sin clave (desarrollo, emulador) usa un modo **simulado** determinista con huella
  propia, que nunca se mezcla con los vectores reales.
- No cobra Credits: se cobrará la acción del personaje que lo use (paso 2).
- Precio: `null` hasta confirmar la tarifa oficial; no se inventa.
- Estado declarado: `DOCUMENTATION_VERIFIED` (`engine/verification.ts`). Pasa a
  `REAL_API_VERIFIED` con la primera respuesta real.
- Prueba: `functions/test/embeddings-byteplus.test.mjs`.

### Hoy: clave personal de pruebas → mañana: cuenta de empresa

Hoy `ARK_API_KEY` es la cuenta personal del dueño, solo para pruebas. El cambio a la
cuenta de empresa **no toca código**:

1. En la consola de BytePlus de la empresa: activar **Skylark-embedding-vision**
   (recomendado `skylark-embedding-vision-251215`, que admite `instructions`).
   Opcional: crear un **punto de acceso** (`ep-…`) para límites, facturación y monitoreo.
2. Cambiar el **valor** del secreto `ARK_API_KEY` (mismo nombre, Secret Manager):
   `firebase functions:secrets:set ARK_API_KEY --project prod` (solo con confirmación).
   Afecta también a Seedance y Seedream, que usan la misma clave.
3. Si la empresa está en otra región: `ARK_BASE_URL`.
4. Elegir el modelo en `aiSettings/embeddings` (Firestore) o en variables de entorno:
   - `modelo`: id del modelo o el `ep-…` de empresa (`ARK_EMBEDDING_MODEL`);
   - `admiteInstrucciones`: `true` si el `ep-…` apunta a 251215 o posterior
     (`ARK_EMBEDDING_INSTRUCTIONS`);
   - `dimensiones`: 1024 (por defecto) o 2048 (`ARK_EMBEDDING_DIMENSIONS`);
   - `precioUsdPorMillonDeTokens`: la tarifa oficial cuando esté confirmada;
   - `permitirSimulado`: `false` en producción, para que sin clave falle en vez de simular.
5. **Si cambia el modelo o las dimensiones** (no solo la cuenta), hay que recalcular los
   vectores ya guardados: la huella cambia y los viejos dejan de compararse.

## Texto de los personajes con BytePlus Seed (preparado 2026-11-23; apagado)

Hoy el texto de las acciones (`personajes/acciones.ts`, `text.generate`) va por **DeepSeek pedido por su nombre**, el mismo modelo que Weë Brain. Ya existe el adaptador de texto de BytePlus (`functions/src/engine/providers/byteplusText.ts`, proveedor `byteplus-text`, Chat API de ModelArk con la misma `ARK_API_KEY`), **desactivado y fuera de toda cadena**. Va por el WEË AI ENGINE, nunca por el Core Runtime (regla 11).

Modelos recomendados para personajes (ids de la documentación oficial; **[VERIFICAR]** la versión exacta en la consola):

- **Equilibrado:** `seed-2-0-lite-260428` (valor por defecto de `ARK_TEXT_MODEL`).
- **Económico:** `seed-2-0-mini-260428`.

Razonamiento (`thinking`) **apagado** por defecto: un personaje conversa y el razonamiento se factura como salida. Tarifa `null` hasta confirmarla.

### Cómo encenderlo sin tocar código

Dos opciones:

- **a) `aiRouting/text.generate`** — NO sirve y NO se recomienda: movería a Weë Chef, Studio, Travel… y **no** a los personajes ni a Weë Brain, porque los dos piden DeepSeek por su nombre y ese nombre recorta cualquier cadena.
- **b) Ruta propia de los personajes (RECOMENDADA)** — las acciones piden `routeKey: 'character.text'`. Si existe `aiRouting/character.text`, manda ella; si no, todo sigue como hoy (DeepSeek). Detalle en [AI-ENGINE.md](AI-ENGINE.md) § «Ruta propia por función».

Pasos del dueño:

1. Consola de BytePlus: activar Seed 2.0 Mini (o Lite) para la cuenta de `ARK_API_KEY`; confirmar el id y su tarifa en la región.
2. Firestore `aiProviders/byteplus-text`: `{ "enabled": true }`.
3. Firestore `aiRouting/character.text`: `{ "chain": [ { "provider": "byteplus-text", "model": "seed-2-0-mini-260428" }, { "provider": "deepseek", "model": "deepseek-flash" } ], "policy": "balanced" }`.
4. Probar en un entorno de pruebas con un personaje con pase (la puerta `aiSettings/autonomia` sigue cerrada hasta que el dueño la abra). La primera respuesta real lo deja `REAL_API_VERIFIED`.

Volver atrás: borrar `aiRouting/character.text` (o `enabled: false`).

## Estado de la construcción (2026-11-22)

Todo sin commit y sin desplegar. La puerta `aiSettings/autonomia.abierta` está
CERRADA por defecto: aunque se despliegue, nada se activa hasta abrirla.

| Pieza | Estado | Dónde |
|---|---|---|
| Ficha del personaje | Hecho | `utils/personajeFicha.ts` (+ espejo exacto en `functions/src/personajes/ficha.ts`), `screens/CharacterSheetScreen.tsx` |
| Embeddings BytePlus | Hecho (clave personal de pruebas) | `functions/src/engine/embeddings.ts`, `providers/byteplusEmbedding.ts` |
| Memoria (de AI Town) | Hecho | `functions/src/personajes/memoria.ts`, `almacenFirestore.ts` |
| Pase: tiempo, bloques, pausas, topes | Hecho | `functions/src/personajes/pase.ts` |
| Servidor del pase (programar, apagar, ciclo cada 10 min) | Hecho (cobro autorizado por el dueño el 2026-11-22) | `functions/src/personajes/servidor.ts` |
| Responder en WeeTalk y en comentarios propios | Hecho | `functions/src/personajes/acciones.ts` |
| Publicar por iniciativa propia (máx. 2 por día, 6 h entre una y otra; básico = borrador para aprobar) | Hecho | `acciones.ts` (`accionPropia`), `publicar.ts`, `ciclo.ts` |
| Bandeja: aprobar (publica el borrador sin más IA) / rechazar; caduca a las 24 h | Hecho en servidor; la UI la hace el rediseño | `servidor.ts` (`resolverAviso`) |
| Etiqueta «Personaje con IA» también en publicaciones del muro | Hecho | `components/PostCard.tsx` |
| App: sección de autonomía, avisos, etiqueta «Personaje con IA» | Hecho (sin probar en navegador) | `components/AutonomiaDelPersonaje.tsx`, `services/autonomyService.ts`, `ConversationScreen`, `CommentCard` |
| Revisión del texto sin coste (contacto, enlaces, dinero → no sale, aviso `revision` al dueño) | Hecho | `functions/src/personajes/revision.ts`; usado al responder, publicar, comentar y escribir primero |
| Salud real de Weë (proveedor configurado y encendido, cortacircuitos, fallos seguidos) | Hecho | `salud.ts` (`characterAutonomyHealth/texto`, solo servidor) |
| Comentar publicaciones ajenas (afinidad con sus temas; máx. 3/día, 2 h entre uno y otro; nunca a otro personaje autónomo) | Hecho | `iniciativa.ts` (`comentarAjeno`), prompt `promptDeComentarioDelPersonaje` |
| Escribir primero (solo a seguidores que nunca hablaron con él; envía el SALUDO de la ficha, sin IA; 1/día; aprobación en básico y medio) | Hecho | `iniciativa.ts` (`escribirPrimero`), aprobar en `resolverAviso` (`accion: 'escribir'`), índice `follows` (followingId + createdAt) |
| Reflexión de la memoria una vez por bloque | Hecho | `ciclo.ts` + `acciones.ts` (`tocaReflexionar`, `reflexionar`) |
| Borrar todo lo del personaje (para el futuro «eliminar cuenta») | Hecho, sin llamador | `borrado.ts` (`borrarTodoDelPersonaje`) |
| App: registro «Lo que hizo» (últimas 20 acciones, solo el dueño; vaciarlo lo hace el servidor con `borrarRegistro`) y bandeja con avisos `revision` y «escribir primero» (con el nombre del destinatario) | Hecho (sin probar en pantalla) | `components/personaje/RegistroDelPersonaje.tsx`, `BandejaDeAprobaciones.tsx`, `services/autonomyService.ts` |
| Encargos a Weë AI (decisión del dueño, 2026-11-22): imagen (lite), vídeo corto (Seedance, 5 s vertical) y búsqueda web, cobrados APARTE a la cuenta del dueño con el precio y el camino de Weë AI (spend → motor → complete/refund + libro). Tope diario de Credits que elige el dueño al activar (0/50/150/400; sin elegir = 0) y se puede cambiar en marcha; topes por día: 2 imágenes, 1 vídeo, 5 búsquedas. Imagen: aprobación en básico; vídeo: aprobación en básico y medio; búsqueda: sola. Imagen y vídeo se hacen en el disparador `encargoDelPersonaje` (`characterEncargos`, 9 min de plazo); si falla o no hay saldo/presupuesto, se devuelve y se publica solo el texto; lo generado entra en «Mis creaciones» | Hecho | `encargos.ts`, `acciones.ts`, `servidor.ts` (`ajustarEncargos`), `publicar.ts` (imagen / vídeo como Weël), prompts; app: selector de tope en `AutonomiaDelPersonaje.tsx`, borradores con medio en la bandeja, registro |
| Eliminar la cuenta de Weë entera (las dos caras, el personaje y su avatar, publicaciones, mensajes, creaciones…; los registros contables se quedan, desvinculados) | Hecho (sin probar en pantalla) | `functions/src/cuenta/` (callable `eliminarCuenta`), `screens/EliminarCuentaScreen.tsx`, Configuración → Zona de peligro, módulo i18n `cuenta` |
| Subir material desde iOS y Android | Hecho (falta build nativo) | `expo-document-picker` en `services/materialService.ts` |

Arreglado de paso: la memoria usaba el sistema «Responde solo con un número» también
para la reflexión (que pide JSON) y el mismo requestId para importancia y reflexión.

### Auditoría independiente (2026-11-22): corregido

Dos auditores con rol doble (ingeniero senior + diseñador senior) revisaron todo. Corregido y vigilado por
`functions/test/personaje-auditoria.test.mjs`:
- **C1 · lo privado no sale:** la memoria se aísla por persona y canal (lo hablado por WeeTalk solo vuelve con esa persona; en público, nunca), no entra en reflexiones y los recuerdos van delimitados como datos.
- **C2 · la marca «Personaje Weë» es del servidor:** las reglas impiden crearla, quitarla o reescribir el texto de algo escrito por la IA (publicaciones, comentarios y mensajes).
- **I1/I2:** dos «Activar» no cobran dos veces (exclusiva de programación); apagar y ajustar el tope son transacciones.
- **I6:** una cuenta desactivada no programa ni aprueba, y el personaje no comenta lo oculto.
- **I7:** borrar la cuenta olvida a la persona en la memoria de cualquier personaje y se lleva los encargos.
- **I8/I9:** el borrado diario va por tandas; el ciclo procesa en paralelo y barajado.
- **I10:** nada simulado se cobra ni se publica fuera de un entorno de pruebas (`entorno.ts`).
- **I11:** el precio del pase sale del catálogo de Credits.
- **M1, M2, M3, M4, M7, M8:** encargos atascados a «revisar» (sin reembolso por temporizador), la puerta frena aprobados y encargos, se conserva a quién saludó, DOCX «bomba» rechazado, la página pública marca lo escrito con IA, el saludo aprobado tarde vuelve a comprobar.
- **Nivel:** cambiar el nivel en la ficha cambia el del pase vivo (`nivelDelPaseAlGuardarLaFicha`).
- **Interfaz:** coste total antes de pagar, tope de encargos que empieza en 0, errores y pausas explicados, RTL, contraste, cambios sin guardar (ver la entrega de la interfaz).

### Lo único que queda (decisión del dueño, 2026-11-22)

1. **Instalar las APIs de BytePlus que faltan** (embeddings y lo que se use del motor) y probar contra las APIs reales.
2. **Definir el consumo de Credits:** precio del pase, acciones por día, topes de encargos, topes como «personas nuevas por día» (M6) y medir el coste real (`providerCost`, también el de los embeddings, M9).

Además, fuera del producto: revisión nativa de traducciones, instalar el build en el teléfono, iOS (Mac/EAS), guardar en git y desplegar con confirmación.

## Pasos siguientes

2. **Servidor en el emulador, proveedor simulado, puerta cerrada.** Llamada para
   activar/apagar (comprueba dueño, ficha completa, saldo, mayoría de edad); estado
   `character/autonomia` solo escrito por el servidor; función programada (modelo:
   `functions/src/settlement/programado.ts`); acciones por el camino actual del motor
   de IA (adaptador de texto), **no** por el orquestador del Core (regla 10: solo hay
   dos canaries y no se migra un tercero sin autorización); cada acción con
   `spendCredits` → `completeCredits`/`refundCredits` y `requestId` idempotente.
3. **App:** botón «Activar», costo por acción (consultado al Credit Engine, nunca
   fijo en la app), topes, bandeja de aprobación, registro de lo que hizo con opción
   de borrar, etiqueta «Personaje con IA» en publicaciones, comentarios y WeeTalk.
4. **Pruebas de topes y moderación**, y de no-bucle.
5. **Prueba con una cuenta propia en el emulador/dev.**
6. **Producción** solo con tu confirmación explícita.

## Filtros contra la red de personajes solos

- Tope de acciones por día por personaje y tope de gasto por día.
- Un personaje con IA no responde a otro personaje con IA, ni más de una vez por hilo.
- Etiqueta visible obligatoria («Personaje con IA»). **Sin ajuste para ocultarla** (decisión del dueño, 2026-11-22): el coste en Credits ya filtra; quien paga quiere que su creación llegue a otros usuarios, y de eso trata la red social.
- Tope de proporción de actividad autónoma por comunidad.
- Pausa automática: sin saldo, bloqueos repetidos del algoritmo, denuncias.
- Interruptor global de emergencia cerrado por defecto (en Firestore).

## Decisiones pendientes (de producto)

- Qué significa «inteligencia» en cada nivel: propuesta = también el modelo y el
  costo (básico económico, medio estándar, alto con razonamiento y más memoria).
- Precio por acción: **no se inventa**; sale del costo real del proveedor
  (`credits/aiPricing.ts`) más el margen, y se mide antes de fijar.
- Topes por defecto (acciones/día y Credits/día).
- Etiqueta «Personaje con IA»: se recomienda obligatoria.

## Código abierto: qué sí y qué no

Verificado en GitHub el 2026-11-22 (licencias según la API de GitHub; confirmar el
archivo LICENSE antes de copiar nada).

- **Character Card (V2/V3)** — es la «plantilla» de ficha de personaje que usa la
  comunidad (nombre, descripción, personalidad, escenario, saludo, ejemplo de voz…).
  El repo de la V2 (`malfoyslastname/character-card-spec-v2`) **no declara licencia**;
  el de la V3 (`kwaroran/character-card-spec-v3`, borrador) es **MIT**. Decisión: se
  usan **solo los nombres de campo** como formato de intercambio (`aTarjetaDePersonaje`
  exporta; importar vendrá después con validación propia). No se copia texto.
- **SillyTavern** (AGPL-3.0): es la aplicación que usa esas fichas. **No se copia
  código**: la licencia obligaría a abrir el de Weë.
- **Mem0** (Apache-2.0) y **Letta/MemGPT** (Apache-2.0): memoria a largo plazo para
  agentes. Candidatos para una fase posterior (que el personaje recuerde); no ahora.
- **LangGraph JS** (MIT), **Mastra**, **Vercel AI SDK**: marcos para agentes. **No se
  adoptan**: añadirían una segunda capa de orquestación, que `CLAUDE.md` (regla 10)
  prohíbe. Weë ya tiene motor de IA, Credit Engine y moderación; la autonomía se
  monta encima, no al lado. (Mastra y Vercel AI SDK: la API no mostró licencia clara;
  revisar si algún día se considera.)
- **Validación**: el repo no usa zod ni react-hook-form; la ficha se valida con
  funciones propias, como el resto de contratos del repo.
