# fal.ai, 3D World y el WEË 3D Engine

Misión del dueño del 2026-10-05: integrar fal.ai como UN proveedor más, la primera capacidad 3D (un mundo explorable a
partir de una imagen) y un solo núcleo de composición 3D para todo Weë. Este documento dice qué se construyó, dónde
vive, qué está apagado y por qué, y qué decisiones esperan al dueño. Nada de esto está desplegado ni activo.

## 1. La regla de arquitectura

```
Experiencia → Weë Brain → Planner / Orchestrator
  → capacidad (world.generate)
  → POLÍTICA DE ELEGIBILIDAD (gobierno + jurisdicción de la operación)   engine/elegibilidad.ts
  → registro de modelos + registro de proveedores                         engine/registry.ts · registry/
  → restricciones (calidad, coste, duración, topes)
  → AI Router (solo entre elegibles)                                       engine/router.ts · core/router.ts
  → AI Gateway → adaptador → proveedor → modelo                            engine/gateway.ts · engine/providers/fal.ts
```

- **fal es un proveedor, no una capa.** No es gateway, ni router, ni orquestador, ni registro, ni Credits, ni Job
  Engine, ni media cloud. Entra por `ADAPTERS` como cualquier otro y se sustituye sin tocar ninguna experiencia.
- **Es una excepción controlada** a «solo matrices» (`registry/excepciones.ts`, aprobada el 2026-10-05, con su
  motivo). En el registro del Core es de tipo `aggregator`, y solo las excepciones aprobadas pueden serlo
  (`core-registry` 23a/23/24).
- **Los modelos son DATOS** (`engine/providers/fal-modelos.ts`): id de fal, capacidad, versión, esquemas de entrada y
  salida publicados, precio del proveedor con su fuente, licencias con lo que importa de cada una, uso comercial,
  derechos del resultado, atribución, reglas territoriales, revisión legal, activación y fuentes oficiales. Ni
  precios ni margen en el adaptador.

## 2. Elegibilidad: una sola regla, por jurisdicción

`engine/elegibilidad.ts` contesta «¿se puede usar este modelo en ESTA operación?» para todo Weë —cualquier capacidad,
cualquier experiencia— y la usan las tres piezas que eligen modelo: el router vivo (`pickModel`), el ejecutor del
Gateway del Core (`conAjustesDeAdministracion`) y el puente al registro del Core (`describirModelo`). Escalones, y el
primero que falla decide:

| Estado | Qué significa | ¿Elegible? |
|---|---|---|
| `BLOCKED_GLOBAL` | La licencia, el proveedor o Weë lo prohíben en todas partes | Nunca |
| `BLOCKED_FOR_JURISDICTION` | Prohibido en una de las jurisdicciones de la operación (y solo en ellas) | No, ahí |
| `JURISDICTION_UNKNOWN` | Tiene reglas territoriales y la operación no dice dónde ocurre | No (falla cerrado) |
| `REVIEW_REQUIRED` | Sin revisión legal aprobada, global o para esa jurisdicción | No |
| `APPROVED` | Aprobado, pero no activado | No |
| `ACTIVE` | Aprobado y activado | **Sí** |

- **La jurisdicción es política, no interfaz.** Viaja en `EngineContext.jurisdicciones` (ISO 3166-1 alfa-2) y la pone
  el servidor; nunca el cliente, el idioma, el locale, la IP ni el país del dispositivo. **Su fuente es la de la
  cuenta** (`engine/jurisdiccion.ts`, compuesto en `engine/index.ts`): el país que DECLARA el Perfil Real
  (`users.country`, obligatorio en el registro), leído en el servidor del perfil que el resolutor canónico reconoce como
  de esa cuenta. Es la única ubicación que Weë guarda de una persona (auditoría del 2026-10-05: el idioma no mira la
  ubicación y el `country` del Financial Core no tiene datos). Solo se consulta si algún modelo de la cadena tiene
  reglas territoriales —el tráfico de siempre no hace ni una lectura más—, una jurisdicción que ya pone el servidor en
  la petición manda sobre ella, y si la lectura falla o no hay país válido, `JURISDICTION_UNKNOWN`. Es una
  declaración. **Política del dueño (2026-10-06):** el país del Perfil Real es la fuente; con una restricción territorial
  explícita para ese país, el modelo queda fuera y el Router busca otro; sin ella, el territorio no lo excluye. Solo cuenta
  un país del catálogo de Weë (`PAISES_DEL_CATALOGO`, los 193 del registro): otro valor no determina el país y, para un
  modelo territorial, falla cerrado.
