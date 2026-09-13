# WEË AI — Arquitectura general de IA

> Instrucciones del dueño del producto (2026-09-05, documento completo). Actualizan el §6 y §7 de [`UX.md`](UX.md):
> las categorías de herramientas se reemplazan por las **experiencias de WEE** (§1).
> Diseñar toda la arquitectura, UX y lógica de WEË AI respetando estos principios.

WEË AI está pensado principalmente para personas que **no** dominan la inteligencia artificial. El usuario no debe saber qué modelo utilizar, qué API existe, cómo escribir prompts ni ningún concepto técnico.

La filosofía central es:

> **"EL USUARIO ELIGE EL RESULTADO. WEE ELIGE LA IA."**

WEE se encarga de toda la complejidad tecnológica internamente.

## 1. Las 11 experiencias de WEE

WEË AI tiene solamente 11 grandes especialistas visibles:

| | Experiencia |
|---|---|
| 🎨 | WEE Design |
| 🎬 | WEE Studio |
| 📸 | WEE Photo |
| ✍️ | WEE Writer |
| 🎵 | WEE Music |
| 💄 | WEE Beauty |
| 👨‍🍳 | WEE Chef |
| 🏠 | WEE Home |
| 💼 | WEE Business |
| ✈️ | WEE Travel |
| 🧠 | WEE Brain |

Estos nombres son parte de la identidad de WEE y deben mantenerse.

**Importante:** estas 11 secciones **no** significan necesariamente que exista una sola IA detrás de cada una. Son *experiencias de usuario*. Detrás de cada experiencia WEE puede utilizar una o varias APIs, modelos y servicios especializados.

## 2. El usuario no debe ver la complejidad

El usuario **no** debería tener que pensar: "¿Uso ChatGPT?", "¿Uso Claude?", "¿Uso Midjourney?", "¿Qué modelo de video necesito?", "¿Qué prompt escribo?", "¿Qué parámetros utilizo?".

El usuario simplemente dice qué quiere conseguir. Ejemplo:

> "Quiero hacer un video bonito para promocionar mi restaurante."

WEE debe entender la intención, hacer las preguntas necesarias y decidir internamente qué herramientas necesita. **El usuario solamente ve WEE.**

## 3. WEE Brain como cerebro

WEE necesita una capa de inteligencia central que funcione como cerebro/orquestador. Puede utilizar un LLM como OpenAI, Claude, Gemini u otro proveedor adecuado.

Su función es:

- entender al usuario
- interpretar lenguaje normal
- hacer preguntas sencillas
- detectar qué quiere conseguir
- convertir la conversación en instrucciones estructuradas
- crear los prompts internos
- decidir qué herramientas/API necesita
- coordinar varias herramientas cuando sea necesario
- interpretar resultados
- explicarlos al usuario de forma sencilla

El usuario **no** debe ver necesariamente el prompt técnico.

## 4. WEE no depende de una sola IA

La arquitectura debe permitir utilizar diferentes proveedores. Ejemplo:

- **WEE Design** → modelo de imagen A → modelo de imagen B → API de edición → eliminación de fondo → etc.
- **WEE Beauty** → API especializada de belleza → modelo de imagen → análisis facial/visual → etc.
- **WEE Studio** → generación de video → imagen a video → voz → música → etc.

La experiencia sigue siendo una sola: WEE Design, WEE Beauty, WEE Studio. El usuario no necesita conocer los proveedores que existen detrás.

## 5. Una sección puede utilizar varias IA

No diseñar la arquitectura pensando "una sección = una API". Debe poder funcionar:

- **UNA SECCIÓN → VARIAS APIs**
- **UNA PETICIÓN → VARIAS APIs**

Ejemplo. El usuario dice: *"Hazme un comercial para mi restaurante."* WEE puede hacer internamente:

| Paso | Quién | Qué |
|---|---|---|
| 1 | WEE Brain | entiende la idea |
| 2 | WEE Writer | crea concepto y guion |
| 3 | WEE Design | crea imágenes |
| 4 | WEE Studio | genera el video |
| 5 | WEE Voice *(capacidad interna, no es sección visible)* | genera narración si es necesaria |
| 6 | WEE Music | genera música si es necesaria |

El usuario solamente ve el resultado final. No necesita saber que se utilizaron varias IA.

## 6. Los prompts deben ser invisibles

El usuario normal **no** debe tener que escribir prompts técnicos. Cada función debe tener instrucciones internas y plantillas inteligentes.

