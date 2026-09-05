# WEE Creator — Prompt maestro de construcción

> Instrucciones del dueño del producto (2026-09-05), con 10 imágenes de referencia guardadas en [`design/references/`](../design/references/) (`wee-brain.jpg`, `wee-design.jpg`, `wee-photo.jpg`, `wee-music.jpg`, `wee-studio.jpg`, `wee-business.jpg`, `wee-chef.jpg`, `wee-home.jpg`, `wee-beauty.jpg`, `wee-writer.jpg`).
> Escritura oficial de la marca en todo lo visible: **Weë** (Weë Creator, Weë Brain, Weë Chef…). "WEE+" y "WEE Store" de las imágenes quedan fuera por decisión del dueño (2026-09-05).
> Complementa [`CREATOR.md`](CREATOR.md) (filosofía y arquitectura de IA) y [`CREATOR-ARQUITECTURA.md`](CREATOR-ARQUITECTURA.md) (diseño técnico). Cuando se contradigan, manda este documento en lo que toca a la experiencia de cada especialista y al orden de trabajo.

Construir WEE, una plataforma de IA pensada para personas que **no** saben usar IA. Las imágenes son la dirección visual: **no** copiarlas como diseños estáticos, sino convertirlas en una aplicación real, navegable, responsive y funcional.

## 1. Filosofía principal

**"El usuario elige el resultado. WEE elige la IA."** El usuario no aprende modelos, APIs, prompts, parámetros ni configuraciones: WEE se encarga internamente. La experiencia se siente como tener un equipo de especialistas de IA; la persona explica lo que quiere con sus palabras ("Quiero diseñar un auto deportivo futurista") y WEE entiende la intención y elige las herramientas.

## 2. Objetivo de esta etapa

Construir la interfaz y la lógica completa de WEE con **datos simulados (mock)**. **No integrar todavía APIs comerciales reales.** Primero: todas las páginas funcionan, todos los botones tienen comportamiento, navegación real, formularios, flujos de creación, historial/proyectos, sistema visual de Credits, experiencia responsive, WEE Brain, los especialistas y un sistema preparado para conectar APIs después. No diseñar la aplicación alrededor de una API concreta.

## 3. Estructura principal

Diez especialistas: WEE Brain, WEE Design, WEE Photo, WEE Music, WEE Studio, WEE Business, WEE Chef, WEE Home, WEE Beauty, WEE Writer. Cada uno con una experiencia propia adaptada a su especialidad: **no** diez páginas idénticas cambiando color y título; cada uno se siente como una herramienta distinta dentro del mismo ecosistema.

## 4. WEE Brain

Cerebro general, interfaz principalmente de **chat grande**: preguntar, investigar, aprender, resolver problemas, analizar documentos, planificar, pedir ideas, conversar, pedir ayuda para cualquier cosa. Opción **"No sé cómo hacerlo"**. Interpreta lo que necesita el usuario y, cuando hace falta, lo dirige o activa internamente otros especialistas (p. ej. "Quiero lanzar un restaurante" → Business para estrategia, Design para identidad, Photo para fotos, Studio para videos, Music para música). El usuario no tiene que entender esta arquitectura.

## 5. WEE Design

No se limita al diseño gráfico: **"Diseña lo que imagines"** — autos, helicópteros, aviones, drones, muebles, vasos, botellas, productos, tecnología, ropa, zapatillas, packaging, juguetes, personajes, criaturas, inventos, productos industriales, objetos, logos, identidad visual, posters, flyers, publicidad, diseños para redes, ilustraciones, conceptos visuales. Flujo donde la persona describe su idea ("Diseña una botella de agua con forma de gota"); preguntas sencillas solo cuando hagan falta; nunca prompts técnicos.

## 6. WEE Photo

Fotografías e imágenes existentes: mejorar, restaurar, eliminar objetos, cambiar fondo, retocar, mejorar resolución, colorizar, transformar estilo, modificar elementos, fotografía de producto, edición por instrucciones. Permite subir una imagen y explicarle a WEE qué cambiar.

## 7. WEE Music