- **Una operación puede tocar varias jurisdicciones**: si cualquiera está bloqueada, bloqueada; si cualquiera no está
  aprobada, en revisión.
- **Los grupos** se declaran una vez (`GRUPOS_DE_JURISDICCIONES`): `EU` = los 27 Estados miembros. Un territorio con
  código propio que no esté en ningún grupo (Gibraltar, Åland, ultramar…) tampoco está en el catálogo de países de Weë:
  declararlo no da jurisdicción, y para un modelo territorial es `JURISDICTION_UNKNOWN`. Si el catálogo ofreciera una
  región ultraperiférica de la UE, tendría que entrar en el grupo `EU` (lo vigila `mundo3d-gobernanza` E3).
- **La configuración solo endurece.** `aiProviders/{proveedor}.models[id]` puede apagar un modelo, pedir revisión o
  bloquearlo; nunca aprobarlo, levantar un bloqueo ni tocar su identidad, su gobierno o su territorio
  (`camposAjustables`). Aprobar es una revisión legal con evidencia, escrita en los datos del modelo con sus fuentes.
- **Un modelo de un agregador sin gobierno declarado no es elegible**: nadie revisó su licencia.
- **El Router solo compara elegibles.** Ninguna política, calidad, precio ni modelo fijado lo amplía. Sin ningún
  candidato elegible contesta `NOT_AVAILABLE` con su **motivo público** (`ahora_no`, `en_tu_region`, `falta_tu_pais`,
  `con_estas_opciones` o `no_disponible`; los escalones se quedan en el servidor), y no sirve nada en su lugar: ni el demo
  (el demo no tiene ningún modelo de mundos).
- **La jurisdicción llega al ejecutor del Core** (misión mundo3d): la puerta la lee una vez de la cuenta y la pasa al
  Router, al ejecutor (`jurisdiccionesDe`) y a la política; sin ella, un modelo territorial falla cerrado. El catálogo del
  Core, que no es de ninguna operación, da por usable un modelo territorial aprobado en ALGUNA jurisdicción.
- **El adaptador no decide nada de esto.** fal no sabe de jurisdicciones; si se llega a `run`, la regla común ya dijo
  que sí (`elegibilidad-jurisdiccion` 9 y 9b).
- **Auditoría:** cada intento deja en su registro de `aiGenerations` (`elegibilidad`) con qué jurisdicciones se decidió
  (`null` si no se sabían) y qué modelos quedaron fuera, con su escalón; junto a lo que el libro ya guardaba —proveedor,
  modelo, capacidad, petición, trabajo, coste, Credits y fechas—. Solo cuando hay algo que auditar: el tráfico de
  siempre no cambia de forma. Es del libro de administración; la persona nunca lo ve (`elegibilidad-jurisdiccion` 25).

Relación con lo que ya había: la **región técnica** del Router del Core (`constraints.region`, dónde declara servir un
modelo) es otra cosa, y la capa **Policy & Eligibility del runtime** (`runtime/politica.ts`, F12-D) son reglas de
«deny» de la administración solo en el camino del conductor, hoy **sin ninguna regla**. **Alineada el 2026-10-05**
(orden del dueño): igual que la regla común, falla cerrado. Una regla de región o de producto solo deja de aplicar si
el dato se conoce y queda fuera; sin región o sin producto, se aplica. Sin reglas sigue sin bloquear nada.