Ejemplo — WEE Beauty: *"Quiero verme con el cabello largo."* WEE internamente construye todas las instrucciones necesarias para conservar identidad, conservar rostro, conservar iluminación, modificar solamente el cabello, aplicar el estilo solicitado y mantener un resultado natural. El usuario solamente ve el proceso sencillo.

**No mostrar por defecto:** prompt, negative prompt, seed, parámetros técnicos, modelo, ControlNet, configuración avanzada, nombres de APIs.

Si queremos un modo avanzado para usuarios expertos, puede existir opcionalmente, pero debe estar **oculto por defecto**.

## 7. Experiencia didáctica

WEE debe ser extremadamente didáctico. Piensa en una persona que nunca ha utilizado inteligencia artificial: no debería tener que saber "qué pedirle a la IA". WEE debe preguntarle cosas sencillas.

Ejemplo — 👨‍🍳 WEE Chef, *"¿Qué quieres hacer?"*:

- 🍳 Quiero cocinar algo
- 🍽️ Quiero una receta
- 📋 Quiero crear un menú
- 💡 No sé qué cocinar

La opción **🤷 NO SÉ** es muy importante. WEE debe poder ayudar incluso cuando el usuario no sabe qué herramienta necesita.

## 8. Las 11 secciones

| Sección | Debe permitir | Ejemplos |
|---|---|---|
| 🎨 **WEE Design** | crear y transformar contenido visual | logos, imágenes, posters, diseños, ilustraciones, portadas, material para redes, creatividad visual |
| 🎬 **WEE Studio** | crear contenido audiovisual | videos, animaciones, videos para redes, publicidad, imagen → video, historias visuales, voz, contenido audiovisual |
| 📸 **WEE Photo** | trabajar específicamente con fotografías | mejorar una foto, restaurar fotos, eliminar objetos, cambiar fondos, mejorar calidad, retocar, transformar fotografías |
| ✍️ **WEE Writer** | ayudar a escribir | publicaciones, historias, guiones, emails, cartas, textos, libros, ideas, corrección |
| 🎵 **WEE Music** | trabajar con música y sonido | canciones, música, música instrumental, voces, narración, sonido |
| 💄 **WEE Beauty** | trabajar con belleza y apariencia | maquillaje, cabello, color de cabello, barba, ropa, outfits, uñas, cambio de look |
| 👨‍🍳 **WEE Chef** | funcionar como un chef personal | qué cocinar, recetas, ingredientes disponibles, menús, postres, sustituciones, ideas gastronómicas |
| 🏠 **WEE Home** | ayudar con casas y espacios | decoración, diseño interior, habitaciones, muebles, remodelación, exteriores, jardines, estilos, visualización de espacios |
| 💼 **WEE Business** | ayudar con trabajo y negocios | ideas de negocio, marketing, publicidad, contenido para redes, CV, documentos, presentaciones, planificación, análisis |
| ✈️ **WEE Travel** | preparar un viaje | planificar un viaje día a día, elegir destino cuando no se sabe a dónde ir, qué hacer y dónde comer, cómo moverse. **No reserva nada**: ni vuelos, ni hoteles, ni entradas |
| 🧠 **WEE Brain** | ser el asistente general | preguntas, investigación, aprendizaje, explicaciones, documentos, traducción, planificación, resolver problemas, **cualquier cosa que no encaje claramente en otra sección** |

Debe existir una idea como: **"¿No sabes dónde buscar? Pregúntale a WEE."**

### WEE Travel es una sección, no una aplicación aparte

WEE Travel (fase 2E-64C, Fase A) se añadió como la undécima experiencia sin estrenar
ni una pieza propia. Entra por el menú ☰ igual que las demás, por la ruta
`Specialist { id: 'travel' }`, y reutiliza todo lo que ya existía:

| Reutiliza | En vez de |
|---|---|
| el Wäll general | un feed propio |
| `WeeTag` y `sourceSection` | una marca de origen distinta |
| 📍 Lugar, que es transversal a todo WEE | una ubicación propia de viajes |
| `CreatorFlow` y `ResultCard` | pantallas nuevas |
| el WEË AI ENGINE y el Credit Engine | proveedores o precios propios |

Y **no tiene**, ni en Fase A ni por defecto más adelante: colección `trips`, feed
separado (`travelPosts`, `travelFeed`…), sistema de ubicación propio, GPS, mapa,
ni APIs de reservas de vuelos, hoteles o entradas. Prepara el viaje; ir es cosa
de la persona.

