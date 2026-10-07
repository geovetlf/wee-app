# Seed3D 2.0 en Weë Design — requisitos de implementación (si algún día es elegible)

**Estado: CANDIDATO 3D — PENDING PROVIDER ELIGIBILITY.** Nada de esto autoriza, activa ni prepara una integración: no hay clave,
ni cuenta, ni petición, ni generación, ni cobro, ni registro del proveedor como activo, ni respaldo, ni despliegue. La
elegibilidad es de la **Línea B** (`scratchpad/linea-b/seed3d.md` Parte 2: con los términos públicos, **NOT_ALLOWED** para Weë;
única vía, un acuerdo escrito, REVIEW_REQUIRED ⚖) y **no** se decide aquí. Este documento dice qué tendría que cumplir Weë
Design para usar **cualquier** candidato 3D con estas características, tomando Seed3D 2.0 como caso; por eso **no** hay
`Seed3DService`, `Seed3DCredits`, `Seed3DJobs`, `Seed3DAssets` ni `Seed3DRouter`, ni los habrá: la cadena es
**capacidad 3D → registro de proveedores → proveedor elegible → adaptador**, la misma para todos.

Fuente funcional: `seed3d.md` §2 (inventario) y §4 (ciclo de vida), leídos el 2026-10-07. Inventario y cobertura generados:
[matriz de cobertura](../../WEE-DESIGN-COVERAGE-MATRIX.md) §6. Contradicciones: [contradicciones](../../WEE-DESIGN-CONTRADICTIONS.md) §3.

## 1. Requisitos de capacidad

| Capacidad de Weë | Lo que dice la fuente (clase) | Qué cubre Seed3D 2.0 | Estado de la capacidad en Weë |
|---|---|---|---|
| C08 Modelo 3D desde una imagen | A, E, F, G, H, P, T1, T2 — **CONFIRMED** | Una imagen → modelo con geometría, materiales PBR y textura; glb/obj/usd/usdz en un ZIP; 100 000 / 500 000 / 1 000 000 de caras | PROVIDER_REQUIRED (ningún candidato elegible) |
| C75 Reconstruir un objeto real | D — PARTIALLY_CONFIRMED (es A con énfasis en fidelidad; sin escala métrica) | Lo mismo que C08 | PROVIDER_REQUIRED |
| C37 Varias fotos a 3D / C84 De la idea al objeto | A, en serie | Una tarea por imagen | NEW_CANDIDATE / PROVIDER_REQUIRED |
| C03 Modelo 3D desde palabras | B — **UNKNOWN** (C1) | No cuenta | PROVIDER_REQUIRED (otros candidatos) |
| C09 Desde varias vistas | C — **NOT_AVAILABLE** | No | PROVIDER_REQUIRED (otros) |
| C16 Materiales y texturas sobre un modelo | I — **NOT_AVAILABLE** (no acepta mallas) | No | PROVIDER_REQUIRED (otros) |
| C18 / C76 Partes | J, K — PARTIALLY_CONFIRMED, solo investigación | No por API | NEW_CANDIDATE / PROVIDER_REQUIRED |
| C77 Articular | L, M — PARTIALLY_CONFIRMED, solo investigación | No por API | REVIEW_REQUIRED |
| C78 Listo para simulación | N — PARTIALLY_CONFIRMED, solo investigación | No por API | REVIEW_REQUIRED |
| C41 Escena entera | O, T3 — PARTIALLY_CONFIRMED, solo investigación | No por API | REVIEW_REQUIRED |
| C21 Esqueleto de personaje | M′ — **UNKNOWN** | No cuenta | PROVIDER_REQUIRED (otros) |
| C31 Exportar para un programa | P — formato elegido al crear; P′ convertir — NOT_AVAILABLE | Solo al crear | BACKEND_REQUIRED (conversión de Weë, DEC-20) |
| C80 Refinar · C82 Variaciones | Q, S — NOT_AVAILABLE | No | PROVIDER_REQUIRED (otros) |
| C81 Volver a generar | R — **UNKNOWN** (sin semilla) | Otra tarea con la misma entrada; variación no documentada | PROVIDER_REQUIRED |
| Malla sin textura | T4 — NOT_AVAILABLE | Siempre con textura y PBR | El ajuste «solo la forma» no se ofrece con este candidato |

Regla: **lo PARTIALLY_CONFIRMED sin API no es capacidad disponible**; la capacidad se queda en el mapa, apagada, con su motivo.

## 2. Requisitos de experiencia (UX)

