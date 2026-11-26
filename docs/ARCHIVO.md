# Archivo de Weë — lo que está dormido y cómo retomarlo

## Weë Filmmaker y Weë Music — ARCHIVADOS (decisión del dueño, 2026-11-23)

> «Por el momento voy a tener que archivar el trabajo de Filmmaker… hasta tener toda la app terminada. No lo borres,
> tenlo ahí para retomarlo más adelante. Y Weë Music también.»

WeëAI se queda, por ahora, con lo sencillo para publicar: **Imagen**, **Video corto** y **Editar mi foto**, con las
APIs de BytePlus por debajo. Filmmaker y Music NO se borran: quedan **dormidos dentro del código**.

### Copia exacta
- Rama `archivo/filmmaker-music-2026-11-23` → commit `6cd61198` (último trabajo de Filmmaker: universo, storyboard,
  director, producción, tandas, voces, render). Es la foto intacta; no se toca.

### Qué está apagado y dónde
| Pieza | Estado | Dónde se enciende |
|---|---|---|
| Filmmaker en la app (portada de WeëAI, «Varias escenas», rutas `Filmmaker` / `FilmmakerTandas`, enlaces `weeai/filmmaker…`) | Apagado | `FILMMAKER_EN_LA_APP` en `constants/studioExperiences.ts` |
| Producción (`Production`) | Sin enlace ni entrada (como en main antes de 2026-11-17) | La misma puerta |
| Funciones nuevas de Filmmaker: `leerDocumento`, `generarImagenesFilmmaker`, `renders`, `renderWorker` | **No se exportan** (no se despliegan ni cuestan). El código sigue en `functions/src/creator/{documentos,imagenes,renders}` | Volver a exportarlas en `functions/src/index.ts` |
| `productions` y `shots` (servidor ya desplegado antes) | Se siguen exportando para no borrar nada desplegado; sin la puerta de la app nadie llega a ellas | — |
| Weë Music | Oculta (ya lo estaba): `MUSICA_EN_LA_UI` apagada y `MUSIC_GENERACION_VALIDADA = false`; sin proveedor | `constants/weeExperiences.ts`, `constants/musicCapabilities.ts` |
| Pruebas de Filmmaker y Music (9 suites) | Fuera de la cadena principal, en `npm run test:archivado` | `functions/package.json` |

Suites apartadas: `filmmaker-modelo`, `filmmaker-ui`, `filmmaker-servicio`, `filmmaker-requisito-servidor`,
`f1d-cliente`, `f1d-generacion`, `productions-runtime`, `gran-motor-g-filmmaker`, `music`.

### Para retomarlo
1. Comparar la rama de trabajo con `archivo/filmmaker-music-2026-11-23` (lo que cambió alrededor mientras dormía).
2. Poner `FILMMAKER_EN_LA_APP = true` y volver a exportar las cuatro funciones.
3. Devolver las 9 suites a `scripts.test` y ponerlas en verde (traducciones provisionales de los módulos `filmmaker*`
   en 40 idiomas incluidas).
4. Antes de usuarios reales: reglas e índices de `productions`/`shots` desplegados (docs/INTEGRACION-PRODUCCION.md).

Las decisiones de producto de Filmmaker siguen vigentes en la memoria del proyecto (flujo «Jay Reads», usuario creador,
voces, workplace aprobado): no se pierden con el archivo.
