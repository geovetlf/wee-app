# Weë Music — Composer, Workstation y matriz de capacidades (v0)

Rama `music/composer-estudio` (desde `2845ea94`). Estado: **UI completa y honesta, sin ninguna llamada a proveedores**.
Concepto: «Weë Music — Tu idea. Tu sonido. Sin límites.»

> **Validación técnica pendiente.** En esta fase NO se ejecutó ninguna prueba, `tsc`, build, emulador ni servidor: solo
> se escribió e inspeccionó código. Nada de lo descrito está comprobado en ejecución (ver § 9).

## 1. Qué es y qué NO es

Weë Music es una **experiencia** sobre los sistemas compartidos de Weë AI (CLAUDE.md §10), no un motor. No hay
conductor, router, créditos, proyectos ni biblioteca paralelos. CLAUDE.md dice que **Weë Music no se conecta todavía a
ninguna API musical**: se respeta. `MUSIC_GENERACION_VALIDADA = false` (`constants/musicCapabilities.ts`) es el
interruptor único; con él cerrado, «Generar canción» está desactivado con su motivo («Pendiente de integración») y nada
se crea, se cobra ni se anima.

Flujo objetivo (no recorrido hoy): Weë Music UI → Composer → Weë Brain → Context/Planner → Orchestrator → Router →
AI Gateway → Adaptador → Job Engine → Media/Assets → Projects/Credits.

## 2. Capas de interfaz (móvil y web comparten código)

| Capa | Dónde | Estado real |
|---|---|---|
| Portada | `components/music/MusicPortada.tsx` | Identidad, «Crear música», 8 accesos, 6 habilidades con su estado, recientes (solo datos reales), matriz plegada |
| Composer | `components/music/MusicComposer.tsx` | 7 puntos de partida, descripción 0/500 con ejemplos, «No sé» (Brain real), parámetros, avanzadas, resumen, generación cerrada, borrador local |
| Grabar / subir melodía | `components/music/MelodiaDeReferencia.tsx` + `hooks/useMusicAudio.ts` | Permiso, grabación, duración, parar/reproducir/regrabar, onda medida, subida (web), validación, confirmación |
| Resultado y reproductor | `components/music/ReproductorDeCancion.tsx` | Título editable, favorito, reproductor SOLO con audio real, onda solo con niveles reales |
| Workstation | `components/music/Workstation.tsx` | Riel + centro + panel derecho en escritorio; pestañas en móvil; línea de tiempo con cursor |
| Línea de tiempo | `components/music/LineaDeTiempo.tsx` | Escala, cursor, secciones seleccionables, carriles solo con pistas con audio propio |
| Secciones | `components/music/EditorDeSecciones.tsx` | Lista con tiempos si se conocen, selección, instrucciones preparadas, alcance honesto |
| Instrumentos y mezcla | `components/music/EditorDeInstrumentos.tsx` | Mezcla por pista SOLO con stems reales; si solo hay estéreo, lista descriptiva sin canales |
| Ecualizador y efectos | `components/music/EcualizadorYEfectos.tsx` | Valores y contrato; aplicar y comparar cerrados |
| Letra, voz, estilo | `components/music/LetraYEstilo.tsx` | Editor de letra real/local; generación y estilo vocal pendientes |
| Stems y exportación | `components/music/StemsYExportacion.tsx` | Formatos derivados de recursos reales (`formatosDeExportacion`) |
| Mis creaciones | `components/music/MisCreacionesMusic.tsx` | Lee `assets` (`kind: 'audio'`) por `assetsService`; delega en `MisCreaciones` y `Projects` |
| Matriz | `components/music/MatrizDeCapacidades.tsx` | La matriz de § 4 como pantalla |
| Pantalla | `screens/MusicScreen.tsx` | Portada → Composer → Workstation en una pantalla, sin ruta nueva |

Estados que la UI distingue (`utils/musicModel.ts`, `ChipDeEstado`): vacío, borrador, preparado, pendiente de integración,
no compatible, en curso (solo si hay trabajo real: hoy solo la grabación), completado, error, cancelado, sin permisos,
archivo incompatible, proveedor no configurado, coste por confirmar, resultado no disponible.

Reglas de honestidad implementadas (`utils/musicModel.ts`): una lista de instrumentos **no** son pistas (`modoDeMezcla`);
la edición solo es «localizada» si el motor lo garantiza (`alcanceDeEdicion`); la canción de ejemplo está marcada
`esEjemplo`, lleva el aviso «Ejemplo de diseño», no tiene audio y nunca se guarda; no se promete clonar voces ni
convertir cualquier tarareo en canción o MIDI; el coste no se muestra (no hay precios medidos): «coste por confirmar».

