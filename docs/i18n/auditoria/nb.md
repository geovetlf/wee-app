# Auditoría lingüística: noruego bokmål (nb)

Revisión de IA del 2026-10-30, no revisión nativa. Terminada sobre las 80 filas de `correcciones.csv` sin marcar como revisadas (de 3038). Cada una se comparó con español e inglés, con `informe.md` y `glosario.csv` a la vista. El registro `i18n/revision/` y `i18n/huella.json` no se tocaron.

## Resultado
80 filas revisadas, 2 corregidas y 78 sin cambios. No encontré errores de sentido en acciones destructivas, permisos o seguridad. Casi todas estaban sin marcar porque dependen de un término de familia que fija la guía.

| grupo | filas | decisión |
|---|---|---|
| familia «kreasjon» | 34 | Sin cambios. La fija la guía; el diccionario la limita a moda y alto diseño. Decide un nativo |
| familia «Bildeutsnitt» | 26 | Sin cambios, salvo que `studio.ctlShot` (es «Encuadre») es correcta tal cual. Las demás son «plano»: necesita a alguien del oficio |
| familia «prompt» | 7 | Sin cambios. La fija la guía; decide el dueño |
| sueltas | 13 | 2 corregidas, 11 listadas abajo |

## Corregidos
| clave | antes | después | motivo |
|---|---|---|---|
| home.wallFilteredTitle | Ingenting her med dette utvalget | Ingenting å vise med dette utvalget | «Ingenting her med …» calca el molde y queda sin verbo; se dice «å vise». Propuesta §7 del informe. |
| weeai.sample | prøve | eksempel | «prøve» también se lee como «probar» en una línea de estado; aquí es un resultado de muestra. Propuesta §7; la línea es texto corrido, sin límite de insignia. |

## Decisión del dueño
- **prompt:** mantener el préstamo o pasar a «instruks» (Språkrådet) o «ledetekst» (Microsoft).
- **search.people:** es «Usuarios», en «People»; otras claves dicen «personer». Hay que decidir el molde.
- **profile.displayNameLabel, displayNamePlaceholder:** es «Nombre de usuario», en «Display name». El campo edita `tempDisplayName`; si es el nombre visible, «Brukernavn» está mal en los dos lados del molde.

## Dudas para un revisor humano
- **kreasjon** frente a «verk» o «det du har laget».
- **Bildeutsnitt** para «plano»: frases como «Dette bildeutsnittet har 3 handlinger» suenan forzadas. Candidatas: «Bilde», «Innstilling» (choca con «Innstillinger»), «Klipp».
- **weetalk.ephemeralMode, ephemeralOn:** «Flyktig modus» suena literal, pero no se aplicó «Forsvinnende meldinger»: la ayuda y el blog de WhatsApp en noruego no mostraron el término al consultarlos, así que sigue sin fuente.
- **wall.useInEditor:** «Bruk i redigeringen» es correcto pero vago; depende de cómo se nombre el editor.
- **credits.badgeBestValue:** «Mest for pengene» es más natural, pero un 60 % más largo en una insignia. Hay que verlo en pantalla.
- **aiAvatar.understood, aiAvatar.stepBase, weeai.jobFailed, creaciones.statusFailed:** correctos; la alternativa es cuestión de tono.
- **recCharacterContinuityInconsistent:** «karakter» frente a «figur», ambas válidas.
- **Puntos suspensivos:** la regla de Språkrådet sigue sin leerse; afectaría a unas 100 claves.
