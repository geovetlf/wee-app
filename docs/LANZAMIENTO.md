# Lanzamiento de Weë — operaciones

Frente H del plan de lanzamiento (2026-10-14). Cómo se comprueba que producción está lista, cómo se vigila, cómo
se apaga una parte sin redesplegar y cómo se vuelve atrás sin perder datos ni dinero.

No sustituye a [DEPLOYMENT.md](DEPLOYMENT.md) (cómo cambia producción, el workflow gobernado, la marcha atrás de
una función) ni a [OBSERVABILITY.md](OBSERVABILITY.md) (las siete alertas de H0): los usa y añade lo que faltaba
para abrir.

**Nada de esto se ha ejecutado contra producción.** Las alertas no están aplicadas (decisión del dueño): aquí
están los comandos que las aplican. Todo lo que lee producción lo corre el dueño.

## 1. Comprobaciones previas

```
node scripts/prelanzamiento.mjs                # LOCAL: el repositorio y los valores por defecto del código
node scripts/prelanzamiento.mjs --produccion   # PRODUCCIÓN: solo lee get-wee y GitHub
node scripts/prelanzamiento.mjs --json         # además, el resultado en JSON para el registro
```

Once puntos. Cada uno da **PASA** o **FALLA**. En local, dos dan **SOLO-PRODUCCION**: no hay forma honrada de
saberlos sin el proyecto, y no se dan por buenos. Sale con **1** si alguno FALLA y con **2** si no puede empezar
(falta `functions/lib`).

| Punto | Local | `--produccion` (solo lectura) |
|---|---|---|
| Versión | Funciones del registro con `enMain:false` | Revisión que sirve cada servicio de Cloud Run frente a `ops/produccion.json`, y servicios que el registro no conoce |
| Precios | `pricingMode` y `allowMockFallback` por defecto del código | `aiSettings/global` más `CREATOR_PRICING_MODE` de cada servicio |
| Interruptores | `iaDetenida` y si el vídeo está apagado, con la configuración por defecto | Lo mismo con `aiSettings/global`, `aiRouting/*` y `aiProviders/*` vivos |
| Tope diario | `maxUsdPerDay` por defecto | `aiSettings/global.maxUsdPerDay` |
| Reglas | Las rutas de `firebase.json` existen; su huella | Huella de lo desplegado (Firebase Rules API) frente al repositorio, Firestore y Storage |
| App Check | `APP_CHECK_OBLIGATORIO` | Además, el modo de cada servicio de App Check |
| Copias | SOLO-PRODUCCION | PITR, protección de borrado y copia programada |
| Alertas | `ops/observabilidad/politicas/` al día | Diff contra Cloud Monitoring, y canal verificado |
| Claves | Nombres de los secretos que monta el código | Cada secreto montado en un servicio vivo existe en Secret Manager (`--format=json(name)`: solo nombres) |
| Ruleset | `ops/github/ruleset-main.json` | `ops/github/proteccion.mjs` contra GitHub (solo GET) |
| Sondas | SOLO-PRODUCCION | Las cinco sondas de datos (§2) |

**Lo que se exige son decisiones.** Están en `ops/observabilidad/prelanzamiento-esperado.json`, cada una con su
porqué. Si el dueño decide otra cosa, se cambia allí en un PR, no en el script.
- `allowMockFallback: false`. Si no, B4-03: el modo demo atiende y se cobra a precio de catálogo.
- `video: "apagado"`. Es la mitigación mínima de X2.
- `maxUsdPerDay` obligatorio.
- PITR encendido.

**Solo lectura, comprobado.** Toda orden pasa por `soloLectura()`:
- gcloud: solo `list`, `describe`, `list-configs` y `print-access-token`;
- `gh api`: solo GET;
- HTTP: GET, más las dos lecturas POST de Firestore (`:runQuery`, `:batchGet`).

Rechaza `update-traffic`, `deploy`, `secrets versions access`, `--method PUT`, `PATCH`… El token de la sesión
se queda en memoria y no se imprime. Lo fija `functions/test/prelanzamiento.test.mjs`:
- la cerradura, rechazando 14 escrituras;
- el modo local, ejecutado de verdad;
- el modo producción contra una producción SIMULADA: conforme da PASA y cada desviación da su FALLA.

**Hoy, en local** (base `5efbc0a7`): 4 FALLA, 5 PASA y 2 SOLO-PRODUCCION.
- **Versión**: hay 4 funciones vivas fuera de main (`barridoDeLiquidacion`, `productions`, `shots`,
  `generateVideo`).