- La persona dice **qué quiere** («de esta imagen a 3D», «para imprimir») y nunca ve «Seed3D», ni versiones, ni `subdivision_level`.
- Una imagen de Weë (de la cuenta) entra **por su id** desde el lienzo o la cadena (§11 de la arquitectura); también una subida.
- Cada paso del recorrido existe o dice por qué no: entrada, orden, panel, opciones, comprobación, precio, confirmación, trabajo,
  progreso, cancelación, error, reintento, resultado, edición, guardado, material, versión, lo que sigue y exportar
  ([cobertura](../../WEE-DESIGN-COVERAGE-MATRIX.md) §2).
- **CAPACIDAD → INTENCIÓN → ENTRADA → ORDEN → PANEL → ENTRADA DE DATOS → OPCIONES → PRECIO → TRABAJO → PROGRESO → RESULTADO →
  LO QUE SIGUE → MATERIAL → VERSIÓN → EXPORTAR**, para C08: «Convertir esta imagen en un objeto 3D» → Lienzo (la imagen elegida) o
  caja «Transformar» → «Modelo 3D desde una imagen» → detalle / `CreatorFlow` → la imagen (id de material) → para qué es, detalle →
  precio del Credit Engine → trabajo asíncrono → «En cola», «Creando» (minutos) → modelo 3D en el lienzo → materiales, aligerar,
  esqueleto, exportar, imprimir → material derivado de la imagen → versión 1 → exportar por destino.

## 3. Composer

- Intención **Transformar** (desde una imagen) y **Crear** (dentro de C84). La caja es `CajaDePrompt` (Weë Brain); el texto es
  opcional para este candidato (U6: no se sabe si influye) y **nunca** se pegan parámetros dentro del texto: la fuente admite
  `--subdivisionlevel` y `--fileformat` escritos al final del texto y los ignora si están mal; el adaptador tiene que **neutralizar**
  cualquier «--» que escriba la persona.
- La imagen se valida en el servidor con las reglas de la fuente (1 imagen; jpeg, png, webp, bmp, tiff, gif; proporción 0,4–2,5;
  lado 300–6000 px; < 30 MB) **antes** de cotizar: una imagen que no vale no cuesta.

## 4. Lienzo (viewport)

El modelo se ve con el visor de Weë (DEC-09) o, mientras no lo haya, con la tarjeta 3D y la descarga. Modos de vista con luz, sin
luz, sólido, alambre y canales PBR **solo los que traiga el archivo** (U1: no se sabe qué mapas lleva el ZIP).

## 5. Inspector

Separar **datos de producto** (para la persona: tipo, estado, origen «derivado de esta imagen», fecha, caras aproximadas,
formato, tamaño, derechos visibles) de **datos internos del proveedor** (id de tarea `cgt-…`, `usage.completion_tokens`, URL del
ZIP, modelo, endpoint): estos solo viven en el servidor (`aiGenerations`, el trabajo) y nunca llegan al cliente.

## 6. Trabajo

Asíncrono, con el contrato canónico 3D de la Línea B (como la puerta del mundo: cotizar · crear · estado · cancelar). Estados de
la fuente → estados de Weë: `queued` → QUEUED · `running` → PROCESSING · `succeeded` → COMPLETED (tras materializar) · `failed` →
FAILED · `cancelled` → CANCELLED · `expired` o desconocido → **RECONCILING** (C3). Duración: de varios a más de diez minutos; se
dice «puede tardar varios minutos», sin cronómetro. Concurrencia 5 por cuenta del proveedor: el resto **espera en cola** (no
falla), así que la cola de Weë tiene que repartir entre todas las personas de Weë.

## 7. Credits

Precio **del Credit Engine al cotizar**, desde la tarifa oficial convertida (`aiPricing.ts`), con suelo de coste; ninguna cifra
en la interfaz ni en este documento como precio para la persona. Reserva idempotente al crear; cobro al terminar con éxito;
reembolso automático si falla. Mientras no sea elegible: «Precio pendiente: se sabrá cuando haya quien lo haga». La fuente cobra
**por generación con éxito** (S18): el `providerCost` se calcula con `usage.completion_tokens` de la respuesta. **Sin clave de
idempotencia en la fuente (U4)**: repetir un POST a ciegas podría generar y cobrar dos veces → §16 y §18.

## 8. Materiales

El ZIP **caduca a las 24 h**: en cuanto llega `succeeded`, el servidor lo descarga, valida, descomprime y guarda el modelo en el
Storage de Weë (`content/materializador.ts`, con `assetId` determinista por trabajo e intento), con su ficha (`kind: model3d`,
`provenance` con trabajo, paso, capacidad y generación) y sus **derechos** (los de la licencia del modelo, que solo se
endurecen). La persona nunca recibe la URL del proveedor.

