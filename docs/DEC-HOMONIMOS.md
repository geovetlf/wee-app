# DEC-05 y DEC-06: dos series con el mismo número

Nota aclaratoria (R9, 2026-10-14). **No renumera nada**: las dos series conservan sus identificadores y todas sus
referencias siguen valiendo. Solo sirve para que nadie confunda una decisión con la otra.

En Weë hay dos series de decisiones del dueño que empiezan por `DEC-` y se solapan en los números:

| Identificador | Serie de **Weë Design** (decisiones de producto de Design) | Serie de la **auditoría transversal de trabajos y linaje** (2026-10-08) |
|---|---|---|
| **DEC-05** | ¿Se oculta la barra global inferior dentro del workspace en el teléfono? Respuesta **A**. | Paginar «Mis trabajos» por experiencia: `creatorService.getMyJobsDe` + `utils/paginarTrabajos.ts`, con el índice que ya existía (`creatorJobs`: `userId` ↑, `createdAt` ↓), páginas de 20 y como mucho 6 (`MAX_PAGINAS_DE_TRABAJOS`), y la guarda de `SpecialistScreen`. |
| **DEC-06** | Los destinos de exportación. Respuesta **1** (la lista de DEC-06a). | La disponibilidad real de las capacidades (`disponibilidadDeCapacidades`). |
| Dónde está | [WEE-DESIGN-DECISIONES-DEL-DUENO.md](WEE-DESIGN-DECISIONES-DEL-DUENO.md) (fichas «DEC-05» y «DEC-06») y [WEE-HOJA-UNICA-DEL-DUENO.md](WEE-HOJA-UNICA-DEL-DUENO.md) (filas 10-11 y sus fichas). | Commits `bb11c9f7` (DEC-05, «fix(design): paginate specialist jobs by experience»; lo vigila I26 en `functions/test/design-referencia.mjs`, que corre `foundation-de-experiencias`) y `9469e3a5` (DEC-03 y DEC-06). Esta serie no tenía documento propio en el repositorio: esta nota es su referencia. |

Cómo citarlas sin ambigüedad: **«DEC-05 de Design»** / **«DEC-05 de trabajos»** (ídem DEC-06). Dentro de los
documentos de Design, «DEC-05» y «DEC-06» siguen siendo las de Design, y DEC-06a sigue siendo otra decisión distinta
de las dos.
