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
  el servidor desde una fuente de confianza; nunca el cliente, el idioma, el locale, la IP ni el país del dispositivo.
  Hoy **nadie la pone**: todo modelo con reglas territoriales cae en `JURISDICTION_UNKNOWN`. Los modelos sin reglas
  territoriales (todos los demás) no notan nada.
- **Una operación puede tocar varias jurisdicciones**: si cualquiera está bloqueada, bloqueada; si cualquiera no está
  aprobada, en revisión.
- **Los grupos** se declaran una vez (`GRUPOS_DE_JURISDICCIONES`): `EU` = los 27 Estados miembros. Un territorio con
  código propio que no esté en ningún grupo (Gibraltar, Åland, ultramar…) queda en `resto` —para un modelo restringido,
  en revisión—: tampoco es elegible hasta que legal lo decida.
- **La configuración solo endurece.** `aiProviders/{proveedor}.models[id]` puede apagar un modelo, pedir revisión o
  bloquearlo; nunca aprobarlo, levantar un bloqueo ni tocar su identidad, su gobierno o su territorio
  (`camposAjustables`). Aprobar es una revisión legal con evidencia, escrita en los datos del modelo con sus fuentes.
- **Un modelo de un agregador sin gobierno declarado no es elegible**: nadie revisó su licencia.
- **El Router solo compara elegibles.** Ninguna política, calidad, precio ni modelo fijado lo amplía. Sin ningún
  candidato elegible contesta `NOT_AVAILABLE` con `reason: 'sin_modelo_elegible'` y los escalones (sin nombrar
  proveedores), y no sirve nada en su lugar: ni el demo (el demo no tiene ningún modelo de mundos).
- **El Core no transporta todavía la jurisdicción**: el catálogo del Core no es de ninguna operación, así que ahí un
  modelo con reglas territoriales queda `PENDING` y el ejecutor del Gateway lo rechaza. Falla cerrado hasta que el
  contrato canónico la lleve.
- **El adaptador no decide nada de esto.** fal no sabe de jurisdicciones; si se llega a `run`, la regla común ya dijo
  que sí (`elegibilidad-jurisdiccion` 9 y 9b).

Relación con lo que ya había: la **región técnica** del Router del Core (`constraints.region`, dónde declara servir un
modelo) es otra cosa, y la capa **Policy & Eligibility del runtime** (`runtime/politica.ts`, F12-D) son reglas de
«deny» de la administración solo en el camino del conductor, hoy **sin ninguna regla**. Esa capa trata una región
desconocida como «la regla no aplica»; la nueva regla, como «no elegible». Alinearlas es una decisión pendiente
(§7): no se ha tocado una decisión cerrada de F12-D.

## 3. Hunyuan World 1.0 (imagen → mundo 3D)

`fal-ai/hunyuan_world/image-to-world`, capacidad `world.generate`, USD 0,30 por petición (página del modelo,
2026-10-05).

| | |
|---|---|
| Revisión global | `REVIEW_REQUIRED` (no `BLOCKED_GLOBAL`: la restricción encontrada es territorial) |
| Territorio | `BLOCKED_FOR_JURISDICTION` en la UE, el Reino Unido y Corea del Sur; ninguna aprobada; resto `REVIEW_REQUIRED` |
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
- **Asíncrono, construido y NO conectado**: con `acceptAsync` suelta la llamada y devuelve la operación
  (`{modelo}::{request_id}`); `verificarFirmaDeFal` (ED25519 contra el JWKS de fal, ±300 s, sobre el cuerpo crudo),
  `leerAvisoDeFal`, `resolutorDeFal` (reconciliación, nunca lanza) y `cancelarEnFal`. Ningún webhook de fal está
  expuesto, el barrido solo tiene el resolutor de Seedance y el conductor solo atiende sus dos canaries: conectar
  `world.generate` al Core es una tercera capacidad y necesita autorización explícita (CLAUDE.md §10).

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

Ver [DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md) § fal.ai: la revisión legal de Hunyuan World por jurisdicción,
de dónde sale la jurisdicción de una operación, alinear `runtime/politica.ts`, dónde se hace cumplir lo que el material
no puede mostrarse, conectar lo asíncrono (webhook + barrido + conductor), crear `FAL_KEY`, el precio real y el visor 3D.

## 8. Pruebas

`elegibilidad-jurisdiccion` (26: los diez casos del ajuste de jurisdicción y lo que los sostiene), `proveedor-fal`
(30: el adaptador con la red sustituida por dobles, firma, cancelación, reconciliación, Credits, material y que nada
está encendido) y `escena3d` (11). Todas deterministas y sin red. $0.
