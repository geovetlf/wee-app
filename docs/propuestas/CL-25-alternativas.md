# CL-25 · `SpecialistHero.tsx`: tres alternativas preparadas

> **Estado (2026-10-12, ronda R9, agente DSN): PREPARADO, NO aplicado.** Borrar o conservar `SpecialistHero.tsx` es una
> decisión de estructura visual del dueño (`docs/WEE-DESIGN-DECISIONES-DEL-DUENO.md` §4.3). Aquí hay un diff por
> alternativa, verificado en una copia desechable (clon compartido de `9365153a`, fuera de todo worktree), y lo que cada
> una deja. Ninguna se elige aquí.

## Por qué CL-25 sigue abierto

De los tres restos de CL-25, dos están hechos desde R8 (el comentario del muro en `constants/specialists.ts` y la rama
inalcanzable de Design en `SpecialistScreen.tsx`). El tercero es `components/creator/SpecialistHero.tsx`: **ninguna pantalla
lo importa** y el detector de `_design-cierre.mjs` cuenta «sin importadores» como resto. Dos hechos que pesan (L):

- **Ya se conservó a propósito** en el cierre post-auditoría del 2026-10-01 (`14d1beb9`): `cierre-cliente` 4 «se quedan, por
  decisión: HeroCarousel y SpecialistHero», y `ops/revision/baseline.json` lo apunta como «se quedan a propósito». El motivo
  escrito allí es que `catalogo-i18n` lo exige (38-39: lo lista entre las piezas compartidas), no una decisión de
  estructura visual registrada. **CL-25 (que lo trata como resto) y `cierre-cliente` 4 (que lo protege) se contradicen hoy.**
- Su comentario del prop `compact` **describe el muro de sección como vigente** («las secciones cuyo muro social manda»),
  que se retiró el 2026-09-13 (`4ff271e`): eso SÍ es un resto en el sentido de CL-25, se borre o no el archivo.

## Alternativas

| | A · Mantener | B · Borrar | C · Dejar abierto |
|---|---|---|---|
| Diff | `cl25-A-mantener-specialisthero-r9.diff` | `cl25-B-borrar-specialisthero-r9.diff` (sustituye a `cl25-borrar-specialisthero.diff` de R8, que ya no aplica: cambió el veredicto) | ninguno |
| Archivos | `SpecialistHero.tsx` (comentarios: sin muro vigente + por qué se conserva), `_design-cierre.mjs` (la cláusula «sin importadores» pasa a «no describe el muro como vigente»), `WEE-DESIGN-CIERRE.md` (fila CL-25 y veredicto) | borra `SpecialistHero.tsx`; `cierre-cliente` 4 (solo HeroCarousel); `catalogo-i18n` 38-39 (lo quitan de las dos listas); `_design-cierre.mjs` (detector: archivo ausente = limpio); `WEE-DESIGN-CIERRE.md` (fila y veredicto) | nada |
| Tamaño | 3 archivos, +17 −11 | 5 archivos, −183 del componente y unas líneas de pruebas | — |
| CL-25 | CUMPLIDO | CUMPLIDO | ABIERTO |
| Corredor (sobre `9365153a`) | **15 · 2 · 9 · 2** | **15 · 2 · 9 · 2** | 14 · 3 · 9 · 2 (como hoy) |
| Coherencia con `cierre-cliente` 4 | la mantiene | la cambia (deja de proteger el archivo) | sigue la contradicción |
| Alternativa C de estructura visual («hero + plegables») | conserva la única pieza con forma de cabecera de sección para partir de ella | se pierde (se recuperaría del historial: `git show 9365153a:components/creator/SpecialistHero.tsx`) | la conserva |
| `ops/revision/baseline.json` | su entrada PREEXISTENTE «módulo sin importador» sigue (es baja y conocida) | saldrá `absent` (corregida) en la próxima revisión; no se edita a mano | sigue |
| Riesgo | bajo (comentarios y una prueba) | bajo (nadie lo importa; `creator` y `travel` solo comprueban que NO se monta, y siguen verdes) | ninguno técnico; CL-25 no se cierra |

## Verificación (E, en la copia desechable; logs en `ronda-r9\DSN\logs\cl25-*`)

- **A:** `git apply` limpio; corredor 15 · 2 · 9 · 2 con CL-25 CUMPLIDO; `design-cierre` 37, `cierre-cliente` 59,
  `catalogo-i18n` 48, `revision-detectores` 37, `proyecto-en-las-entradas` 77, `creator` 640, `travel` 376,
  `aceptacion-pantallas` 68, `ci-workflow` 41: todas exit 0. **Control:** con el diff y el comentario viejo del muro
  repuesto, `_design-cierre --solo CL-25` sale con 1 (ABIERTO): la cláusula nueva muerde.
- **B:** el diff de R8 aplicado con `--3way` (solo chocó el veredicto, recalculado con el corredor); corredor 15 · 2 · 9 · 2;
  las mismas suites y `chef-caracterizacion` 47: todas exit 0.
- Ambos diffs pasan `git apply --check` sobre `r9/design` (`f738cc39`).
- **NO ejecutado:** `tsc` de la app con A o con B (A solo cambia comentarios; B borra un archivo sin importadores: I, sin
  riesgo de tipos, pero no medido) y la cadena entera.

## Interacciones

- **A y B se excluyen:** tocan las mismas líneas del detector y del veredicto. Se aplica una o ninguna.
- **Con el puente** (`r9/ensayo-puente`): el veredicto cambia (allí 16 · 2 · 8 · 2); quien integre recalcula con
  `node functions/test/_design-cierre.mjs | tail -3` (`design-cierre` C3).
- **Revertir:** `git revert` del commit que aplique la alternativa; B recupera el archivo entero del historial.