Crear canción, beat, voz, letra; mejorar letra; mezclar/masterizar; crear videoclip; crear video con IA. **Muy importante:** WEE Music tiene su propio flujo **"Crear tu video con IA"**: la persona puede empezar con una canción y terminar con un videoclip completo sin salir a WEE Studio (por dentro WEE usa las herramientas que hagan falta).

## 8. WEE Studio

Estudio audiovisual general: crear videos, animar imágenes, videos para redes, anuncios, historias, videos cinematográficos, image-to-video, video-to-video, creación de escenas, edición audiovisual. Otros especialistas pueden usar capacidades de video por dentro cuando tenga sentido.

## 9. WEE Business

Ideas de negocio, marketing, publicidad, redes sociales, analizar negocio, documentos, presentaciones, vender más, CV y carrera, estrategia, e-commerce. Función **"Mis redes"**: más adelante conectar Instagram, Facebook y TikTok para crear, programar, publicar y gestionar respuestas cuando las APIs oficiales y permisos lo permitan. **No implementar todavía las APIs reales**; construir primero toda la experiencia.

## 10. WEE Chef

Recetas, cocinar con mis ingredientes, menús, postres, ideas para cocinar, sustituciones, planificación de comidas, fotografía de ingredientes, fotografía de platos, ideas gastronómicas. Amigable y muy sencillo.

## 11. WEE Home

Rediseñar habitaciones, remodelar, cambiar muebles, colores, pisos, paredes; decoración, exteriores, jardines, fachadas, distribución, visualizar ideas. Permite subir una foto del espacio y explicar qué cambiar.

## 12. WEE Beauty

Maquillaje, cabello, color de cabello, barba, ropa, outfits, uñas, estilos, transformaciones de apariencia. Visual y muy fácil de usar.

## 13. WEE Writer

Escribir textos, corregir, historias, novelas, guiones, emails, cartas, publicaciones, libros, ideas, documentos, reescritura, traducción. Debe existir un **editor de texto cómodo**.

## 14. Diseño UX

Sin lenguaje técnico (nada de prompt, seed, negative prompt, sampler, CFG, modelo, API, parámetros, temperatura). Lenguaje humano: "¿Qué quieres crear?", "Cuéntamelo con tus propias palabras", "No sé", "Hazlo más realista", "Quiero otra versión", "Me gusta, pero cámbiale el color".

## 15. Preguntas inteligentes

No bombardear con formularios: preguntar solo lo necesario. Ejemplo: "Quiero diseñar un auto" → "¿Qué estilo buscas?" (Deportivo · Elegante · Futurista · Todoterreno · No sé) → "¿Para qué lo necesitas?" (Para vender una idea · Para una marca · Para un proyecto · Solo quiero imaginarlo · No sé). La IA se encarga del resto.

## 16. Sistema de Credits

Moneda interna con indicador visible (p. ej. **240 Credits**), historial de consumo, confirmación antes de operaciones costosas, pantalla de compra y posibilidad de mostrar cuánto costará una operación. **No inventar costos reales de APIs**: en esta primera fase usar **costos simulados**, con la arquitectura preparada para conectar los costos reales después.

## 17. Proyectos

Sistema de proyectos: **"Mis proyectos"** (Mi restaurante, Mi canción, Mi auto futurista, Mi logo, Mi casa…). Cada proyecto puede contener distintos resultados (logo, fotografías, anuncios, videos, música, documentos). Así WEE es un ecosistema, no una colección de herramientas.

## 18. Arquitectura futura

USUARIO → WEE → WEE BRAIN / ORQUESTADOR → WEE AI GATEWAY → PROVEEDOR DE IA → RESULTADO → WEE → USUARIO. Nunca conectar la interfaz a un proveedor concreto: capa de abstracción para proveedores (`generateImage()`, `generateVideo()`, `generateMusic()`, `editPhoto()`, `generateVoice()`) que después se conectan a distintos proveedores sin reconstruir WEE.

## 19. Regla fundamental

El usuario piensa "Estoy usando WEE", nunca "Estoy usando Gemini / OpenAI / Flux / una API". WEE oculta la complejidad tecnológica.

