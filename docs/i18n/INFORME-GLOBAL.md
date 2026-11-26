# Informe global de los 40 idiomas

2026-10-30. Rama `i18n/40-idiomas`, worktree `wee-trabajo/wt-i18n-40`, base `644d147e`. Sin commit, push, merge ni despliegue.

## Antes y después

| | Inicio | Ahora |
|---|---|---|
| Diccionarios en una misma rama | 16 | 40 |
| Con sección del servidor | 3: es, en, da; fil en otra rama | 40 |
| Auditoría de IA completa | 16 de la oleada | Las 22 de la oleada, salvo decisiones |
| Medición visual en una compilación común | Ninguna | 40 idiomas, 230 combinaciones |
| Revisión nativa | 0 | 0 |

## Qué significa cada resultado

- **Código modificado:** la integración, las secciones del servidor y las correcciones de `REGISTRO-AUDITORIA.md`.
- **Con dobles:** las suites de i18n, que no llaman a ningún servicio.
- **Real en navegador:** Chrome sin ventana contra una compilación local, como invitado. Sin sesión ni teléfono.
- **Revisión automatizada:** agentes de IA.
- **Revisión humana:** ninguna.
- **Producción:** nada. Hoy publica 11 idiomas.

## Diferencias con informes anteriores

- La oleada son 22 códigos, 23 diccionarios contando el serbio latino. Con 16 de `main` y filipino suman 40.
- El filipino no estaba en `i18n/fil-ph`, sino sin commit en `wt-temp/fil`.

## Integración futura

1. Autorizar commit de esta rama, sin tocar los worktrees de origen, que quedan intactos.
2. Decidir el orden frente a `visual/rtl-tipografia`, ya incluida aquí, y frente a Fashion Composer.
3. Hacer la carga diferida de los diccionarios antes de publicar.
4. Ejecutar la puerta visual con sesión iniciada y en teléfono.
5. Pasar las listas de `revision-nativa/` a personas nativas.

Archivos compartidos modificados: `i18n/diccionarios.ts`, `i18n/idiomas.ts`, `i18n/caja.ts`, `i18n/formato.ts`, `i18n/resolver.ts`, `app.json`, `components/ErrorBoundary.tsx`, `components/Poll.tsx`, `functions/src/shared/idiomaDelTexto.ts`, `functions/src/shared/idiomaDelServidor.ts`, `functions/src/shared/textosDelServidor.ts`, más los 128 archivos de RTL.