- **Precios**: `allowMockFallback=true`, así que el demo se cobraría.
- **Vídeo**: encendido.
- **Tope diario**: sin `maxUsdPerDay`.

Según la lectura del coordinador del 2026-10-14, producción no tiene `aiSettings/global` ni `aiRouting/video.*`:
los cuatro FALLA serían los mismos con `--produccion`.

## 2. Observabilidad del lanzamiento

**Alertas como código.** Son las siete de H0 (`ops/observabilidad/alertas.mjs`) más dos nuevas
(`ops/observabilidad/lanzamiento.mjs`):

| Alerta | Cómo | Salta |
|---|---|---|
| **Errores repetidos en una función** | `logging.googleapis.com/log_entry_count` (ya existe, gratis), severidad ≥ ERROR, agrupado por `service_name` | Más de 5 en 10 min en UNA función. En Cloud Run, `console.warn` y `console.error` salen por stderr y cuentan |
| **Proveedor de IA caído** | Dos métricas de logs con etiqueta `provider`: `wee_proveedor_en_pausa` (el circuito del router se abrió) y `wee_proveedor_fallos` (líneas «falló en» del router y del Gateway del Core) | Circuito abierto, o más de 10 fallos en 10 min de UN proveedor |

Las versionadas están en `ops/observabilidad/politicas/`:
- 6 métricas, 9 políticas, las 2 comprobaciones externas y el panel;
- un archivo por recurso, en el formato de su API;
- las regenera `node ops/observabilidad/lanzamiento.mjs --escribir`;
- una prueba falla si se desincronizan.

**Lo que vive en Firestore no lo ve Cloud Monitoring.** Para eso están las sondas: consultas de solo lectura, sin
índice compuesto, con su umbral y un evaluador puro.

| Sonda | FALLA si |
|---|---|
| `reservas-autorizadas` | Una `creditTransactions` sigue `AUTHORIZED` más de 15 min (X4/F-02: el legacy no las barre) |
| `cobradas-sin-asiento` | Una `aiGenerations` de las últimas 24 h con `creditsCharged > 0` no tiene `creditTransactionId`, o su transacción no está `COMPLETED` |
| `trabajos-estancados` | Un `creatorJobs` en `running` pasado su `deadlineAt` (o 30 min quieto si no lo tiene) |
| `trabajos-core-estancados` | Un `jobs` en `running`/`queued`/`waiting` 45 min quieto |
| `coste-diario` | No hay `maxUsdPerDay`; o hoy va por el 80 % del tope; o hoy supera 3× la mediana de los 7 días anteriores y 5 USD. Suma igual que el tope del motor (`usdToday`) |

```
node ops/observabilidad/sondas.mjs --simular <datos.json>   # sin red
node ops/observabilidad/sondas.mjs --produccion             # solo lee get-wee
```

**Aplicar (lo hace el dueño).** `aplicar.mjs` simula por defecto: lee lo que hay con `list`, enseña el diff
(crear, actualizar, igual, revisar a mano) y las órdenes que ejecutaría.

```
node ops/observabilidad/aplicar.mjs                      # simulación contra get-wee (solo list)
node ops/observabilidad/aplicar.mjs --sin-leer           # simulación sin red (todo «crear»)
gcloud beta monitoring channels list --project=get-wee   # el canal de correo, creado como dice OBSERVABILITY.md
node ops/observabilidad/aplicar.mjs --aplicar --confirmo-proyecto get-wee --canal projects/get-wee/notificationChannels/<ID>
node ops/observabilidad/verificar.mjs                    # después: ¿todo existe y avisa a alguien?
```

Cómo se protege `aplicar.mjs`:
- **Aplicar exige tres cosas**: `--aplicar`, el proyecto escrito otra vez y un canal de ese proyecto. Si no ha
  podido leer lo que hay, no aplica.
- **Nunca borra.**
- **Una política que se actualiza conserva sus canales.** Un `update` con archivo reemplaza la política entera, y
  sin canales dejaría de avisar.
- **Cada `create`/`update` va a una carpeta temporal**, no al repositorio.

Lo fija `functions/test/observabilidad-lanzamiento.test.mjs` con un ejecutor falso: sin `--aplicar` solo corre
`list`.

**Coste.** Son 2 condiciones más. `log_entry_count` es gratis. Las dos métricas nuevas tienen poca cardinalidad:
un valor de etiqueta por proveedor.

### Correlación: de la petición al libro y al log

Comprobado con salidas reales del código compilado (`functions/test/correlacion-logs.test.mjs`):

