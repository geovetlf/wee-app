# Rutas de las cajas: lo escrito llega a donde toca

> Ronda R7 · tarea K · 2026-10-11. Tres arreglos baratos del mapa de integración (`INTEGRACION-FLUJO-E2E.md`, tarea H):
> R-01a (B-02), R-08 (B-10) y R-11. Solo cliente y pruebas; `functions/src` no se toca.

## 1. El enrutado por palabras de la caja del Studio (R-01a · B-02)

**Quién lo usa.** `matchExperiences` (`constants/weeExperiences.ts`) compara lo escrito con las palabras clave del registro. Lo llaman
dos sitios: el buscador «¿Qué quieres crear?» (`WeeCreatorScreen`, mientras se teclea) y `destinoDeIntencion`
(`utils/destinoDeIntencion.ts`), que decide a dónde lleva la caja del Studio al pulsar Crear (y `utils/designReferencia.ts`).

**Qué pasaba.** Para que el buscador completara lo que se teclea («rec» → «receta»), `matchExperiences` encajaba también una palabra que
es el PRINCIPIO de una clave, pero a TODAS las palabras del texto. «Una canción relajante para estudiar» llevaba a Weë Beauty porque la
palabra ya escrita «una» encaja con la clave «unas» (uñas); «Make me a logo» porque «make» encaja con «makeup». La caja del Studio no
sale del Studio (`dentroDe: 'studio'`), así que Beauty era la única candidata. En la medición de la ronda, 45 palabras corrientes
de los textos españoles de la app son el principio de alguna clave («una», «con», «por», «ver», «color», «historia»…).

**Qué es ahora.** Lo que se está TECLEANDO es el final del texto —la última palabra, o las últimas si la clave tiene varias («color de
ca»)—, y solo eso completa el principio de una clave. Lo anterior ya está escrito: tiene que ser la clave entera o empezar por ella
(«recetas», «fotos»). Un signo final («Escribe una historia.») cierra la última palabra; un guion no («make-»).

| | Antes | Ahora |
|---|---|---|
| «Una canción relajante para estudiar» (Studio) | Weë Beauty | ningún lugar del Studio (el aviso de siempre) |
| «Una receta de pasta con lo que tengo…» (Studio) | Weë Beauty | ningún lugar del Studio |
| «Make me a logo for my bakery» (Studio) | Weë Beauty | ningún lugar del Studio |
| «Escribe una historia sobre mi abuela» (Studio) | Weë Studio (vídeo) | Weë Writer |
| teclear «maq», «rec», «color de ca», «opsk», «recip» | completa | completa (idéntico: 2 654 principios de claves comprobados) |

Para mantener el ejemplo en inglés que la propia app enseña («Try a different hair colour»), que solo llegaba a Beauty por ese mismo
accidente («hair» → «hairstyle» a mitad de frase), se añadió la clave inglesa «hair colour» a `PALABRAS_POR_IDIOMA`.

**Prueba.** `functions/test/enrutado-por-palabras.test.mjs` (87 comprobaciones): las doce frases de la sonda de H por la caja del Studio,
lo que sí es de Beauty en es/en/da, lo que se teclea, lo que ya no se completa, y —frente a una copia de la regla de antes como
referencia— que el arreglo solo QUITA resultados de lo escrito, nunca añade ni reordena (5 893 frases) y que de los 99 ejemplos que la
app enseña ninguno deja de llevar a su experiencia. Falla (18) contra el código anterior y falla (28) si se «arregla de más» dejando de
completar lo que se teclea.

**Lo que NO se arregla aquí (conocido, medido).**
1. La última palabra de una frase completa sigue contando como «a medio teclear»: «Hazme una canción para mi bar» sigue yendo a
   Beauty por «bar» → «barba», y «Escribe una historia» al Studio por «historia» → «historia visual». Un `matchExperiences` que no
   sabe quién lo llama no puede distinguirlo. Arreglo completo (propuesto, no aplicado: toca `utils/destinoDeIntencion.ts` y una
   guarda estructural existente): que el destino pida el texto como COMPLETO (`matchExperiences(goal, idioma, { completo: true })`).
2. La clave «unas» (Beauty, para quien escribe «unas» sin eñe) es también el artículo: «unas canciones relajantes» sigue yendo a
   Beauty. Es un dato (`keywords`), no el prefijo; quitarla o sustituirla es una decisión de producto.
3. La clave «cena» (Chef) está dentro de «escena» (`q.includes(k)`, subcadena, otra regla): «una escena de película» sigue marcando Chef.
4. Mientras no haya destino, la caja sigue mostrando la demostración (R-01b, decisión del dueño: ofrecer Weë Brain).

## 2. La foto de Weë Brain llega al especialista (R-08 · B-10)

**Qué pasaba.** Weë Brain propone un especialista y la persona lo toca. `BrainChatScreen.goToSpecialist` navegaba a `CreatorFlow` con
`experienceId` y `goal` y nada más: la foto adjunta a Brain se quedaba en la conversación y el especialista volvía a pedirla. Ejecutando
la función real con una conversación con foto salía `{"experienceId":"home","goal":"mira mi sala"}`.

**Por qué la foto no tenía por qué perderse.** Ya iba por todo el camino: `useBrainChat` la sube a `users/<uid>/brain-attachments/…`,
`brainChat` guarda en el mensaje esa dirección (ya comprobada por `assertInputImageUrl`), `uploadCreatorImage` devuelve tal cual una
dirección que ya es del Storage de Weë (no la sube otra vez) y `creatorChat` admite esa misma carpeta (el UNKNOWN de R6, medido por H y
fijado ahora: `assertInputImageUrl` es idempotente sobre lo que Brain guardó, y rechaza la de otra cuenta, otro cubo y otro sitio).