## 20. Referencias visuales

Las imágenes son referencias oficiales. Respetar: logo WEE/Weë, colores, estilo, proporciones, tarjetas, bordes redondeados, estética limpia, amarillo/dorado, blanco, gris claro, azul oscuro para textos, sensación amigable y premium, simplicidad. No sustituir el logo por uno inventado.

## 21. Responsive

Desktop, laptop, tablet y móvil. En móvil, adaptar la navegación (no reducir el desktop).

## 22. Calidad

No un prototipo bonito: una aplicación navegable. Botones importantes funcionan, los flujos se recorren, los formularios responden; las generaciones pueden usar resultados simulados. Objetivo: probar WEE como si ya fuera un producto real.

## 23. Orden de trabajo

| Fase | Entregable | Estado |
|---|---|---|
| 1 | Arquitectura general de WEE | ✅ WEE Brain + AI Gateway + trabajos (`functions/src/creator`, `functions/src/gateway`), capacidades abstractas, proveedor `mock`, configuración por especialista (`constants/specialists.ts`), acciones con respuesta preelegida (`presetAnswers`) |
| 2 | Navegación y layout principal | ✅ `CreatorShell` (escritorio: `CreatorSidebar` con Home, WEE Creator, los 10 especialistas y Credits + barra superior; móvil: cabecera compacta), pantalla genérica `SpecialistScreen` (hero, "¿Qué quieres hacer hoy?", foto, idea, ejemplos, mis creaciones), entradas desde ☰, barra lateral social y WEE Creator |
| 3 | WEE Brain | ✅ `screens/BrainChatScreen.tsx`: chat grande con saludo, opciones numeradas, atajos (Tengo una idea… No sé cómo hacerlo), entrada con Adjuntar / Hablar / Buscar en internet, y derivación al especialista adecuado ("Ir a Weë Studio · Seguir aquí") |
| 4 | WEE Design | ✅ "Diseña lo que imagines": Weë deduce del texto qué se diseña (auto, botella, logo, personaje…) y solo pregunta estilo y uso (§15); 3 propuestas visuales con "Elegida"; ediciones en lenguaje humano ("Hazlo más realista", "Cámbiale el color", "Más simple", "Más llamativo") |
| 5 | WEE Photo | ✅ Todas las acciones de la pantalla (mejorar, quitar objetos, fondo, restaurar, retoque, colorizar, transformar, crear imagen, no sé) con deducción por texto ("más nítida y con colores vivos" → no pregunta nada); la foto entra al flujo (subir/cambiar) y el resultado se muestra **antes / después** |
| 6 | WEE Music | ✅ Canción, beat, jingle, voz, letra, mezcla y **videoclip propio** ("Crear tu video con IA": canción + escenas + videoclip sin salir de Weë Music); preguntas condicionales (estilo/ánimo solo cuando aplican, voz solo para narración); reproductor simulado en el resultado |
| 7 | WEE Studio | ✅ Video desde una idea, animar una foto (con foto), video para redes, anuncio, historia, no sé; deduce tipo/estilo/dónde se publica del texto y pregunta "¿Dónde lo vas a publicar?" en lenguaje humano; resultado con play y duración |
| 8 | WEE Business | ✅ Pantalla propia: atajos (Ideas, Marketing, Redes sociales, Analizar, Documentos, Vender más, Trabajo y carrera), **Mis redes sociales** (conectar/desconectar, simulado), "Weë está listo para ayudarte", calendario de publicaciones, mensajes de clientes con Responder, resultados de la semana; flujos de contenido, programar, publicar, responder, analizar, campaña, CV, presentación, plan e ideas |
| 9 | WEE Chef | ✅ Receta, cocinar con lo que tengo (con foto de los ingredientes), menú (con lista de compras), saludable, postre, no sé; pregunta personas y tiempo solo cuando aplica; deduce todo lo posible del texto |
| 10 | WEE Home | ✅ Diseñar, remodelar, probar muebles, colores, distribución, ideas, exterior y jardín; pregunta espacio y estilo en lenguaje humano; foto del espacio con antes/después y lista de cambios y compras |
| 11 | WEE Beauty | ✅ Maquillaje, corte, color, barba, outfit, uñas, accesorios, cuidado de la piel (rutina), estilo por rostro y cambio de look; ocasión solo cuando aplica; foto con antes/después |
| 12 | WEE Writer | ✅ Publicación, historia, guion, artículo, email, documento, CV, portada, traducir, resumir, ideas, corregir, reescribir; **editor** cómodo (`WriterEditorScreen`) con ayudas en lenguaje humano (Mejorar, Corregir, Acortar, Alargar, Cambiar tono, Traducir, Resumir) que vuelven al editor; "Mis documentos" guardados en el dispositivo |
| 13 | Proyectos | ✅ `creatorProjects` (propios), "Mis proyectos" (lista + crear con emoji), detalle con las creaciones de todos los especialistas (renombrar, eliminar, añadir), "Guardar en proyecto" desde cualquier resultado con nombre sugerido ("Mi restaurante"); accesos en barra lateral, ☰ y Weë Creator |
| 14 | Credits (simulados) | ✅ Precios **de prueba** por capacidad en el servidor (`CREATOR_PRICING_MODE=simulated`; `real` usa `pricing/{capacidad}`), 240 Credits de bienvenida simulados, coste visible antes de crear ("≈ 12 Credits · precio de prueba", se descuentan al terminar y se devuelven si falla), historial en Wallet, compra simulada en la tienda |
| 15 | Perfil, configuración y elementos comunes | ✅ Barra lateral de escritorio = el mismo menú único (Inicio · Buscar · Comunidades · Weëls · WeeTalk · Weë Creator con los 10 especialistas + Mis proyectos · Credits · Notificaciones · Guardados · Configuración · Ayuda), botón Crear que abre la hoja Crear, columna derecha con temáticas reales (sin datos inventados), pantalla **Ayuda** (`screens/HelpScreen.tsx`: preguntas frecuentes, términos y privacidad, contacto), Configuración con textos reales, Login/Registro/Onboarding con la identidad blanca y avisos que funcionan en web (`utils/notify.ts`), notificaciones que abren la publicación, Buscar en español, botones amarillos con texto oscuro, barra inferior visible en tablet |
| 16 | Revisión de toda la experiencia | 🔜 |