## 9. Versiones

El modelo es un **material derivado** de la imagen (`materialDerivado`: `provenance.sourceAssetIds = [imagen]`). Volver a generar
(C81) deja **otro** material derivado de la misma imagen, no una versión del modelo. Una edición posterior (otro candidato) deja
una versión (`nuevaVersion`, `previousVersionId`).

## 10. Exportar

El formato se elige **al crear** (glb por defecto; obj, usd, usdz): Weë pide siempre **glb** y convierte con su conversor (DEC-20)
para cualquier destino, para que la entrega no dependa del candidato. Escala, unidades y orientación de la salida: **UNKNOWN**
(U7) → el conversor normaliza (origen en la base, Y arriba) y lo dice el inspector.

## 11. Abstracción de proveedor (contrato futuro del adaptador — SOLO DOCUMENTO)

Un adaptador 3D es **una pieza del WEË AI ENGINE** (`functions/src/engine/providers/`, una línea en `ADAPTERS`), igual para todos
los candidatos. Su contrato, descrito y **no implementado**:

```
entrada (de Weë, nunca del proveedor):
  capacidad: '3d.generate'
  variante:  'fromImage'                      // de Weë; el adaptador decide si la sabe hacer
  imagen:    { tipo: 'asset', assetId }       // resuelta en el servidor (patrón de creator/mundo.ts)
  ajustes:   { destino, detalle, malla, textura, pose, estilo }   // AJUSTES_DE_GENERACION_3D; los que no sepa cumplir → no elegible
  requestId, cuenta, jurisdicciones (del servidor)

el adaptador declara:
  sabeHacer(capacidad, variante, ajustes) → sí | no (con motivo público)
  cancela: 'nunca' | 'en_cola' | 'siempre'     // Seed3D: 'en_cola'
  avisos: 'sondeo' | 'webhook'                 // Seed3D: 'sondeo'
  caducidadDelResultado                        // Seed3D: 24 h
  duracion: 'segundos' | 'minutos' | 'horas'   // Seed3D: 'minutos'

operaciones: cotizar · crear (→ referencia del proveedor, «aceptada») · estado · cancelar
salida: { estado de Weë, archivo temporal para materializar, coste del proveedor, error público }
```

Traducción de ajustes en el caso Seed3D: detalle → `subdivision_level` (low/medium/high, C4 abierta); formato → siempre `glb`;
textura «solo la forma» → no elegible (T4); pose, estilo, topología → no elegible si se piden (no hay parámetros).

## 12. Seguridad

- La clave vive en Secret Manager y solo en el adaptador; nunca en el cliente ni en un registro (saneado central).
- La imagen viaja como **URL firmada de corta vida del Storage de Weë** o en Base64 (la fuente admite los dos); nunca una URL
  pública permanente.
- La URL de descarga del ZIP: allowlist anti-SSRF del dominio de descarga (**U2: desconocido**) antes de bajar nada; tamaño máximo;
  el ZIP se descomprime en el servidor con límites (bomba ZIP, rutas con `..`, solo los formatos esperados).

## 13. Privacidad

- El tratamiento ocurre en **cn-beijing** (China): las fotos de la gente saldrían de su país ⚖ (Línea B).
- Fotos de personas reales: la fuente tiene un error para «la imagen puede contener una persona real» (U5); Weë Design no debe
  mandar fotos de personas a este candidato sin la decisión legal (DEC-24 trata el mismo problema para el movimiento desde vídeo).
- Entrenamiento: no, salvo consentimiento aparte (S26); retención del registro 7 días o 24 h (C2) → pedir el borrado al
  materializar.

## 14. Jurisdicción

La licencia vale **solo en China continental** (S26 §3.1; S27 §1.2): con los términos públicos no sirve a ninguna cuenta de Weë.
Si hubiera acuerdo, la elegibilidad por cuenta la decide el servidor (`engine/jurisdiccion.ts`, el país del Perfil Real), una vez,
y la capacidad lo dice con el motivo público de siempre («no disponible en tu región»), sin nombrar a nadie.

## 15. Elegibilidad comercial

De la Línea B: **NOT_ALLOWED** con los términos públicos; **REVIEW_REQUIRED** ⚖ con un acuerdo escrito que cubra uso comercial
y territorio (C8, C9, C10 abiertas). La Línea C no decide nada: el registro de Weë Design lleva la elegibilidad agregada que sale
de la Matriz B (`docs/wee-design-proveedores.json`, `PENDING_PROVIDER_ELIGIBILITY` → «pendiente de autorización»).