## 3. Diferencias app vs web

Mismo código y misma cobertura funcional; cambia la disposición (`useResponsive().isDesktop`):

- **Escritorio/web**: riel de herramientas a la izquierda, centro con reproductor persistente y línea de tiempo amplia,
  **panel derecho** con el editor de la sección seleccionada (solo en escritorio; en móvil es una pestaña).
- **Móvil**: pestañas de herramientas desplazables y una herramienta a la vez; línea de tiempo desplazable en horizontal.
- **Subir un archivo de audio**: solo web (selector del navegador). En nativo **no hay selector de archivos** en esta
  compilación (no hay `expo-document-picker`; no se añadió ninguna dependencia): se muestra «no disponible en la app
  móvil» y queda la grabación. Para activarlo: añadir `expo-document-picker` en una fase autorizada.
- **Forma de onda de una grabación**: la mide el grabador (`isMeteringEnabled`); si una plataforma no entrega medidor, se
  dice «sin forma de onda» (no se inventa).

## 4. Matriz de capacidades

Datos consumibles: `constants/musicCapabilities.ts` (UI) y `functions/src/music/matrix.ts` (proveedores). Estados:
**implementada** (funciona hoy sin proveedor), **preparada** (contrato y pantalla, sin adaptador registrado), **pendiente**
(sin contrato cerrado). Habilitada hoy: solo las implementadas. Coste: pendiente en todas las que dependen de un motor.

| Capacidad | Control en la UI | Operación del contrato | Responsable | Proveedores que lo declaran (doc. pública) | Estado | Restricciones |
|---|---|---|---|---|---|---|
| Crear canción | «Generar canción» | `music.generate` | Music Engine (futuro) | MiniMax, ElevenLabs, Mureka | preparada | Ninguno aprobado ni configurado |
| Instrumental | punto de partida «Instrumental» | `music.generate` (`instrumental`) | idem | MiniMax, ElevenLabs, Mureka | preparada | — |
| Audio de referencia | «Con un audio» / «Subir» | `music.reference` | idem | MiniMax (`music-cover`), ElevenLabs | preparada | Límites distintos por proveedor (§ 5) |
| Grabar melodía | «Tararear o grabar» | — (local) | dispositivo | — | **implementada** | El audio no sale de la pantalla |
| Tarareo → canción | — | `music.reference` | — | ninguno | pendiente | No se promete |
| Extender | «Extender» | `music.extend` | Music Engine | Mureka (extensión) | preparada | — |
| Remix / cambio de estilo | «Remix», «Cambiar de estilo» | `music.remix` | Music Engine | ninguno confirmado | preparada | — |
| Editar sección | «Regenerar sección» | `music.editSection` | Music Engine | ElevenLabs (inpainting; en API sin confirmar) | preparada | «Conserva el resto» solo si el motor lo garantiza |
| Cambiar instrumentos | instrucciones | `music.editSection` | — | ninguno | pendiente | — |
| Letra con IA | «Generar letra» | `music.lyrics` | Music Engine | MiniMax, Mureka | preparada | — |
| Voz | chips de voz | `music.generate` | Music Engine | MiniMax, ElevenLabs, Mureka | preparada | Sin clonación ni imitación de voces |
| Stems | «Separar en pistas» | `music.stems` | Music Engine | ninguno confirmado (Mureka lo nombra sin explicarlo) | preparada | — |
| Ecualizador / efectos | bandas, efectos | `music.process` | ninguno | ninguno | pendiente | Sin cadena de audio |
| Exportar | «Descargar/Compartir» | `music.export` | Music Engine | MiniMax, ElevenLabs (formatos) | preparada | Solo lo que existe en la canción |
| MIDI | — | — | — | ninguno | pendiente | Nada lo produce |
| Borrador local | «Guardar borrador» | — | dispositivo | — | **implementada** | Solo texto y elecciones |
| Mis creaciones | «Mis creaciones» | — (Assets) | Content Core | — | **implementada** | `assets` no distingue música de otro audio |

## 5. Proveedores candidatos (consulta del 2026-10-15, solo documentación pública)

Ninguno está aprobado, configurado ni llamado. Suno queda fuera (CLAUDE.md). Detalle por ficha en
`functions/src/music/matrix.ts` (`PROVEEDORES_MUSICALES`).

