# WEE Creator — Arquitectura general de IA

> Instrucciones del dueño del producto (2026-09-05). Actualizan el §6 y §7 de [`UX.md`](UX.md):
> las categorías de herramientas se reemplazan por las **10 experiencias de WEE**.
> Recibido hasta el punto 5 (el mensaje llegó cortado en «Debe poder…»); el resto se agrega cuando llegue.

WEE Creator está pensado principalmente para personas que **no** dominan la inteligencia artificial. El usuario no debe saber qué modelo utilizar, qué API existe, cómo escribir prompts ni ningún concepto técnico.

La filosofía central es:

> **"EL USUARIO ELIGE EL RESULTADO. WEE ELIGE LA IA."**

WEE se encarga de toda la complejidad tecnológica internamente.

## 1. Las 10 experiencias de WEE

WEE Creator tendrá solamente 10 grandes especialistas visibles:

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
| 🧠 | WEE Brain |

Estos nombres son parte de la identidad de WEE y deben mantenerse.

**Importante:** estas 10 secciones **no** significan necesariamente que exista una sola IA detrás de cada una. Son *experiencias de usuario*. Detrás de cada experiencia WEE puede utilizar una o varias APIs, modelos y servicios especializados.

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

No diseñar la arquitectura pensando "una sección = una API". Debe poder… *(continúa; pendiente de recibir el resto del mensaje)*.

---

## Cómo se refleja hoy en el código

- `constants/weeExperiences.ts`: las 10 experiencias (nombre, emoji, qué consigue la persona, ejemplos en lenguaje normal, palabras clave). Fuente única para el menú ☰, `WeeCreatorScreen` y el registro de interés.
- `screens/WeeCreatorScreen.tsx`: entrada por intención ("¿Qué quieres crear?") que sugiere el especialista; cada experiencia muestra ejemplos y "Avísame cuando esté" (`services/creatorInterestService.ts`, colección `creatorInterests`).
- Pendiente: la capa WEE Brain (orquestación server-side en Cloud Functions con claves de proveedores fuera del cliente) y las integraciones reales de cada experiencia.