- **La petición llega al libro.** `requestId`, `jobId`, `stepId`, `userId`, `service` y `creditTransactionId`
  (`usage_<requestId>`) viajan a `aiGenerations`. Del trabajo se llega a la generación y de ella al asiento.
- **El log del router se ata a su fila** por `registro <generationId>` en la línea «atendió».
- **El Gateway del Core escribe `requestId=` y `traceId=`** en cada operación, y el `requestId` en sus fallos.
  Su traza rechaza los campos `prompt`, `token`, `password`…
- **Las credenciales no llegan al log** (`sanitizeForLog`). Se omiten:
  - Bearer, `x-api-key`, `xi-api-key`, AIza…, `sk-…`, `sk-ant-…`;
  - JWT, `?key=`, cookies y `password`;
  - y el valor de cualquier secreto montado.
- **Las líneas del motor no llevan** el prompt, el objetivo de la persona ni su correo.

**Huecos encontrados** (no se han corregido aquí: `functions/src` es de otras líneas). La suite los imprime como
«⚠ HALLAZGO», no fallan, y avisa cuando alguien los corrige:

| Dónde | Qué |
|---|---|
| `functions/src/engine/router.ts:509` | La línea «atendió» no lleva `requestId`/`jobId` ni el coste en USD. Para ir del log al trabajo hay que leer la fila del libro, y Monitoring no puede sumar el gasto desde el log; por eso el coste anómalo es una sonda |
| `functions/src/engine/router.ts:529` | La línea «falló en» no lleva `generationId` ni `requestId`: un fallo del log no se ata a su fila FAILED |
| `functions/src/engine/router.ts:407` | «Ningún proveedor disponible» no lleva `requestId` |
| `functions/src/engine/router.ts:422` | `...ctx` copia `goal`, el objetivo que escribe la persona, a la fila de `aiGenerations`. Es contenido privado en un libro contable |
| `functions/src/engine/sanitize.ts:24-40` | El saneador no quita correos: un correo que devuelva un proveedor llega al log (router y Gateway) y a `aiGenerations.error` |
| `functions/src/engine/sanitize.ts:27` | Un `"token":"…"` suelto no se omite: solo `access_token`, Bearer o `?token=` |
| `functions/src/vertexAI.ts:130` | El avatar escribe su prompt en el log: género, tono de piel y edad elegidos por la persona |
| `functions/src/vertexAI.ts:182, :320` | El texto que devuelve Gemini en vez de la imagen va al log entero y sin sanear |
| `functions/src/index.ts:295` | El error de Expo Push va al log sin sanear. Con `DeviceNotRegistered`, Expo incluye el `ExponentPushToken` |

## 3. Desactivación selectiva (sin redesplegar)

Todo esto es configuración del motor en Firestore. Se cambia de dos formas:
- desde la app, en Configuración → Weë AI Engine (callable `engineAdmin`, solo administración, que anota quién
  cambió los ajustes);
- o editando el documento en la consola de Firestore.

**Cada instancia lo ve en ≤ 60 s** (caché de la configuración del motor). Antes de cambiar nada, **anota el valor
anterior**: volver atrás es escribirlo otra vez.

| Para apagar | Escribe | Efecto | Lo que NO para |
|---|---|---|---|
| **Toda la IA** | `aiSettings/global` → `iaDetenida: true` (`setSettings`) | Ninguna generación nueva llama a un proveedor, ni real ni demo, por ninguna puerta: router, ejecutor del Core y avatar. Contesta «no disponible» antes de abrir el libro, y el llamador reembolsa su reserva | El barrido sigue cerrando el dinero de lo ya lanzado. Brain, Studio, Chef… quedan todos sin IA |
| **El vídeo** | `aiRouting/video.generate`, `video.image_to_video` y `video.reference` → `chain: [{provider: "music-pending"}]` (`setRouting`), y además `allowMockFallback: false` para `video.compose` | Las tres capacidades de Seedance contestan NOT_AVAILABLE sin llamar a nadie y sin fila en el libro. El resto de la IA sigue igual | Las tareas de vídeo ya aceptadas por ModelArk siguen y las cierra el barrido |
| **Una capacidad cualquiera** | `aiRouting/<capacidad>` → `chain: [{provider: "music-pending"}]` | Igual que el vídeo, para esa capacidad | Si solo la atiende el demo (p. ej. `video.compose`, `doc.render`, `music.generate`), hace falta además `allowMockFallback: false` |
| **El modo demo** | `aiSettings/global` → `allowMockFallback: false` | Lo que no tiene proveedor real (música, sfx, `doc.render`, `video.compose`) contesta «no disponible» en vez de responder en demo y cobrarlo (B4-03) | Nada real cambia |
| **Un proveedor** | `aiProviders/<id>` → `enabled: false` (`setProvider`) | El router lo salta y pasa al siguiente de la cadena | **Solo con `allowMockFallback: false`.** Ver la trampa 1 |
| **El gasto** | `aiSettings/global` → `maxUsdPerDay: <USD>` | Alcanzado, no hay candidatos (ni demo) y no se cobra hasta medianoche UTC | Lo ya lanzado |
| **Las puertas del Core** | `aiSettings/runtime` (cerrada por defecto) | Brain y vídeo vuelven al camino legacy | — |