No avanzar a la integración de APIs reales hasta que WEE esté construido y navegable. (El adaptador de Gemini ya escrito queda **dormido**: sin clave, todo corre con el proveedor de prueba.)

## 24. Resultado esperado

Abrir WEE y sentir que se entra en un producto real: "un equipo completo de especialistas de IA dentro de una sola plataforma". La experiencia principal transmite: **"Cuéntale a WEE lo que quieres. WEE se encarga de la IA."**

---

## Decisiones de implementación (Claude, 2026-09-05)

- **Un solo código** (React Native + React Native Web): las pantallas de los especialistas se construyen una vez y se adaptan por tamaño de pantalla. En escritorio, el menú ☰ de `docs/UX.md` se convierte en la **barra lateral** de las referencias (Home, WEE Brain, los especialistas, Credits); en móvil se mantiene el ☰ y la barra inferior.
- **Cada especialista = configuración + piezas propias.** La configuración (`constants/specialists.ts`: hero, acciones "¿Qué quieres hacer hoy?", modos de entrada, ejemplos, frase manuscrita) alimenta piezas compartidas (`SpecialistHero`, `ActionGrid`, `IdeaBox`, `UploadBox`, `ExamplesRow`) y cada especialista añade lo suyo (chat grande en Brain, editor en Writer, "Mis redes" en Business, "Crear tu video con IA" en Music, antes/después en Photo y Beauty).
- **Todo flujo termina en el mismo motor**: una acción o una idea escrita abre la conversación guiada (`CreatorFlow`) con el objetivo y las respuestas ya deducidas; WEE Brain y el AI Gateway (proveedor `mock`) hacen el resto.
- **Imágenes simuladas sin internet**: los ejemplos y resultados de muestra se dibujan localmente (tarjetas con degradado, emoji y etiqueta), nunca desde servicios externos.