## 3. Hunyuan World 1.0 (imagen → mundo 3D)

`fal-ai/hunyuan_world/image-to-world`, capacidad `world.generate`, USD 0,30 por petición (página del modelo,
2026-10-05).

| | |
|---|---|
| Revisión global | `REVIEW_REQUIRED` (no `BLOCKED_GLOBAL`: la restricción encontrada es territorial) |
| Territorio | `BLOCKED_FOR_JURISDICTION` en la UE, el Reino Unido y Corea del Sur; ninguna aprobada por lista; resto `APPROVED` por territorio (política del dueño, 2026-10-06: territorio no bloqueado → potencialmente elegible). Lo sigue parando la revisión global |
| Activación | `DISABLED` |
| fal | `enabled: false` por defecto; `FAL_KEY` en un llavero dormido que ninguna Function monta |

Fuente: *Tencent HunyuanWorld-1.0 Community License Agreement* (2025-07-27): el «Territory» excluye la UE, el Reino
Unido y Corea del Sur; prohíbe usar o mostrar el resultado fuera del Territory, también a través de un servicio
alojado; umbral de 1 M de usuarios activos mensuales; el punto 12 de su política de uso pide identificar lo generado
por máquina; hay que entregar copia del acuerdo a quien reciba las obras. Términos de fal: §2 (18 años o mayoría de
edad local), §4(b)(ii) (no exponer la API de fal: Weë la usa solo en el servidor), §6(e) (ni reventa ni «service
bureau»), §14 (materiales de terceros). Ninguna cláusula asigna la propiedad del resultado.

Hoy no es elegible **en ninguna jurisdicción**. Lo que el resultado no puede hacer viaja con el material:
`Asset.derechos.jurisdiccionesBloqueadas = ['EU','GB','KR']`.

Ampliar un mundo (`world.expand`) **no existe** en el proveedor: `NOT_SUPPORTED_BY_CURRENT_PROVIDER`, ni en el
catálogo ni simulado. **Hunyuan 3D** no se añadió: la familia 2.x tiene las mismas exclusiones territoriales y la 3.x
es «partner-hosted» sin licencia pública → `REVIEW_REQUIRED`.

## 4. El adaptador (`engine/providers/fal.ts`)

- **Cola de fal**: `POST https://queue.fal.run/{modelo}`; sigue SOLO URLs de su cola (una `status_url` o `response_url`
  ajena se ignora); estados `IN_QUEUE` / `IN_PROGRESS` / `COMPLETED`; el resultado se pide aparte.
- **Siempre**: `Authorization: Key …` (solo en el servidor), `x-app-fal-disable-fallback: true` (el modelo, y con él
  su licencia, es el que eligió Weë), `X-Fal-Store-IO: 0` (fal no guarda entradas ni salidas), caducidad corta.
- **Entrada**: solo los campos del esquema publicado (ni prompt, ni calidad, ni webhook, ni `sync_mode` se cuelan).
  Las fotos tienen que ser de la carpeta de quien pide en el Storage de Weë (`users/{uid}/…`) y viajan **en línea**
  (data URI), como en Seedance: una URL de Weë nunca sale hacia fal.
- **Salida**: cada archivo del esquema se copia al Storage de Weë al llegar (tope de 200 MB, solo https); sale como
  `kind: 'world'`, con los derechos del modelo. El formato real de `world_file` **no está verificado** (el esquema solo
  dice «File»).
- **Identidad**: el endpoint, el esquema y la licencia salen del catálogo propio por id; un gobierno forjado en la
  petición no lo redirige y un modelo que no conoce no se llama.
