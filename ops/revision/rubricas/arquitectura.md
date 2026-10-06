# Rúbrica del revisor de ARQUITECTURA de Weë

Se lee junto a [comun.md](comun.md) (contrato, severidad, estados, salida). Dominio de los ids: `ia-arquitectura`.

El revisor de arquitectura mira si lo que cambió **respeta las capas de Weë, no duplica una pieza que ya existe
y deja el sistema más simple o, al menos, no más enredado**. Entra con las zonas `arquitectura`, `ia`,
`planner-runtime`, `algoritmo` y `filmmaker`, y siempre que los detectores disparan una frontera: carpeta nueva
en `functions/src`, arista nueva entre carpetas, exports de `functions/src/index.ts` cambiados.

## 1. La capa canónica

Weë ya tiene sus piezas; lo nuevo se apoya en ellas en vez de rodearlas:

- **IA:** Weë → WEË AI ENGINE → AI ROUTER → adaptador → API oficial. Un proveedor nuevo es un adaptador y una
  línea en `ADAPTERS`. Llamar a una API de IA fuera de un adaptador, o escribir una segunda capa de routing, es
  alta (bloqueante si llega a producción).
- **Weë Brain es uno.** Todas las cajas de Weë AI son puertas al mismo Brain; lo único que cambia es el
  CONTEXTO que se pasa por props o parámetros. Un sistema conversacional nuevo, un motor de contexto nuevo o una
  copia de `CajaDePrompt` es un hallazgo alto.
- **El conductor del Core** (`functions/src/runtime/`) atiende exactamente tres canaries detrás de
  `aiSettings/runtime`: `brainChat` → `text.generate`, `generateVideo` → `video.generate` y `generateWorld` →
  `world.generate` (asíncrona, sin desplegar; confirmada por el dueño el 2026-10-06), cada una con su
  `CAPACIDAD_DEL_CANARY` en su código. `world.generate` exige lista de cuentas durante su canary
  (`LISTA_DE_CUENTAS_OBLIGATORIA`): que la puerta se abra sin lista es alta. Abrir una cuarta puerta, migrar otra
  capacidad, convertir una puerta en otra, o simular que el orquestador atiende más de lo que atiende, sin
  autorización explícita, es alta.
- **Credits:** el Credit Engine es la única puerta del dinero (ver la rúbrica de seguridad).
- **Datos generados:** los espejos (`services/filmmaker/espejo/**`, textos del servidor) se regeneran con su
  script; editarlos a mano es un hallazgo.

## 2. Fronteras explícitas

- Cada carpeta de primer nivel de `functions/src` es una capa con su contrato (`core/contracts.ts`, los tipos
  de cada motor). Una arista NUEVA entre carpetas (que dispara `frontera/cambio`) se justifica: ¿la dependencia
  va en el sentido de las capas (producto → motor → núcleo) o al revés?
- Los imports cíclicos de VALOR los ve el detector; aquí se dice cómo romperlos (extraer el tipo, invertir la
  dependencia, mover el ayudante a la capa de abajo).
- Exports de `functions/src/index.ts`: una función nueva expuesta es superficie pública (y coste); una que
  desaparece puede romper un cliente desplegado. Las dos cosas se nombran.

## 3. Simplificación estructural

La pregunta de siempre: **¿se puede reformular para que desaparezcan ramas o capas?** Un adaptador que repite
lo que el motor ya hace, un envoltorio que solo pasa parámetros, dos tablas que dicen lo mismo, un flag que
convierte una función en dos. Un buen hallazgo de arquitectura dice qué capa sobra y qué queda después.

## 4. Crecimiento espagueti y tamaño

- Archivos que cruzan las 1000 líneas (el detector lo marca): ¿por qué responsabilidad se parten?
- Funciones que acumulan casos por tipo de experiencia, de proveedor o de idioma con `if`: casi siempre hay un
  catálogo (`constants/`, el Registry, las cadenas de Firestore) donde ese dato debería vivir.
- «Muchas posibilidades por detrás, una experiencia simple por delante»: la complejidad nueva tiene que quedarse
  detrás; si se asoma a la interfaz (modelos, proveedores, prompts técnicos a la vista), es un hallazgo.

## 5. Atomicidad e idempotencia

- Escrituras que tienen que ir juntas van en la misma transacción o lote; un estado intermedio visible (trabajo
  creado sin su cobro, cobro sin su trabajo) es alta.
- Todo lo que se reintenta es idempotente (`requestId`, CAS sobre el estado del trabajo); un reintento que
  duplica un cobro, una generación o un evento es alta.
- El conductor decide por el ESTADO guardado del trabajo, no por relojes; no se acortan plazos para «arreglar»
  una carrera.

## 6. Lo que no se toca sin permiso

- Las interfaces de Weë AI construidas según `docs/CREATOR-BUILD.md` son la referencia visual definitiva: no se
  rediseñan ni se simplifican; las APIs se conectan por debajo.
- Weë Music queda intacta (sin Suno ni otra API musical).
- El Home y la arquitectura de navegación (un solo menú ☰, comunidades, no secciones) son decisiones de
  producto: cambiarlas es una decisión del dueño, no una mejora técnica.
- Las fases CERRADAS (Core, runtime F12-D, Algorithm Engine) solo cambian con su suite verde y, si tocan su
  contrato, con versión nueva del contrato.
