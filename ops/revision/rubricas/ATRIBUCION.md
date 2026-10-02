# Atribución

La METODOLOGÍA del revisor de Weë —revisores de solo lectura con una rúbrica por dominio, severidad
calibrada, nada de hallazgos con la investigación a medias, atención a la «rotura intencionada», a las roturas
de devex y a la simplificación estructural, y una verificación antes de bloquear— se inspira en:

- el plugin **Thermos** de Cursor, en <https://github.com/cursor/plugins> (licencia MIT);
- y su adaptación a Claude Code, <https://github.com/theocarranza/thermos-claude>.

Weë **no instala ni ejecuta** ese plugin ni su adaptación. Las rúbricas de esta carpeta (`comun.md`,
`codigo.md`, `seguridad.md`, `arquitectura.md`), los agentes de `.claude/agents/revisor-*.md`, el procedimiento
`.claude/commands/revision-de-fase.md` y las herramientas de `ops/revision/` son **texto y código propios**,
escritos para las reglas de Weë (CLAUDE.md); no copian texto de terceros.
