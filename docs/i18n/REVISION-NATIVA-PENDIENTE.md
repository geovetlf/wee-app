# Revisión nativa pendiente

**Estado: 0 textos revisados por una persona nativa, en ningún idioma.** Todo lo traducido o auditado hasta ahora es trabajo de IA. Nada aquí se debe leer como aprobado.

## Cómo revisar

Cada idioma tiene su lista en `docs/i18n/revision-nativa/<código>.csv`, generada con `node scripts/i18n-revision-critica.mjs`. Son 800 textos en cada uno de los 39 idiomas, con el español y el inglés al lado.

1. El revisor rellena `revisor`, `fecha`, `veredicto` (`ok` o `cambiar`) y, si hace falta, `correccion`.
2. Empieza por las primeras categorías: un error ahí puede provocar una acción equivocada.
3. Las correcciones entran en `i18n/textos/<código>/`, y su registro en `i18n/revision/<código>/`.
4. Solo entonces ese idioma puede pasar a «VALIDADO POR REVISOR NATIVO».

| Prioridad | Categoría | Textos |
|---|---|---|
| 1 | Autenticación y cuenta | 132 |
| 2 | Pagos y Credits | 88 |
| 3 | Privacidad y permisos | 31 |
| 4 | Acciones irreversibles | 48 |
| 5 | Errores y advertencias | 169 |
| 6 | Mensajes de Weë AI | 228 |
| 7 | Navegación y experiencias | 49 |
| 8 | Ayuda y accesibilidad | 55 |

## Dudas que ya están localizadas

Las señalaron los traductores y auditores de IA. Son lo primero que conviene preguntar.

**Huecos sin declinar.** En idiomas con casos o sufijos, lo que entra por un hueco va tras dos puntos o entre paréntesis («Tema: {{cosa}}»). Es correcto, pero más seco que el español. Afecta a de, ru, pl, fi, hu, tr, el, ro, ga, mn, hr, bs, sr, cnr, hi, ko, ja y zh.

| Idioma | Qué mirar |
|---|---|
| ar | jingle, masterizar, outfit, mascota, subtítulos; «مشهد» se solapa entre plano y escena |
| ca | «fitxer» o «arxiu»; repost, donde el glosario pide «torna a publicar» |
| cnr, sr, hr, bs | «prisan» para cercano; «biznis» en bs; Weë con género en bs |
| de, de-CH | guion «Skript» o «Drehbuch»; «Socials»; en de-CH, «das E-Mail» y «Leckeres» |
| el | las opciones van en acusativo; tuteo pendiente del dueño; «επαναφόρτιση» |
| fa, he | mascota, jingle; en he, «ל-אנגלית» y las barras de género |
| fi | «some» para redes; «Tervetuliais-Credits» y «Lahja-Credits» |
| fil | «mundong 3D» es término nuevo; frases con «Isang user» cuando falta el nombre |
| fr, pt | «Nouveau j’aime», «Nouvel abonné»; «itinerário», «chiclete» |
| ga | «Togha nua»; «tasc»; repost frente a «Athphostáil» |
| hi | Weë en masculino; «आप ही चुनें» para «Sorpréndeme» |
| hu | «újraosztás»; «Weël-ed» |
| id, ms | «undian», «bajet»; repost distinto en pantalla y push |
| it, ru | «take», «дубль»; Weë en masculino en italiano |
| ja, ko, zh, zh-TW | formato de los huecos; 請求 o 邀請 en la solicitud de ËContact; 비디오, 동영상 o 영상 |
| km | fuentes sin verificar: itinerario, montaje, subtítulos; norma ្ត/្ដ |
| mn | «Credits-ийг»; «Стори»; «нийгэмлэг» |
| nb | «kreasjon», «Bildeutsnitt», «Flyktig modus», «Best verdi» |
| nl | «bericht» para publicación y mensaje; «toegankelijk» |
| pl | «dzieło», marcado como solemne |
| pt-PT | «tomada» o «take»; «diapositivo»; emoji 🇧🇷 en una opción |
| ro | «Redistribuie» o «Repostează»; «versuri», «scenariu» |
| sv | plano y toma; decisiones en primera persona |
| tr | «rota» para destino; títulos de paso como sintagma nominal |
| vi | «Weë sẽ…» como sujeto; «Trải nghiệm» |

Detalle de la auditoría de `ro`, `km`, `ga`, `nb`, `mn` y `de-CH` en `docs/i18n/auditoria/`.
