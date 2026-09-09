# Datos geográficos de Weë — GeoNames

El catálogo mundial de lugares de Weë (`data/citiesWorld.ts`) se construye a
partir de datos de **GeoNames**.

## Fuente

| | |
|---|---|
| Proyecto | GeoNames — https://www.geonames.org |
| Archivos | `cities1000.zip` y `alternateNamesV2.zip` |
| Descarga | https://download.geonames.org/export/dump/ |
| Versión usada | dataset del **2026-09-09** |
| Licencia | **Creative Commons Attribution 4.0 International (CC BY 4.0)** |
| Texto legal | https://creativecommons.org/licenses/by/4.0/ |

La licencia permite el uso comercial, la modificación y la redistribución, y a
cambio obliga a **atribuir**.

## Atribución

Weë cumple esa obligación mostrando, en **Configuración → Ayuda → Acerca de Weë**:

> Datos geográficos: GeoNames (geonames.org), CC BY 4.0

La atribución va ahí y en ningún otro sitio: no se repite en cada publicación, ni
en cada resultado del buscador, ni en el muro. La licencia pide crédito razonable,
no ruido.

## Qué se ha tomado y qué se ha dejado

**Se ha tomado**, de cada lugar seleccionado:

- el nombre canónico;
- el código ISO del país;
- el identificador numérico de GeoNames, como parte del identificador de Weë;
- si existe, el nombre en español (de `alternateNamesV2`, filtrando `isolanguage = es`).

**No se ha tomado**, aunque el dataset lo trae:

- latitud y longitud;
- elevación, huso horario, población;
- nombres alternativos en otros idiomas;
- códigos administrativos.

Las coordenadas se leen durante la construcción y se descartan. Weë no guarda
ninguna coordenada, ni de un lugar ni de una persona.

## Cómo se regenera

```bash
node scripts/buildCities.mjs --dry-run   # cuenta y mide, no escribe
node scripts/buildCities.mjs --write     # escribe data/citiesWorld.ts
```

El script descarga las fuentes, filtra por importancia administrativa y población,
respeta los lugares escritos a mano de `data/cities.ts` y sus identificadores,
aparta los territorios que `data/countries.ts` no reconoce como países, y valida
la integridad antes de escribir.

**Los archivos fuente no forman parte de la aplicación.** Solo entra el catálogo
generado, y ni siquiera se carga al arrancar: se pide la primera vez que alguien
abre el selector de lugar.

## Lo que Weë no hace con estos datos

- No consulta los servicios web de GeoNames en tiempo de ejecución.
- No envía a nadie lo que alguien escribe en el buscador de lugares.
- No geocodifica: un lugar es una identidad, no una posición.
- No traduce nombres con inteligencia artificial.
