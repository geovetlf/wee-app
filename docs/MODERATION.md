# MODERATION — denunciar de verdad

> F12-A/B · Moderation Foundation. Contrato `1.0`.
> Lo vigilan `functions/test/moderation.test.mjs` (en `npm test`) y `functions/test/moderation.emulator.mjs` (emulador).

Hasta esta fase, el botón de denunciar de Weë era un `Alert.alert` que escribía en
la consola y contestaba «gracias por tu reporte, lo revisaremos pronto». No había
reporte, ni estado, ni nadie que pudiera revisarlo. En la web ni siquiera se veía,
porque `Alert.alert` no pinta nada en React Native Web. Y `firestore.rules` tenía
`allow create: if isAuthenticated()` sobre `reports`: cualquiera con sesión podía
escribir ahí cualquier documento, a nombre de cualquiera.

Ahora hay un reporte real, creado por el servidor, con estado, historial y una
puerta de revisión. Es una **fundación ligera**, no una plataforma de Trust & Safety.

## 1. Qué es y qué no es

```
CONTENIDO / REPORTE → MODERACIÓN → POLÍTICA → DECISIÓN → ACCIÓN → AUDITORÍA
```

Una **capa transversal**: no es de Social, ni de Studio, ni de WeeTalk. Cualquier
Workplace entrega una señal por la misma puerta.

| Es | No es |
|---|---|
| Un contrato puro (`functions/src/core/moderation.ts`) | Un segundo Brain, Planner, Workflow o Router |
| Una composición sobre Firestore (`functions/src/moderation/index.ts`) | Una llamada a un modelo de IA ni a una API externa |
| Dos callables: `reportContent` y `moderationAdmin` | Algo que consuma Credits o toque la billetera |
| Una hoja común en el cliente (`components/ReportSheet.tsx`) | Un Control Center (llegará; esto es lo que usará) |

Tres cosas que no se mezclan: un **reporte** es una señal y no prueba nada; una
**decisión** es lo que concluye quien revisa; una **acción** es lo que se hace
después, y *pedirla no es haberla ejecutado*. Y una cuarta: **seguridad**
(`ALLOW` / `BLOCK` / `REVIEW`) no es **calidad**; esa tendrá otro vocabulario y no
vive aquí.

## 2. El modelo

`reports/{reportId}` — cerrada a los clientes.

| Campo | Quién lo pone | Notas |
|---|---|---|
| `reportId` | servidor | `rep_` + 32 hex. **Es la deduplicación** (§ 5) |
| `reporterAccountId` | servidor, de la sesión | La CUENTA: propiedad y autoridad |
| `reporterEntityId`, `reporterEntityType` | servidor, tras leer la entidad | La CARA, solo si se comprobó que es de esa cuenta |
| `targetType`, `targetId` | cliente, validados | Referencia. Nunca una copia del contenido |
| `targetOwnerAccountId`, `targetOwnerEntityId`, `targetModality` | servidor, leyendo el objetivo | Para la cola de revisión. Jamás se le enseñan a quien denuncia |
| `reason` | cliente, enumeración cerrada | § 3 |
| `details`, `surface` | cliente, acotados | Opcionales. La interfaz de hoy no envía `details` |
| `status` | servidor | § 4 |
| `evaluation` | servidor | Lo que dijo el evaluador automático. Hoy siempre `REVIEW` |
| `decision` | servidor, al revisar | `{ outcome, by, at, reason? }` |
| `action` | servidor, al revisar | `{ type, status: 'REQUESTED', requestedAt }` |
| `historyCount`, `createdAt`, `updatedAt` | servidor | Milisegundos, como el resto de colecciones del Core |

Correspondencia con el modelo conceptual: `decisionAt` = `decision.at` ·
`reviewer` = `decision.by` · `resolutionReason` = `decision.reason` ·
`actionAt` = `action.executedAt` (que hoy nadie escribe: § 6).

`reports/{reportId}/history/{0001…}` — el historial, solo se añade.
`moderationLimits/{accountId}` — el ritmo de cada cuenta.

**Identidad.** Nunca se usa el uid de Firebase como identidad pública, ni el
número de cuenta, ni el identificador heredado de un Perfil Weë. De quién es una
publicación se **lee** de su entidad (`entidadDelPerfil`); no se deduce de ningún
prefijo. Una Página es una entidad: no existe un «perfil de negocio».