**Qué es ahora.** `goToSpecialist` añade `imageUri` —el parámetro que ya tiene `ContextoDeExperiencia`, el tipo de la ruta— con la foto
del ÚLTIMO mensaje de la PERSONA que tenga una (no una imagen de Weë; y si el último mensaje no lleva foto, la de uno anterior). Quien
no adjuntó nada navega exactamente como antes: la clave ni siquiera existe. Solo cliente: ni servidor, ni Credits, ni rutas.

**Qué hace el servidor con ella** (por diseño, no es nuevo): la guarda como `inputImageUrl` del trabajo; los especialistas que trabajan
sobre una foto (Photo, Home, Beauty, el vídeo de una foto en Studio) la usan sin pedirla; en `video.generate` se pasa además como imagen
de referencia (`creator/inputs.ts`, `stepInputFor`); las plantillas y el planificador no miran si hay foto.

**Prueba.** `functions/test/brain-foto-al-especialista.test.mjs` (30 comprobaciones): la función leída y EJECUTADA (se extrae el código real de
`goToSpecialist` y se corre con ocho conversaciones: con una foto, sin ninguna, varias, solo en un mensaje anterior, de Weë, sin texto,
dirección local y vacía); el contrato de punta a punta con el `uploadCreatorImage` real (dobles de Storage) y el `assertInputImageUrl`
compilado. Falla (8) antes del arreglo; tres mutaciones —la primera foto, la de cualquiera, la clave siempre— la hacen fallar.

**Lo que no se arregla aquí.** El HISTORIAL de la conversación sigue sin viajar al especialista: `creatorChat` no tiene dónde recibirlo
(`ChatInput`); crearlo sería otro canal (R-03/R-02, decisión aparte). Y el contexto de lo que Brain entendió tampoco (B-04).

## 3. La prueba del camino (R-11): `camino-e2e.test.mjs`

Las sondas de la tarea H vivían fuera del repositorio y «CONECTADO» se decidía leyendo. Ahora `functions/test/camino-e2e.test.mjs`
(en la cadena, 44 comprobaciones) las EJECUTA cada vez: en memoria, sin red y sin emulador.

**De verdad:** el Credit Engine, el libro `aiGenerations`, el router, el limitador, los callables (`creatorChat`, `creatorRun`,
`brainChat`, `generateVideo`), el conductor, el Job Engine y el barrendero (`functions/lib`). **De mentira:** Firestore (en memoria,
`functions/test/_firestore-en-memoria.mjs`, la base de `video-asincrono` ampliada), el Storage (solo sabe el tamaño de una foto) y el
proveedor (sin claves el router cae al de PRUEBA; en la sección C, un doble de DeepSeek). Cualquier intento de red, de usar un proveedor
real o de escribir en el Storage hace fallar la suite.

| Sección | Qué fija | Sonda de H |
|---|---|---|
| A · puertas | Sin configuración (y con `habilitado: false`) nada va por el Core; cada capacidad abre solo la suya y solo para sus cuentas; solo TRES archivos preguntan por la puerta (Brain, vídeo, mundo) y las once experiencias (`creator/index.ts`) no importan el conductor | S1 |
| B · cajas | Design, Chef y Studio (animar una foto) completan por `creatorChat` → `creatorRun` con el dinero cuadrado (asiento, saldo y libro) y **cero** documentos en `jobs`, `workflowRuns` y `jobQueue`; el vídeo con voz de Studio, sin claves, o termina o falla DEVOLVIENDO todo (B-11) | S4 |
| C · Brain | Por la puerta cerrada y por la abierta contesta con la misma forma; el Core deja un trabajo y una ejecución de un solo paso y no usa `router.execute`; una cuenta fuera de la lista no entra; repetir un mensaje no vuelve a llamar al proveedor | S5 |
| D · vídeo | `generateVideo` con la puerta cerrada completa por el camino de siempre y no toca el Core | S6 |
| E · Gateway | La composición del conductor no lleva `upstream`, `recursos` ni `referencias`; sin resolutor, un paso que depende de otro llega al proveedor sin el material y se da por completado | S3 |

**Dos comprobaciones fijan algo que hoy es lo INDESEADO**, con la etiqueta «BLOCKED — HUMAN DECISION». Cuando la decisión se tome,
fallarán a propósito y su mensaje dice qué actualizar (se comprobó con una mutación de `functions/lib` para cada una):
- **B-06 · R-05** (E): el Gateway del conductor no rechaza un paso con dependencias si no hay resolutor. Arreglarlo mueve cercas
  (`engine/gateway.ts`, `runtime/index.ts`) y el cableado completo espera al cierre de almacenamiento.
- **B-05 · R-04** (C): una respuesta gratis de Brain por el Core deja un trabajo que el barrido no sabe cerrar
  (`TRANSACTION_NOT_FOUND`, un error por pasada). Arreglarlo exige reanclar cercas (`brain-canary`, `runtime-liquidacion`, `job-queue`).

**Medidas** (en esta máquina, cargada): ~8 s por corrida —casi todo es el proveedor de prueba, que duerme 0,6–1,1 s por generación—;
12 corridas seguidas con la salida idéntica (misma huella sha256); tres mutaciones del compilado (puerta abierta por defecto, arreglo de
B-05, arreglo de B-06) hacen fallar 11, 2 y 2 comprobaciones.

**Lo que no cubre:** el camino asíncrono del Core (vídeo y mundo: `video-asincrono`, `f1d-generacion`), el almacén real (`assets` queda a
0 con resultados de prueba), la interfaz, ni los proveedores reales.
