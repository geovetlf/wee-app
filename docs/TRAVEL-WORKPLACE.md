# WeëTravel — el workspace (prototipo navegable con datos DEMO)

Estado: 2026-11-06 · solo interfaz y navegación · sin backend, sin APIs, sin Firestore. Todo dato de ejemplo vive en
`constants/travelDemo.ts` (claves, no frases) y los cambios de la persona se guardan solo en su teléfono
(`services/travelDemoStore.ts`, AsyncStorage). Cada pantalla que enseña datos que podrían tomarse por reales lleva la
etiqueta **DEMO**; Travel Safe y el modo emergencia llevan además el aviso rojo «DEMO — no son datos de emergencia
reales».

## Estructura

- Portada: `SpecialistScreen` (`/weeai/seccion/travel`) → `HeroDeTravel` (robot + «Planear con IA», que abre Weë Brain
  con la función *plan*) → caja común `CajaDePrompt` → `components/travel/CuerpoDeTravel.tsx` (Tu Travel Workspace con
  seis puertas, Mis viajes, Popular entre viajeros). Dentro de Weë Creator (`pro`) Travel sigue con su tarjeta de
  siempre.
- Workspace: una sola ruta de la pila principal, `Travel` (`/travel/<pantalla>/<id>`), servida por
  `screens/travel/TravelScreen.tsx`. Cada paso se apila con `push`.
- Identidad visual: sistema común (blanco, tinta azul noche, bordes discretos) y un tono por módulo
  (`TONO_DE_MODULO` en `components/travel/tema.ts`): Descubrir violeta, Planear azul, Mis viajes turquesa, Explorar
  verde, Asistente magenta, Comunidad coral. El dorado queda para Weë (logo, Credits, «Planear con IA», «Preguntar a Weë
  Brain»).

| Módulo | Pantallas (`/travel/...`) |
|---|---|
| Descubrir | `descubrir`, `buscar`, `destino/<id>`, `sorpresa`, `comparar/<a,b,c>`, `coleccion/cat-<id>` · `coleccion/col-<id>` |
| Planear | `planear`, `crear[/<destino>]`, `generar/<viaje>`, `itinerario/<viaje>`, `editor/<viaje>`, `replanear/<viaje>`, `presupuesto/<viaje>`, `versiones/<viaje>` |
| Mis viajes | `viajes`, `viaje/<viaje>`, `calendario`, `reservas/<viaje>`, `documentos/<viaje>`, `gastos/<viaje>`, `compartir/<viaje>` |
| Explorar | `explorar`, `cerca`, `lugar/<id>`, `ruta[/<lugar>]`, `seguridad`, `emergencia` |
| Asistente de viaje | `asistente`, `chat/<id>`, `voz`, `vision[/camara]`, `traductor`, `local`, `saber`, `contexto` |
| Comunidad y recuerdos | `comunidad[/<destino>]`, `compartido/<id>`, `recuerdos/<diario\|albumes\|videos\|mapa\|resumen>` |

## Weë Brain (transversal, no un séptimo módulo)

No hay otra inteligencia. «Preguntar a Weë Brain», enviar en el asistente, replanificar con palabras, traducir o
preguntar por una foto abren la conversación de siempre (`CreatorFlow`, `experienceId: 'travel'`) con lo que la pantalla
ya sabe como objetivo (`useTravelNav().preguntarABrain`). Las sugerencias, alertas, vistas previas de cambios y
confirmaciones (`components/travel/Brain.tsx`) solo enseñan lo que la pantalla calculó en local (DEMO) y nada se aplica
sin aceptar; las actividades bloqueadas nunca se tocan.

## Los 14 agentes lógicos (responsabilidades FUTURAS — no implementados)

Documentados para cuando exista backend; hoy ninguno corre y ninguna pantalla los simula.

1. **Intención** — entiende qué quiere la persona y qué falta preguntar.
2. **Descubrimiento** — propone destinos según gustos, presupuesto, clima y fechas.
3. **Comparación** — contrasta destinos y versiones de un plan con criterios explícitos.
4. **Itinerario** — arma días con visitas, comidas, traslados y descansos.
5. **Replanificación** — aplica cambios pedidos con palabras respetando lo bloqueado.
6. **Presupuesto** — reparte y vigila el gasto frente a lo previsto, en la moneda elegida.
7. **Rutas** — calcula trayectos, alternativas y orden óptimo de paradas.
8. **Lugares** — información de sitios, horarios y cercanía.
9. **Clima y temporada** — avisos del tiempo y mejor época.
10. **Seguridad** — números oficiales, avisos y ayuda cercana (solo con fuentes oficiales).
11. **Documentos** — organiza y protege documentos de viaje (nunca los envía a terceros).
12. **Traducción y visión** — traduce texto/voz y reconoce lugares, platos y carteles.
13. **Comunidad** — conecta con publicaciones e itinerarios compartidos de Weë.
14. **Recuerdos** — diario, álbumes y resúmenes; los vídeos se hacen en Weë Studio.

Todos colgarían de Weë Brain y del WEË AI ENGINE (un adaptador por proveedor, cobros por el Credit Engine); ninguno
reserva ni vende viajes.

## Huecos que esperan foto definitiva

Hoy se reutilizan solo `travel-mascota/peru/grecia/japon/francia.jpg` (`travel-plan.jpg` no se usa: lleva un avión).
Donde no hay foto propia va el tratamiento lila con icono de línea.

| Hueco | Hoy |
|---|---|
| Puerta «Comunidad y recuerdos» (portada) | degradado coral + icono |
| Puerta «Asistente de viaje» | recorte del robot de Travel (provisional) |
| Destinos Oaxaca, Lisboa, Reikiavik, Marrakech, Bali, La Fortuna | degradado + icono |
| Lugares del mapa de Kioto (salvo el Pabellón Dorado) | degradado + icono |
| Portadas de las colecciones (reutilizan Perú/Grecia/Japón/Francia) | foto reutilizada |
| Itinerarios compartidos de Oaxaca | degradado + icono |
| Álbumes (4 de 6 casillas por viaje) | degradado + icono |
| Vídeos de recuerdos y resumen con IA | sin imagen (tarjeta oscura) |
| Mapa DEMO | superficie estilizada (no es un mapa real) |

## Lo que espera APIs o integraciones

Planificación real (Weë Brain/engine), mapas reales y GPS, clima, lugares, rutas, números de emergencia oficiales,
subida cifrada de documentos, invitaciones reales, traducción/visión/voz, sincronización de viajes entre aparatos,
recuento real de guardados de itinerarios compartidos.