## 3. Clases de objetivo y motivos

Ocho clases en el contrato: `PUBLICATION`, `POST`, `COMMENT`, `ENTITY`, `MESSAGE`,
`ASSET`, `CONTENT`, `COMMUNITY`. Un Perfil Real, un Perfil Weë y una Página son
`ENTITY`. Vídeo, imagen y audio **no** son clases: son la *modalidad* de un
objetivo (`TEXT` / `IMAGE` / `VIDEO` / `AUDIO`), para que no haya una moderación
por formato.

Hoy tienen resolutor —algo detrás que leer— `POST`, `COMMENT` y `ENTITY`. Las demás
se rechazan con `target_type_not_enabled`. Abrir una es escribir una función y
una línea en `RESOLUTORES`; así entrarán WeeTalk, las comunidades y el material.

Diez motivos: `SPAM`, `HARASSMENT`, `HATE`, `SEXUAL_CONTENT`, `VIOLENCE`, `SCAM`,
`IMPERSONATION`, `ILLEGAL_CONTENT`, `SELF_HARM`, `OTHER`. Son **categorías internas**
para ordenar señales, no tipos legales. La lista crece con una línea en el
contrato y su texto en `i18n`.

## 4. Estados

```
RECEIVED → REVIEWING → ACTIONED
                     → DISMISSED
                     → ESCALATED → ACTIONED
                                 → DISMISSED
```

Nada salta de `RECEIVED` a un final. Cada final exige su conclusión: descartar es
`ALLOW`, actuar es `BLOCK` (y decir qué acción), escalar es `REVIEW`. `ACTIONED` y
`DISMISSED` no tienen salida: una decisión tomada no se reescribe.

Quien denunció solo puede saber tres palabras —`RECEIVED`, `IN_REVIEW`, `CLOSED`—
y ninguna dice qué se decidió (`vistaParaQuienDenuncia`).

## 5. Duplicados y ritmo

**Deduplicación.** El identificador sale de cuatro cosas: la cuenta, la clase de
objetivo, el objetivo y el motivo. La misma cuenta diciendo lo mismo de lo mismo es
la **misma señal**, se repita una vez o mil, con el Perfil Real o con el Perfil Weë
—una persona con dos caras es una persona, igual que con un «me gusta»—. Un motivo
distinto sí es otra señal. No hay ventana de tiempo que elegir: el documento existe
o no, y lo decide una transacción. Repetir contesta `duplicate: true` y no reescribe
nada.

**Ritmo** (`POLITICA_DE_REPORTES`). Valores operativos iniciales, no promesas de
producto:

| Límite | Valor | Por qué |
|---|---|---|
| Por objetivo | 10 | Lo da la deduplicación: uno por motivo |
| Por cuenta, en 10 minutos | 10 | Quien denuncia de buena fe no se acerca |
| Por cuenta, al día | 50 | Acota lo que una cuenta robada o automatizada puede escribir: 150 escrituras |
| Tamaño de la petición | 2 KB | Se mide antes de mirar nada más |

Cuenta el **intento**, no solo lo creado: repetir la misma petición no crea nada,
pero cada llamada cuesta. Un intento frenado no escribe nada. El freno es por
cuenta: no hay ningún documento compartido entre cuentas.

## 6. Lo que todavía no hace, dicho claro

- **No ejecuta acciones.** No existe quien oculte una publicación o restrinja una
  cuenta. Una acción queda `REQUESTED`; `EXECUTED` y `executedAt` los escribirá el
  ejecutor el día que exista, y hoy ningún código los escribe. La costura en el
  contenido ya estaba: `moderationStatus` y `moderationCaseId`
  (`core/content/content.ts`).
- **No evalúa con IA.** El evaluador (`EVALUADOR_DE_REGLAS`, `wee.rules.v1`) es
  determinista y contesta `REVIEW`. Aunque un evaluador futuro diga `BLOCK`, el
  reporte nace `RECEIVED` y nada se mueve: una acción automática exige una
  política explícita que no existe. Cuando haya un modelo, entrará por
  capacidad → Router → Gateway → proveedor oficial, con su coste apuntado como
  coste operativo de Weë, nunca como Credits de quien denuncia.
- **No emite eventos.** No hay transporte. El contrato tiene la forma exacta de
  `REPORT_CREATED` (`eventoDeReporteCreado`) y reserva `REPORT_REVIEWED` y
  `MODERATION_ACTION`; la comprobación de honestidad de la Fase 10 sigue en verde.