`music-pending` es el valor del runbook porque:
- `engineAdmin` lo acepta (valida contra `ADAPTERS`);
- está apagado y no atiende nada más que música;
- mientras haya un proveedor real habilitado para la capacidad, el demo tampoco entra.

Lo prueba `functions/test/desactivacion-selectiva.test.mjs` contra el router compilado, en 6 escenarios × 5
capacidades. El mismo test comprueba que `scripts/prelanzamiento.mjs` decide igual que el router.

**Las dos trampas** (demostradas en esa suite):
1. **Apagar el PROVEEDOR no apaga la capacidad si el demo está permitido.** Con
   `aiProviders/seedance.enabled=false` y `allowMockFallback` encendido (hoy), el vídeo lo atiende `mock` y vale
   160 Credits de catálogo: se cobraría un vídeo de muestra.
2. **Un cupo por persona de 0 no apaga nada.** `aiSettings/global.limits.perUserPerDay.video: 0` significa «sin
   límite» (`engine/limits.ts:108`).

**Una sección (Weë Chef, Weë Travel…) no tiene interruptor propio.**
- Las secciones comparten capacidades: Chef usa `text.generate` e `image.generate`, igual que medio Weë.
- Apagar su capacidad apaga también las demás secciones que la usan.
- Ocultar una sección entera hoy exige una versión nueva del cliente (web: un despliegue; tiendas: una build).
- Un interruptor por experiencia en el servidor sería trabajo de otra línea (`functions/src/creator`). Queda
  propuesto, no hecho.

## 4. Despliegue gobernado

El camino es el de [DEPLOYMENT.md](DEPLOYMENT.md) §6 (workflow `despliegue.yml`, WIF, aprobación del dueño, como
mucho 6 funciones). Para el lanzamiento, en este orden:

1. **Antes.**
   - `node scripts/prelanzamiento.mjs --produccion`: anota los FALLA y decide cada uno.
   - Fija los interruptores del §3 que el alcance exija: vídeo, `allowMockFallback`, `maxUsdPerDay`. **Antes** de
     desplegar, porque son instantáneos y no dependen del código.
2. **Comprueba el commit:** `node ops/permitido.mjs --commit <sha> --funciones a,b`.
3. **Reglas e índices primero**, si cambian:
   - tienen que ser compatibles con el código que sigue vivo;
   - un índice nuevo tarda en construirse: espera a que esté `READY`.
4. **Funciones por grupos**, en el orden de `ops/despliegue/grupos.json`: `g0-seguridad` → `g1-cambio-minimo` →
   `g2-credits…` → `g3…` → `g4-ia-sin-cobro` → `g5-ia-con-gasto` → `g6-video-y-filmmaker` → `g7-critico`.
   Un grupo por run.
5. **Después de cada run.** El workflow ya hace el humo, los hashes y 10 min de observación de 5xx, con marcha
   atrás automática. Además, a mano:
   - `node ops/despliegue/cli.mjs humo --funciones <grupo> --sin-credenciales`;
   - `node ops/observabilidad/sondas.mjs --produccion` (reservas, cobros sin asiento, trabajos parados);
   - el panel «Weë · producción».
6. **Regenera `ops/produccion.json`** con la revisión nueva. El registro es lo que usa la marcha atrás
   `--al-mapa`.
7. **Web** (Hosting / `wee.zone`) después de las funciones que necesita.
   - Ejemplo: `disponibilidadDeCapacidades` antes del cliente R9 (H-06).
   - Comprueba por hash, no por código HTTP (la reescritura de la SPA devuelve 200 a lo que falta).
8. **24 h de observación** con las alertas aplicadas. Al final, `prelanzamiento --produccion` otra vez.

## 5. Marcha atrás sin perder datos ni transacciones