**MiniMax — confirmado (documentación oficial).** `POST https://api.minimax.io/v1/music_generation`, Bearer. Modelos
`music-3.0` (recomendado), `music-2.6`, `music-cover` (referencia). `prompt` ≤ 2000, `lyrics` ≤ 3500,
`is_instrumental`, `lyrics_optimizer`, `output_format` url/hex (URL 24 h), `audio_setting` mp3/wav/pcm 44,1 kHz,
120 RPM. Referencia: 6 s–6 min, ≤ 50 MB. **Hallazgo grave: a partir del 2026-08-20 las APIs de música y letras de pago
«no estarán disponibles para nuevos usuarios»; solo siguen los de pago existentes** (y los modelos `-free` se retiran).
Falta: si una cuenta nueva de Weë puede acceder, derechos comerciales y precio (no publicado). Es el único con
normalizadores escritos (puros) en `providers.ts`.

**ElevenLabs (Eleven Music) — parcialmente confirmado.** Modelos `music_v2_5`, `music_v2`, `music_v1`; duración 3 s–5 min;
mp3 (44,1 kHz, 128–192 kbps) y wav; letras y prompts multilingües; audio de referencia ≈ 30 s (v2/v2.5, planes de
pago); inpainting de secciones documentado en la interfaz; derechos comerciales «varían por plan»
(`elevenlabs.io/music-terms`). **No confirmados**: ruta y cuerpo HTTP (la página remite al SDK `music.compose`), stems,
precio, sección por API. Reutilizaría `ELEVENLABS_API_KEY` (hoy solo voz). Plan de pago exigido.

**Mureka — parcialmente confirmado.** La página oficial lista canción, instrumental, letras y extensión, y nombra «stem» y
«recognize» sin explicarlos; no describe autenticación, límites, precio ni términos. Los endpoints (`api.mureka.ai`,
`/v1/song/generate`, `/v1/song/easy-generate`, `/v1/instrumental/generate`) constan **solo en guías de terceros**:
no se usan.

**Yinchao (音潮) — no confirmado.** No se encontró documentación oficial de API; lo conocido viene de un nodo de ComfyUI
de terceros (tarea asíncrona con sondeo, `prompt` < 1000, referencia ≤ 10 MB, extender, modelos v4.0/v3.5, ≈ ¥0,22 por
canción sin verificar). Posible restricción territorial: pasaría por la elegibilidad por jurisdicción del engine.

Adaptadores: `functions/src/music/providers.ts` — `music-minimax`, `music-elevenlabs`, `music-mureka`, `music-yinchao`
(prefijo `music-` para no chocar con `elevenlabs` y `minimax` de voz). `isConfigured()`/`supports()` siempre `false`,
`run()` lanza un `ProviderError` no reintentable. **No están en `ADAPTERS`.**

## 6. Contrato interno

`functions/src/music/contract.ts`, versión `0.1.0` (`MUSIC_CONTRACT_VERSION`; espejo en el cliente). Operaciones
`music.generate|reference|extend|remix|editSection|lyrics|stems|process|export`. Solicitud con `requestId`
(idempotencia = clave del trabajo y del asiento de Credits), audio **por referencia a un asset** (nunca bytes ni base64),
resultado `accepted` (con `providerRef`) / `completed` / `failed` (código cerrado `MusicErrorCode`), validación pura
`validarSolicitudMusical`. Cancelación y reintentos los gobierna el Job Engine; el coste real solo entra si el proveedor
lo declara (`providerCostUsd`), nunca se estima.

## 7. Reutilización (nada paralelo)

`CreatorShell`, `CabeceraDeSeccion`, `CajaDePrompt` (toda caja de texto de Weë Music es la común que crece:
descripción, letra, instrucciones) y `CampoQueCrece` (título), `useBrainChat` (el «No sé» y su cobro por bloques),
`assetsService` + `MisCreaciones` + `Projects`, `CreditsPill` (vía `CreatorShell`), `useIdioma`/`formato`,
`useResponsive`. El proyecto no tiene `expo-document-picker`; `expo-av` (deuda de migración a `expo-audio`) se toca
**solo** en `hooks/useMusicAudio.ts`.

## 8. Puntos de integración (cambios en archivos compartidos, mínimos)

1. `screens/SpecialistScreen.tsx`: `import MusicScreen` y `if (id === 'music') return <MusicScreen />` junto a Fashion
   (entrada actual `Specialist {id:'music'}` conservada; la ficha antigua de música ya no se muestra, la conversación
   guiada de `CreatorFlow` para música sigue existiendo en el servidor sin tocar).