- **No avisa.** La costura es `alCerrar`, que se llama solo cuando hay una decisión
  de verdad. No hay nada enchufado.
- **No hay pantalla de revisión.** `moderationAdmin` (solo administración) lista la
  cola, enseña el historial y aplica transiciones. Es lo que usará el Control Center.

## 7. Seguridad

- `reports`, su `history` y `moderationLimits`: `allow read, write: if false`.
- La petición admite seis campos (`targetType`, `targetId`, `reason`, `details`,
  `actingEntityId`, `surface`). **Cualquier otro la tumba entera**: mandar
  `reporterAccountId`, `status`, `decision`, `reviewer` o `action` no es un
  descuido, es un intento, y se rechaza en vez de ignorarse.
- Lo heredado de un prototipo no cuenta; `__proto__`, `constructor` y `prototype`
  como claves se rechazan; lo que no es un objeto llano no es una petición.
- La cara activa es una **pista**: el servidor lee la entidad y, si no es de esa
  cuenta o no está activa, rechaza. No la ignora.
- Hace falta una cuenta nacida y `ACTIVE`. Lo propio no se denuncia.
- Al cliente viaja un código de gRPC y un motivo corto en `details.reason`. El
  mensaje es siempre el mismo y no cuenta nada: ni rutas, ni el proyecto, ni la cuenta.
- `moderationAdmin` comprueba administración (`shared/admin.ts`) antes de mirar nada.

## 8. Coste

Crear un reporte lee como mucho seis documentos y escribe tres. No lee el contenido
denunciado más que para saber que existe y de quién es. No hay lecturas que crezcan
con el tamaño de Weë. Un índice nuevo: `reports (status ASC, createdAt ASC)`, que es
la cola de revisión.

## 9. La interfaz

`⋯ → Denunciar → motivo → Enviar reporte → «Reporte recibido»`. Es el mismo botón
de siempre en el menú de la publicación; lo que cambió es lo que hay detrás.

- Hoja inferior en el teléfono (el patrón de `CreateSheet`), diálogo centrado en
  escritorio. Una sola hoja para todo lo denunciable: cambia `objetivo`, no el
  componente.
- Dice **«Reporte recibido»**, que es lo que ha pasado. No dice que se revisó ni
  que se quitó nada. Si falla, no da las gracias: dice que no se pudo y deja
  reintentar. Nunca enseña un identificador, un estado interno ni un error del servidor.
- Estados: elegir · enviando (con cerrojo contra el doble toque) · recibido ·
  duplicado · fallo (sin red, demasiados seguidos, contenido que ya no está, otro).
- Accesible: grupo de opciones con estado, cabecera, zona viva, anuncio al terminar,
  objetivos de 44 o más, la elección no depende solo del color, sin animación si la
  persona pidió movimiento reducido.
- Lo propio no ofrece el botón. Sin sesión, lleva a registrarse.

## 10. Idiomas y dirección de lectura

Los textos viven en el módulo `moderation` de cada diccionario
(`i18n/textos/<idioma>/moderation.ts`), tipados contra el español. **Añadir un
idioma no toca la moderación**: el contrato y el servidor no saben de idiomas
—contestan códigos—, el servicio guarda claves y la hoja pinta lo que resuelva
`t()`. La suite lee los idiomas de la carpeta, no de una lista: el día que llegue
el japonés, el neerlandés o el árabe, los exige sin tocarla.

`IDIOMA ≠ DIRECCIÓN ESCRITA A MANO`. La dirección es un dato del idioma
(`i18n/idiomas.ts`, campo `direccion`; el árabe ya está declarado `rtl`, sin
diccionario y sin ofrecerse). La deriva `direccionDe(codigo)`, la entrega
`useIdioma().direccion`, y `hooks/useDireccion.ts` la convierte en estilos. La hoja
de denunciar es el primer componente que la usa: sentido en la raíz, sentido en los
textos, ninguna propiedad física de lado, ni separación de letras ni mayúsculas
forzadas. **Nada de esto activa RTL**: hoy devuelve `ltr` siempre.

## 11. Cómo se prueba

```bash
cd functions && npm run build && node test/moderation.test.mjs
```

```bash
firebase emulators:exec --only firestore --project wee-dev-geovet "node functions/test/moderation.emulator.mjs firestore.rules"
```
