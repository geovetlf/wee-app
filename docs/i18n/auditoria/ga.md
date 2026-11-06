# Auditoría lingüística: irlandés (ga · ga-IE), 2026-10-30

**Es una revisión de IA, no una revisión nativa.** Ningún hablante nativo ha validado estos textos.

## Filas revisadas
529 de 529 filas sin revisar en `_calidad-2026-10-30/ga/correcciones.csv` (todas de `catalogo`). Cada una se comparó con el español y el inglés. También se recorrió el §7 del `informe.md`.

## Problemas
Pocos: la pasada anterior ya había corregido los patrones de todo el diccionario (le hIS, mayúsculas, términos duplicados). Quedaban una redundancia, un calco de preposición y un participio mal elegido. El resto estaba bien y no se tocó.

## Corregidos: 7 claves
| Clave | Antes | Después | Motivo |
|---|---|---|---|
| catalogo.chefGridHint | Roghnaigh rogha agus tosaigh ag cócaireacht le Weë. | Déan rogha agus tosaigh ag cócaireacht le Weë. | Redundante; misma corrección que onboarding.genderMissing |
| catalogo.beautyAcTransformSubtitle | Roimh agus ina dhiaidh | Roimhe agus ina dhiaidh | «roimh» es preposición y pide objeto: calco de «before and after» |
| studio.xpBeforeAfter | Roimh agus ina dhiaidh | Roimhe agus ina dhiaidh | Igual (fila ya revisada: mismo fallo) |
| design.reBeforeAfter | Roimh agus ina dhiaidh | Roimhe agus ina dhiaidh | Igual (fila ya revisada: mismo fallo) |
| catalogo.homeAcLayoutSubtitle | An troscán atá agat cheana, curtha níos fearr. | An troscán atá agat cheana, suite níos fearr. | «curtha» solo evoca enterrado o plantado; colocado es «suite» |
| auth.noAccount | Nach bhfuil cuntas agat?  | Níl cuntas agat?  | Informe §7: la interrogativa negativa da a entender que sí la tiene; igual que catalogo.homeClosingTitle |
| profile.joinedOn | Ina bhall ó {{fecha}} | Ball ó {{fecha}} | Informe §7: quita el masculino impuesto a la persona |

## Propuestas no aplicadas
**Requieren decisión del dueño (discrepa el molde es/en):**
- profile.displayNameLabel y displayNamePlaceholder: «Nombre de usuario» / «Display name».
- moderation.reasonHarassment: «intimidación» / «bullying».
- communities.popularDescDevelopers: «Programadores» / «Developers».
- studio.worldSpace*: «abierto o cerrado» / «outdoor or indoor».
- «Barba larga» / «Full beard» y «Foto personalizada» / «Your own photo».
- prompt o treoir.
- Guía `docs/I18N-IRLANDES.md` (fuera de alcance): §1 «vhóta» → «vóta», §2 cerrar «togha», §4 añadir Reacaireacht, Idirbheart, Breisigh, Tionchaire, Scéalchlár.

**Sin propuesta firme o sin fuente, se quedan para el revisor:**
- trácht o barúil; Polasaí o Beartas príobháideachais.
- catalogo.*Beat*: Beat o Buille; el español también deja el préstamo.
- creator.travel y catalogo.travel*: «cá háit le hithe» o «cá n-íosfaidh tú». Lo actual se entiende.
- studio.shtHero, glacadh, aiAvatar.accPiercing, studio.xpTimelapse, home.communityDescKpopKdrama.

**Requieren tocar código compartido:** auth.termsIntro + auth.termsAnd (RegisterScreen concatena frases); common.accept si también funciona como OK de un aviso.

## Dudas para un revisor humano
1. home.likesCount_*: «Togha».
2. «le hIS» y notifications.communityPost.
3. «Roimhe agus ina dhiaidh» (3 claves): sin fuente externa. Alternativa: «Roimh agus tar éis».
4. «Níl cuntas agat?» y «Ball ó {{fecha}}»: juicio de agente. La segunda se había revertido antes solo por no tener fuente.
5. catalogo.beautyIntro: «maisitheoir» para maquillador, sin verificar.
6. catalogo.studioIdeaChip1: «Físeán de mo ghnó» sigue al español; el inglés dice «about» («faoi»).
7. `textos/ga/plurales.ts` conserva «vhóta» en un comentario, sin efecto en pantalla.