**Orden: primero los interruptores, después el tráfico y por último las reglas.**
- Los interruptores son instantáneos y no tocan código.
- Volver el tráfico es inmediato y conserva la revisión nueva.
- Las reglas se tocan las últimas, porque cambiarlas puede dejar fuera a la app.

| Qué | Cómo | Datos y dinero |
|---|---|---|
| **Interruptores** | Escribe el valor anotado antes del cambio (`engineAdmin` o consola) | No hay datos que perder; ≤ 60 s |
| **Una función** | `gcloud run services update-traffic <servicio> --region us-central1 --project get-wee --to-revisions <revisión>=100`. Para volver al registro: `node ops/despliegue/cli.mjs marcha-atras --al-mapa --funciones a,b`, que imprime el comando y no lo ejecuta | Firestore no vuelve atrás: la revisión vieja tiene que leer lo que escribió la nueva. Por eso no se despliega un cambio de esquema sin compatibilidad hacia atrás |
| **`spendCredits`** | NO vuelve a una revisión sin `assertAdmin` (H0 #24). `--al-mapa` se niega | — |
| **Reglas** | Consola → historial de reglas → versión anterior, o desplegar desde el tag `prod/firestore/…` / `prod/storage-rules/…` | Las reglas no borran datos. Comprueba que la app viva sigue pudiendo escribir |
| **Índices** | No se borran en una marcha atrás: un índice de más no rompe nada | — |
| **Hosting / Vercel** | Historial de versiones → revertir / *Promote* del despliegue anterior | — |

Por qué una marcha atrás no deja dinero perdido ni duplicado:
- **El Credit Engine es idempotente por `requestId`.** Repetir un ajuste no cobra ni devuelve dos veces.
- **Lo que quedó a medias se ve con las sondas**:
  - `reservas-autorizadas` muestra las reservas que la revisión retirada dejó abiertas;
  - `cobradas-sin-asiento` muestra las generaciones cobradas sin asiento;
  - `trabajos-estancados` muestra los trabajos que no van a terminar.
- **Se cierran con el Credit Engine**, nunca editando saldos a mano.
- **Las tareas de vídeo ya aceptadas** las cierra el barrido (`barridoDeLiquidacion`), que no se debe apagar en
  una marcha atrás.

**La marcha atrás v1 del workflow no está validada en real.** Antes de abrir, ensáyala en una función inocua: una
del grupo `g1-cambio-minimo`, con un cambio sin efecto. Anota la revisión, el tiempo hasta servir y el humo.

## 6. Web y tiendas no se operan igual

| | Web (`get-wee.web.app`, `www.wee.zone`) | Tiendas (Android / iOS) |
|---|---|---|
| Volver atrás | Inmediato: Hosting o Vercel revierten la versión | **No existe.** Un binario publicado sigue en los teléfonos. `expo-updates` está desactivado: no hay OTA |
| Consecuencia | El servidor puede cambiar al ritmo de la web | El servidor tiene que seguir siendo compatible con la versión **más antigua** instalada. Cada callable y cada regla nueva, con compatibilidad hacia atrás |
| Apagar algo | Interruptores (§3) o un despliegue de la web | **Solo** interruptores del servidor (§3). Ocultar una sección pide una build y una revisión de la tienda (días) |
| Escalonar | — | Play Console: lanzamiento por porcentajes. App Store: *phased release*. Empieza por un porcentaje bajo y mira las alertas |
| Requisitos pendientes (de la evaluación) | Publicar `wee.zone` desde la base de lanzamiento | Borrado de cuenta en la app, bloqueo de usuarios, Sign in with Apple (si hay iOS con Google), `owner`/`appleId`/submit propios, AAB/IPA probados en un teléfono |

## 7. Pruebas

| Suite | Qué fija |
|---|---|
| `functions/test/observabilidad-lanzamiento.test.mjs` | Forma de las alertas nuevas; versionado sin deriva; que `aplicar.mjs` solo lee sin `--aplicar` y exige proyecto y canal; sondas con datos de ejemplo |
| `functions/test/correlacion-logs.test.mjs` | requestId/jobId/traceId de la petición al libro y al log; logs sin credenciales, prompt ni correo; los huecos de §2 |
| `functions/test/desactivacion-selectiva.test.mjs` | Los interruptores de §3 contra el router compilado, las dos trampas y la coincidencia con el prelanzamiento |
| `functions/test/prelanzamiento.test.mjs` | La cerradura de solo lectura, el modo local real y el modo producción contra una producción simulada |

Las cuatro están en la cadena de `npm test`. No necesitan red, credenciales ni emuladores.