2. `i18n/textos/*/index.ts` (16): `import { music }` y `music,`.
3. **Para activar música en una fase autorizada** (NO hecho aquí): en `functions/src/engine/registry.ts`, añadir una línea
   en `ADAPTERS` (p. ej. `'music-minimax': minimaxMusicAdapter`), una entrada en `DEFAULT_PROVIDER_CONFIG` y cambiar la
   cadena `'music.generate': routing('music.generate', chain('music-pending'), 'balanced')` por la del proveedor
   aprobado; añadir `music.reference|extend|…` al `CapabilityId` del Core y a `COSTE` de Credits cuando haya precios;
   poner `MUSIC_GENERACION_VALIDADA = true` y conectar el botón del Composer a `creatorRun`/conductor. Todo ello exige
   autorización explícita, clave, prueba real con coste autorizado y revisión de derechos.

## 9. Limitaciones y decisiones pendientes

- **Nada se ejecutó**: sin `tsc`, sin tests, sin build, sin navegador. Pueden existir errores de tipos o de renderizado.
- **`i18n/huella.json` NO se regeneró**: el catálogo de 16 idiomas cambió (sección `music`); `scripts/i18n-huella.mjs`
  debe ejecutarse en la fase de validación (la tarea principal también lo toca). Pruebas de i18n existentes pueden
  exigirlo y otras listas de secciones/tamaños.
- Las traducciones de 14 idiomas son borradores asistidos, **pendientes de revisión nativa** (pt = Brasil, ru = formal «вы»).
- `assets` no distingue música de otro audio (p. ej. notas de voz): «Mis creaciones de música» lista todo `kind: 'audio'`.
- No hay ajuste de duración real por proveedor en la UI (límites de interfaz conservadores 6–60 s, 10 MB para la referencia).
- Un proyecto de música (guardar la canción en `Projects`) no tiene escritura nueva: «Guardar» queda cerrado hasta que
  existan canciones reales; usará `ProjectPicker`/`projectsService` tal cual.
- Pendientes de decisión del dueño: qué proveedor(es) aprobar (y la restricción de MiniMax a nuevos usuarios), derechos de
  uso comercial, precios medidos, añadir `expo-document-picker`, migración `expo-av → expo-audio`, y si la antigua
  conversación guiada de música debe seguir enlazada desde la portada.

## 10. Micrófono en iPhone y Credits (cierre de riesgos, 2026-10-15)

**Decisión del dueño:** Weë Music puede usar el micrófono en iPhone (ideas musicales, melodías tarareadas, referencias vocales
propias). Mecanismo del proyecto, sin claves nuevas: `app.json` → `expo.ios.infoPlist.NSMicrophoneUsageDescription` (español,
base) + `app.json` → `expo.locales` → `locales/<idioma>.json` → `ios.NSMicrophoneUsageDescription` (los otros 15; Expo los
convierte en `InfoPlist.strings`). El texto cubre los dos usos —música y mensajes de voz— sin nombrar ninguna función y dice que el
audio solo se usa si la persona lo decide. `MUSIC_GRABACION_EN_IOS_AUTORIZADA = true` queda como interruptor de emergencia. El
permiso se pide solo al pulsar «Empezar a grabar» (`empezar` en `hooks/useMusicAudio.ts`); `i18n-permisos-ios` F1–F2c lo fija y
limita el micrófono a dos archivos (WeeTalk y ese hook).
Verificado: `npx expo config --type introspect` muestra el `infoPlist` fusionado con el texto nuevo, los 16 `locales` y `RECORD_AUDIO`
en Android. NO verificado: el `Info.plist` y los `InfoPlist.strings` generados por `prebuild` (exige macOS/Xcode), ni el diálogo en un iPhone.

**Credits.** Único consumo posible: «No sé, ayúdame a elegir» → `useBrainChat.send` → `brainChat` (1 Credit por bloque de 12 respuestas;
la tarifa y el cobro no se tocaron). Corregido en Music: guarda síncrona contra el doble toque (`enVuelo`), dos botones con nombres
distintos (`askBrain` / `helpMeButton`), aviso previo honesto sin precio (`brainNotice`) y «Dejar de esperar» (no muestra la respuesta
tardía; NO cancela el envío en el servidor y lo dice). **Siguen abiertos** (punto de integración, requieren tocar `useBrainChat` o
`brainChat`, fuera de esta rama): el reintento tras un corte de red genera un `messageId` nuevo en `useBrainChat.send` (no se puede
reutilizar desde fuera), y no existe cancelación real en el servidor.