- **Asíncrono, por la TERCERA puerta del conductor** (misión mundo3d, 2026-10-05, FASE 5 autorizada por el dueño): con
  `acceptAsync` suelta la llamada y devuelve la operación (`{modelo con «:» en vez de «/»}::{request_id}`: el runtime no
  admite «/» y la etiqueta del Core no admite «~»); `verificarFirmaDeFal` (ED25519 contra el JWKS de fal, ±300 s, sobre el
  cuerpo crudo), `leerAvisoDeFal` (el mundo y su vista previa por PAPEL), `resolutorDeFal` (reconciliación, nunca lanza,
  y sabe pedir parada) y `cancelarEnFal`. `world.generate` entra al Core por `generateWorld` (`creator/mundo.ts`), detrás
  de la puerta cerrada de `aiSettings/runtime`, **sin desplegar**; el barrido conoce a fal por `RESOLUTORES_DE_ESTADO`
  (`engine/registry.ts`) y, sin `FAL_KEY` montada, contesta «no configurado» y el trabajo espera. Ningún webhook de fal
  está expuesto. La experiencia entera: [3D-EXPERIENCIA.md](3D-EXPERIENCIA.md).

## 5. Credits y material

- Servicio `ai_world` = 39 Credits de prueba: `usdToCredits(0,30)` con la fórmula del motor (coste × Credits por dólar ×
  margen), no un número suelto. Se cobra con el Credit Engine de siempre; el adaptador no sabe de Credits.
- `AssetKind` gana `world` y el material gana `derechos` (revisión, uso comercial, atribución, licencias con https y
  jurisdicciones bloqueadas). Aditivo: **ningún contrato sube de versión**, para no invalidar los materiales guardados.

## 6. El WEË 3D Engine (`core/escena3d.ts`)

Un solo núcleo de composición para Weë Studio (3D World), Weë Design (3D Design) y, después, Weë Filmmaker: los tres
son **perfiles** del mismo grafo de escena (`world`, `design`, `filmmaker`), no motores distintos. Nodos con papel y
transformación, cámaras y zonas; los materiales y Elements se referencian por **id**, nunca por URL; las operaciones son
puras y nunca dejan una escena inválida; `materialesDeLaEscena3D` permite reutilizar lo generado; y no promete ampliar
un mundo sin una capacidad que lo haga (`puedeAmpliarse`). No conoce proveedores ni endpoints: añadir uno no lo toca.
Contrato `ESCENA3D_CONTRACT_VERSION = '1.0'`. No está conectado a ninguna pantalla ni se guarda todavía: el visor y
la persistencia esperan sus decisiones (§7).

## 7. Lo que espera al dueño

Ver [DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md) § fal.ai y [3D-EXPERIENCIA.md](3D-EXPERIENCIA.md) §19: la revisión
legal GLOBAL de Hunyuan World (el territorio ya no la bloquea fuera de EU/GB/KR; DECIDIDO el 2026-10-06 que el país del
Perfil Real es la fuente), si el país del perfil debe poder cambiarse libremente, dónde se hace cumplir lo que el
material no puede mostrarse, crear `FAL_KEY` y montarla en `generateWorld` y en el barrido, desplegar `generateWorld` y
exponer el webhook, el precio real y el visor 3D. El orden, en el runbook de activación ([3D-EXPERIENCIA.md](3D-EXPERIENCIA.md)
§20), PREPARADO y NO ejecutado.

## 8. Pruebas

`elegibilidad-jurisdiccion` (34: los diez casos del ajuste de jurisdicción, la fuente de la cuenta, la política del runtime, la auditoría y lo que los sostiene), `proveedor-fal`
(30: el adaptador con la red sustituida por dobles, firma, cancelación, reconciliación, Credits, material y que nada
está encendido) y `escena3d` (11). Y desde la misión mundo3d: `mundo3d-contrato` (29), `no-disponible` (26),
`mundo3d-salidas` (27), `mundo3d-asincrono` (36), `crear-mundo-3d`, `mundo3d-app` y el emulador `mundo3d.emulator.mjs`
(24, con una cola de fal falsa en esta máquina). Todas deterministas y sin red. $0.