## 16. Límites de uso

RPM 300 (429 al pasarse), concurrencia 5 (las nuevas esperan), consulta 20 QPS, listado 1 QPS, cancelar o borrar 20 QPS; **no
garantizados**. El barrido de liquidación (`barridoDeLiquidacion`, cada 5 min) consultaría por lotes, nunca a ráfagas; la cola de
Weë limita lo que entra por cuenta y por día (cupo, como el mundo).

## 17. Cancelación

**Solo en cola** (`queued` admite DELETE → `cancelled`; `running` no). La interfaz ofrece «que no empiece» solo mientras el
trabajo esté en cola (`cancelacionEn` → `logica` solo en QUEUED) y, empezado, dice que no se puede parar y que lo que salga se
guarda. Nunca se promete más (prueba I9).

## 18. Avisos y estado

**Sin webhook** (U3): solo sondeo. Weë sondea desde el servidor (el barrido, con espera creciente), nunca desde el cliente. Sin
idempotencia (U4): el `requestId` de Weë se ata a la referencia `cgt-…` **antes** de confirmar a la persona; si la respuesta del
POST se pierde, se **reconcilia** con el listado filtrado por `filter.task_ids` o por estado dentro de la ventana de retención
(peor caso 24 h, C2), y solo si no aparece se decide; nunca se repite el POST a ciegas.

## 19. Errores

Errores públicos de Weë (los de `noDisponible` y del contrato), nunca el `error.message` del proveedor. Los de la fuente que
conviene distinguir: imagen con contenido sensible o persona real (400, U5) → «esta imagen no se puede usar»; servicio no activado
(403) o saldo negativo (403) → avería de Weë, no de la persona (y alerta); 429 → reintento con espera, no FAILED.

## 20. Observabilidad

`aiGenerations` con `providerCost` (de `usage.completion_tokens`) separado de `creditsCharged`; tiempos de cola y de ejecución;
tasa de fallo por motivo; ZIP caducados antes de materializar (debe ser cero); reconciliaciones abiertas. Sin datos personales en
los registros.

## 21. Pruebas

Las de la referencia ya vigilan lo que no depende del proveedor (cancelar sin prometer, precio sin inventar, linaje, nada
disponible sin elegibilidad). Para un adaptador: contrato con dobles (sin red), estados desconocidos → RECONCILING, ZIP malicioso,
dominio fuera de la allowlist, POST sin respuesta, sabotajes (un adaptador que repitiera el POST tiene que caer). Ninguna prueba
llama al proveedor.

## 22. Accesibilidad

Los estados se anuncian con texto (no solo color); el progreso «en cola / creando» es legible por lector de pantalla; el modelo
tiene nombre accesible; nada depende de arrastrar.

## 23. Teléfono

C08 es **completa** en el teléfono: elegir una imagen, transformar, esperar fuera de la pantalla, ver el resultado en la tarjeta 3D
y descargarlo. Ver y girar el modelo depende del visor (DEC-09).

## 24. Rendimiento

El ZIP puede pesar mucho (1 000 000 de caras): se materializa en el servidor por partes, se genera una vista previa ligera
(variante) para el lienzo y el teléfono, y el modelo completo se carga solo al pedirlo.

## 25. Requisitos del proveedor de respaldo

Si Seed3D 2.0 fuera elegible, **no** sería el único: la capacidad (C08) tiene otros candidatos (Matriz B). El respaldo lo elige el
Router por la cadena configurada en Firestore, **solo entre candidatos elegibles** para esa cuenta y esa jurisdicción, y solo si
el respaldo sabe cumplir los mismos ajustes; un trabajo ya aceptado por un proveedor **no** se repite en otro (sería un doble cobro)
salvo que el primero haya fallado de forma cierta. Ningún respaldo se activa en esta misión.

## Traspaso a la Línea B

Lo que la Línea C necesita de la Línea B para que esto deje de ser documento: (1) la elegibilidad verificada (acuerdo, territorio,
privacidad); (2) el contrato canónico 3D con `sabeHacer`, `cancela`, `avisos` y `caducidad`; (3) U1 (mapas PBR), U2 (dominio de
descarga), U4 (idempotencia), U6 (si el texto influye) y U7 (escala y orientación); (4) C1 (¿texto → 3D?), C2 (retención) y C7
(¿partes, articulación y escenas llegarán a la API?). Copia en `scratchpad/linea-c/seed3d-para-linea-b.md`.