## 9. WEE debe poder elegir la mejor IA

No quedar atado a un proveedor. Crear conceptualmente una capa intermedia:

```
USUARIO
  ↓
WEE
  ↓
WEE BRAIN / ORCHESTRATOR
  ↓
AI GATEWAY
  ↓
PROVEEDOR / API
  ↓
RESULTADO
  ↓
WEE
  ↓
USUARIO
```

Esto permite cambiar proveedores en el futuro: si mañana aparece un modelo de video mejor o más barato, WEE debería poder cambiar el proveedor internamente sin que el usuario tenga que aprender nada nuevo.

## 10. Investigar las APIs reales

Cuando llegue el momento de implementar cada especialista, **no** asumir que cualquier herramienta de IA tiene API. Para cada función investigar:

- si tiene API real
- documentación
- precio
- uso comercial
- posibilidad de integrarla en una aplicación
- límites
- velocidad
- calidad
- condiciones de uso
- posibilidad de white-label
- estabilidad
- escalabilidad

La prioridad es integrar servicios que realmente puedan funcionar dentro de WEE. **No** simples enlaces hacia otras páginas de IA: **WEE es la interfaz.**

## 11. Credits

Todo se integra con el sistema global de WEE Credits. Cada acción puede tener un coste diferente (texto, imagen, edición de imagen, video, voz, proceso complejo con varias IA → X Credits).

**Los valores definitivos no deben inventarse todavía.** Primero conocer el coste real de las APIs; después calcular:

```
COSTO DE API + INFRAESTRUCTURA + OTROS COSTOS + MARGEN DE WEE = PRECIO EN CREDITS
```

Si una solicitud utiliza varias APIs, WEE debe poder contabilizar el consumo total. El usuario no necesita saber cuánto costó cada API internamente.

## 12. Ejemplo completo

Usuario: *"Quiero hacer una publicación para Instagram para vender mi hamburguesa."*

WEE: *"Perfecto. ¿Qué quieres promocionar?"* — 🍔 Una hamburguesa · 🍟 Un combo · 🔥 Una promoción · 🤷 No sé

Usuario: *"Una hamburguesa."*

WEE: *"¿Qué estilo quieres?"* — 🔥 Impactante · 🤤 Apetitosa · ✨ Elegante · 😂 Divertida · 🤷 Sorpréndeme

Después WEE genera internamente texto, imagen, diseño y formato para redes utilizando diferentes modelos/APIs. El usuario solamente recibe:

```
✨ Tu publicación está lista.
[Imagen]
[Texto]
[Crear otra versión]  [Editar]
```

## 13. Objetivo de producto

WEË AI **no** debe sentirse como "una colección de herramientas de IA". Debe sentirse como **"una colección de especialistas que trabajan para mí"**.

El usuario entra y piensa: *"Necesito hacer esto."* WEE responde: *"Perfecto. Yo te ayudo."* No importa qué modelo, API o proveedor esté detrás.

## 14. Filosofía final

Regla principal de todo WEË AI:

> **"EL USUARIO ELIGE EL RESULTADO. WEE ELIGE LA IA."**

Segunda regla:

> **"NO HAGAS QUE EL USUARIO APRENDA A USAR LA IA. HAZ QUE LA IA APRENDA A AYUDAR AL USUARIO."**

Diseñar toda la arquitectura, UX y lógica de WEË AI respetando estos principios.

---

## Cómo se refleja hoy en el código

- `constants/weeExperiences.ts`: las 11 experiencias (nombre, emoji, qué consigue la persona, ejemplos en lenguaje normal, palabras clave), alineadas con el §8. Fuente única para el menú ☰, `WeeCreatorScreen` y el registro de interés.
- `screens/WeeCreatorScreen.tsx`: entrada por intención ("¿Qué quieres crear?") que sugiere el especialista; cada experiencia muestra ejemplos y "Avísame cuando esté" (`services/creatorInterestService.ts`, colección `creatorInterests`).
- Pendiente: WEE Brain + AI Gateway (orquestación server-side en Cloud Functions, claves de proveedores fuera del cliente), los flujos guiados con opciones y "🤷 No sé" (§7 y §12), la investigación de APIs (§10) y el modelo de costes en Credits (§11). La propuesta de arquitectura está en [`CREATOR-ARQUITECTURA.md`](CREATOR-ARQUITECTURA.md).
