# Weë en groenlandés / Kalaallisut (kl · kl-GL) — guía de traducción e implementación

Estado (2026-11-03): **en construcción** en el worktree `wt-i18n-is-kl` (rama `i18n/is-kl`). Traducción hecha por agentes de IA
y **SIN revisión de una persona hablante nativa de Kalaallisut**. Nada de esto está en `main`. Etapa 1: guía + glosario +
los tres módulos ancla `common`, `nav` y `menu`. Etapa 2: los 54 módulos (≈4.400 cadenas, `servidor/` incluido) traducidos
por cinco agentes en paralelo SIGUIENDO esta guía. Etapa 3 (2026-11-03, edición de coherencia): términos nuevos de la
etapa 2 incorporados al glosario (§4.10–§4.13), divergencias entre módulos unificadas (§4.14) y §6 ampliado.

**El groenlandés es una lengua independiente.** Kalaallisut es una lengua esquimo-aleutiana (rama inuit), polisintética, sin
parentesco con el danés. No es un dialecto, una variante ni un registro del danés, y en Weë **no tiene ningún respaldo en danés**:
`kl` no cae en `da`, ni el diccionario `kl` toma prestadas frases del diccionario `da`. Lo que falte en `kl` cae en el idioma de
reserva general de la app (como cualquier otro idioma), nunca en danés. Que la moneda de Groenlandia sea la corona danesa (DKK)
es un dato de formato que decide la transacción, no una razón lingüística.

Confianza honesta: el groenlandés es una lengua de **pocos recursos**. No existen localizaciones groenlandesas de iOS, Android ni
de las grandes redes sociales que sirvan de referencia directa; la terminología digital oficial (Oqaasileriffik) es limitada y no
toda es conocida por quien escribe esta guía. Cada término lleva su marca de confianza en §4 y la lista completa de lo que debe
confirmar una persona nativa está en §6. **Nada de este diccionario debe publicarse sin esa revisión.**

## 1. Registro
- `CodigoDeIdioma`: `'kl'`. Locale: `kl-GL`. Nombre nativo: **«Kalaallisut»** (Intl `DisplayNames` en `kl` devuelve
  «kalaallisut», en minúscula; en el selector se escribe con mayúscula inicial, como nombre de la lengua). Dirección `ltr`.
  Sin variantes (solo groenlandés occidental estándar, ortografía oficial de 1973; ni tunumiisut ni inuktun).
- Formatos por `Intl` con `kl-GL`, MEDIDOS con Node v24.19.0 (ICU del propio Node):
  - Número: `12.345,6` (punto de miles, coma decimal).
  - Moneda DKK: `kr. 1.234,50`; USD: `US$1.234,50` (la moneda la decide la transacción).
  - Fecha corta: `2026-10-29`; larga: `2026 oktobarip 29`; completa: `2026 oktobarip 29, sisamanngorneq`.
  - Hora: `13.30` (punto como separador).
  - Plural (`Intl.PluralRules`): categorías `one` / `other` (1 → `one`; 0, 2, 5 → `other`).
- **Dos hechos MEDIDOS que el integrador resolverá en código** (aquí solo se documentan; los traductores no los tocan):
  1. `Intl.ListFormat('kl-GL')` **no tiene datos de kl**: cae en el locale del sistema (en la máquina de medición resolvió
     `es-US` y dio «a, b y c»). Una lista en kl saldría con la conjunción de otro idioma.
  2. Los datos de tiempo relativo de CLDR para kl usan el **marco danés** «for … siden» / «om …»
     (`RelativeTimeFormat('kl-GL')`: «for 3 ulloq unnuarlu siden», «om 2 nalunaaquttap-akunnera»). Las palabras «for»,
     «siden» y «om» son danesas y no deben llegar a la pantalla.
- Plurales: `_one` / `_other` con `{{contador}}` (o el hueco que use el español, p. ej. `{{cantidad}}`); nunca un número a mano.

## 2. Forma de escribir

### 2.1 Principio
Kalaallisut auténtico, moderno y de uso general (el de KNR, Sermitsiaq/AG y las webs de Naalakkersuisut/Sullissivik).
**Prohibido el danés** en cualquier forma: ni palabras («og», «ikke», «tryk», «indstillinger»…), ni frases danesas con
ortografía groenlandesa, ni orden de palabras danés. Una frase se construye desde el sentido, con la morfología groenlandesa:
base + afijos derivativos + flexión. Sin æ/ø/å (la ortografía moderna no las usa; solo en nombres propios ajenos).

### 2.2 Botones y acciones
- **Imperativo de 2.ª persona del singular** (trato directo; el groenlandés no tiene «usted»).
  - Con objeto implícito («esto», «el archivo», «la publicación»): **transitivo 2sg→3sg**.
    Bases en -r: **-ruk** («Toqqoruk» guárdalo, «Peeruk» quítalo/elimínalo, «Ammaruk» ábrelo, «Atoruk» úsalo, «Aaqqissoruk»
    edítalo, «Nutseruk» tradúcelo). Bases en vocal o en -t/-g: **-guk / -uk** («Matuguk» ciérralo, «Nassiuguk» envíalo,
    «Taamaatiguk» cancélalo, «Allaguk» escríbelo, «Misileqqiguk» inténtalo otra vez).
  - Objeto plural: **2sg→3pl -kkit** («Tamaasa takukkit» velos todos, «Kissaatitit allakkit» escribe tus deseos).
  - Sin objeto: **intransitivo -git / -it** («Uterit» vuelve, «Iserit» entra/inicia sesión, «Anigit» sal/cierra sesión,
    «Ujarlerit» busca, «Pilersitsigit» crea, «Assiliigit» haz una foto).
  - Cuando el objeto es indefinido («crear UNA comunidad»): **antipasiva + instrumental** («Peqatigiiffimmik pilersitsigit»).
- Etiquetas de estado: indicativo de 3.ª persona («Naammassivoq» está terminado, «Atorneqarpoq» está en uso).
- Mayúscula solo al principio; sin punto final en botones y títulos.

### 2.3 Huecos `{{…}}` dentro de una lengua polisintética
Un hueco es una palabra cuya terminación no conocemos (un nombre propio, un número, una marca, el título de una comunidad). En
Kalaallisut casi toda la gramática va en sufijos, así que la regla es estricta:
1. **Nunca se pega un sufijo a un hueco** (nada de `{{nombre}}-p`, `{{nombre}}-mut`, `{{comunidad}}-mi`). Ni con guion.
2. El hueco va **en absolutivo**, que no lleva marca: como **objeto** de un verbo transitivo («{{perfil}} atoruk» usa {{perfil}})
   o como **sujeto** de un verbo intransitivo.
3. Si el español pone al hueco como sujeto de algo que hace a otra cosa («{{nombre}} comentó tu publicación»), se usa la
   **antipasiva** (verbo intransitivo, objeto en instrumental): el hueco queda en absolutivo como sujeto
   («{{nombre}} saqqummiussannut oqaaseqarpoq» — molde; la redacción final la valida la persona nativa).
4. Si nada de eso cabe, el hueco va **aislado tras dos puntos o raya**: «Ingerlaffigiuk: {{nombre}}», «Ammaruk: Weë AI».
5. Números: el hueco numérico va delante del sustantivo, que va en singular con `_one` y en plural con `_other`
   («{{cantidad}} saqqummiussaq» / «{{cantidad}} saqqummiussat»). En el habla los números altos se dicen a menudo en danés;
   por eso Weë **nunca** escribe números con letra: siempre el dígito que pone Intl.

### 2.4 Marcas
Las marcas son huecos fijos y siguen las mismas reglas: **sin sufijo nunca** (ni «Weë-mi», ni «WeeTalk-ikkut», ni «Credits-it»).
Van en absolutivo (objeto/sujeto: «Weë qimakkusuppiuk?», «Weë Brain eqqarsarpoq…»), en aposición tras un sustantivo
groenlandés («Profili Weë»), con la posposición **pillugu** que rige absolutivo («Weë pillugu» = acerca de Weë) o tras dos puntos.
Las **siglas** que no son marca («AI», «PDF», «MB», «MIDI») sí admiten sufijo con guion, como es norma en groenlandés
(«AI-mik», «PDF-imik»); cuidado de que la sigla no quede pegada a «Weë» y parezca la marca «Weë AI» declinada
(se escribe «AI-mik Weë isumaginnissaaq», no «Weë AI-mik…»).

### 2.5 Errores, cargas y estados vacíos (moldes fijos)
- Fallo: **«<acción nominalizada en -neq> iluatsinngilaq»** («Anineq iluatsinngilaq» no se pudo cerrar la sesión,
  «Toqqorneq iluatsinngilaq» no se pudo guardar, «Nassiussineq iluatsinngilaq» no se pudo enviar).
- Error general: «Arlaatigut kukkusoqarpoq» (algo salió mal).
- Reintento: «Misileqqiguk» / «Kingusinnerusukkut misileqqiguk» (inténtalo más tarde).
- Cargando: «Utaqqigit…» (espera…), o el verbo pasivo en curso + «…» («Toqqorneqarpoq…» se está guardando).
- Vacío: «Suli … -qanngilaq» («Suli saqqummiussaqanngilaq» todavía no hay publicaciones); sin resultados:
  «Inernernik nassaartoqanngilaq».
- Permisos: «Akuersissut pisariaqarpoq: <cosa>» (hace falta permiso: cámara…).

### 2.6 Registro y puntuación
- Trato: 2.ª persona del singular siempre (illit). Weë habla en 1.ª del plural solo si el español lo hace.
- Preguntas en modo interrogativo («…-piuk?», «…-vit?») con «?» final. Sin «¿».
- Comillas: **»…«** como en la prensa groenlandesa; coherentes en todo el diccionario. «…» (puntos suspensivos Unicode).
- NFC, UTF-8, LF; comillas simples en el TypeScript; `'` escapado como `\'`.
- Préstamos: solo los ya integrados y con ortografía groenlandesa (p. ej. «profili», «video», «minutsi»), marcados en §4.
  Ante la duda se prefiere la formación groenlandesa transparente («qarasaasiaq» ordenador, «assiliut» cámara).

## 3. Marcas (byte a byte, en latino, SIN sufijos)
WEE, Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weë Business, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, **Credits (nunca
traducido ni declinado)**, Filmmaker Engine, World Encode Entity. «Perfil Weë» = «Profili Weë» (la palabra «profili» se traduce,
la marca no). Lo que escribe una persona (publicaciones, nombres, prompts) no se traduce.

## 4. Glosario fijo
Confianza: **alta** = palabra groenlandesa común de cuyo sentido y forma hay seguridad razonable; **media** = palabra existente,
pero su uso en interfaz o su forma flexionada no está confirmado; **baja-pendiente** = formación o préstamo propuesto por el
agente, pendiente de confirmación nativa. Ninguna «alta» sustituye a la revisión nativa.

### 4.1 Navegación y estructura
| Español | Kalaallisut | Confianza |
|---|---|---|
| Inicio / Home | Aallarnerfik | media |
| Ir al inicio | Aallarnerfimmut uterit | media |
| Buscar (destino) | Ujarlerit | media |
| Búsqueda | Ujarlerneq | media |
| Crear (destino) | Pilersitsigit | media |
| Notificaciones | Nalunaarutit | media |
| Notificación | Nalunaarut | media |
| Sección | Immikkoortoq | alta |
| Sección actual | immikkoortoq ammasoq | media |
| Menú | Toqqagassat | baja-pendiente |
| Navegación | Aqqutissiuut | baja-pendiente |
| Ir a {{x}} | Ingerlaffigiuk: {{x}} | baja-pendiente |
| Abrir | Ammaruk | alta |
| Cerrar | Matuguk | alta |
| Volver | Uterit | alta |
| Siguiente | Tulliuttoq | media |
| Anterior | Siuliaq | media |
| Ver todos / todas | Tamaasa takukkit | media |
| Ver más | Amerlanerusut takukkit | media |
| Cargar más publicaciones | Saqqummiussat allat takukkit | media |
| Perfil | Profili | baja-pendiente (préstamo) |
| Mi perfil | Profilera | baja-pendiente |
| Perfil Real | Profili piviusoq | media |
| Perfil Weë | Profili Weë | media |
| … activo | … atorneqarpoq | media |
| Explora | Misissuigit | baja-pendiente |
| Comunidad / Comunidades | Peqatigiiffik / Peqatigiiffiit | baja-pendiente |
| Configuración / Ajustes | Aaqqissuussinerit | baja-pendiente |
| Ayuda | Ikiuineq | media |
| Guardados | Toqqorsimasat | baja-pendiente |
| Mis proyectos | Suliniutikka | media |
| Proyecto | Suliniut | media |
| Mis creaciones | Pilersitakka | baja-pendiente |
| Creación | Pilersitaq | media |
| Especialista(s) | Immikkut ilisimasalik / ilisimasallit | media |
| Mostrar / Ver especialistas | Immikkut ilisimasallit takukkit | media |
| Ocultar | isertukkit (pl.) / isertoruk (sg.) | baja-pendiente |
| Acerca de Weë | Weë pillugu | alta |

### 4.2 Acciones y botones
| Español | Kalaallisut | Confianza |
|---|---|---|
| Cancelar | Taamaatiguk | media |
| Guardar | Toqqoruk | media |
| Guardando… | Toqqorneqarpoq… | baja-pendiente |
| Eliminar / Borrar | Peeruk | media |
| Quitar | Peeruk | media |
| Editar | Aaqqissoruk | media |
| Enviar | Nassiuguk | media |
| Compartir | Siammarteruk | baja-pendiente |
| Listo / Hecho | Naammassivoq | media |
| Aceptar (botón único de aviso) | Akuerivara | media |
| Entendido | Paasivara | alta |
| Reintentar / Inténtalo de nuevo | Misileqqiguk | media |
| Inténtalo más tarde | Kingusinnerusukkut misileqqiguk | media |
| Continuar | Ingerlaqqigit | media |
| Empezar | Aallartigit | alta |
| Elegir / Seleccionar | Toqqaruk | media |
| Añadir / Agregar | Ilanngutiguk | media |
| Subir (archivo) | Ikkuguk | baja-pendiente |
| Descargar | Aalleruk | baja-pendiente |
| Copiar | Assiliguk | baja-pendiente |
| Exportar | Anninniaruk | baja-pendiente |
| Restablecer | Siornatut iliuk | baja-pendiente |
| Escribir | Allaguk (trans.) / Allagit (intr.) | alta |
| Leer | Atuaruk / Atuarit | alta |
| Usar | Atoruk | alta |
| Cambiar a {{perfil}} | {{perfil}} atoruk | media |
| Probar | Misiliguk | media |
| Dictar | Oqaatigiuk, allanneqassaaq | baja-pendiente |
| Traducir | Nutseruk | media |
| Resumir | Eqikkaaruk | media |
| Mejorar | Pitsanngorsaruk | media |
| Restaurar / Reparar | Iluarsiguk | media |
| Generar | Pilersiguk | media |
| Crear (con objeto definido) | Pilersiguk | media |
| Crear (algo indefinido) | …-mik pilersitsigit | media |
| Grabar | Immiuguk | media |
| Reproducir | Aallartiguk | baja-pendiente |
| Pausar | Unitsikkallaruk | baja-pendiente |
| Detener | Unitsiguk | media |
| Tomar foto | Assiliigit | media |
| Permitir | Akueriuk | media |
| Rechazar | Itigartiguk | media |
| Activar / Encender | Ikiguk | baja-pendiente |
| Desactivar / Apagar | Qamiguk | baja-pendiente |
| Activado / Desactivado | Ikitaq / Qamitaq | baja-pendiente |
| Sí / No | Aap / Naamik | alta |

### 4.3 Social
| Español | Kalaallisut | Confianza |
|---|---|---|
| Publicación / Post | Saqqummiussaq (pl. saqqummiussat) | media |
| Publicar | Saqqummiuguk | media |
| Republicar / Repostear | Saqqummiuteqqiguk | baja-pendiente |
| Comentario | Oqaaseqaat | media |
| Comentar | Oqaaseqarit | media |
| Responder | Akiuk | media |
| Respuesta | Akissut | alta |
| Me gusta (like) | Nuannarivara | media |
| Likes (pestaña) | Nuannarisat | baja-pendiente |
| Seguir | Malinnaagit | baja-pendiente |
| Seguidores | Malinnaasut | baja-pendiente |
| Mencionar | Taaguk | baja-pendiente |
| Etiqueta / hashtag | Nalunaaqutaq (pl. nalunaaqutat) — NO «ilisarnaat», que es el logo (§4.14) | baja-pendiente |
| Tendencias | Maannakkut soqutigineqartut | media |
| Popular | Nuannarineqartoq | media |
| Miembro(s) | Ilaasortaq / Ilaasortat | alta |
| Unirse | Ilaasortanngorit | media |
| Unido (ya eres miembro) | Ilaasortaavutit | media |
| Salir (de una comunidad) | Qimaguk | media |
| Crear comunidad | Peqatigiiffimmik pilersitsigit | baja-pendiente |
| Reglas de la comunidad | Peqatigiiffiup maleruagassai | media |
| Oficial | Pisortatigoortoq | media |
| Encuesta | Apersuineq | media |
| Votar / Voto | Taasigit / Taasineq | media |
| Pregunta | Apeqqut | alta |
| Tutorial | Ilitsersuut | media |
| Persona / Personas | Inuk / Inuit | alta |
| Usuario | Atuisoq | alta |
| Usuario anónimo | Atuisoq ateqanngitsoq | media |
| Invitado | Pulaartoq | alta |
| Alguien | Arlaat | media |
| Amigos | Ikinngutit | alta |
| Mensaje | Oqariartuut | media |
| Conversación / Chat | Oqaloqatigiinneq | media |
| Escribe un mensaje… | Oqariartuut allaguk… | media |
| Foto única / Ver una sola vez | Ataasiarlugu takuneqarsinnaasoq | baja-pendiente |
| Solicitud | Qinnut | alta |
| Leído / No leído | Atuarneqarsimasoq / Atuarneqarsimanngitsoq | media |
| Para todos / Público | Tamanut | alta |
| Privado | Isertortoq | baja-pendiente |
| Contenido | Imaq | media |
| Nombre | Ateq | alta |
| Nombre de usuario | Atuisutut ateq | media |
| Biografía | Imminut oqaluttuarineq | baja-pendiente |
| Portada (imagen) | Saqqaa | baja-pendiente |
| Sitio web | Nittartagaq | media |

### 4.4 Creación y Weë AI
| Español | Kalaallisut | Confianza |
|---|---|---|
| IA / Inteligencia artificial | AI (sigla); en prosa «qarasaasiap silaa» | baja-pendiente |
| ¿Qué quieres crear hoy? | Ullumi suna pilersikkusuppiuk? | media |
| ¿Qué quieres hacer? | Suna iliorusuppit? | media |
| ¿En qué te ayudo? | Qanoq ikiorsinnaavakkit? | media |
| 🤷 No sé | 🤷 Nalugara | alta |
| 🤷 Sorpréndeme | 🤷 Tupigusutsinnga | baja-pendiente |
| Idea / Ideas | Isumassarsiaq / Isumassarsiat | media |
| Tu idea | Isumassarsiat | baja-pendiente (homónimo de «ideas») |
| Prompt | Peqqussut | baja-pendiente |
| Copiar prompt | Peqqussut assiliguk | baja-pendiente |
| Pensando… | Eqqarsarpoq… | alta |
| Plan | Pilersaarut | alta |
| Paso | Alloriarneq | media |
| Progreso | Siuariarneq | media |
| Resultado(s) | Inerneq / Inernerit | alta |
| Opción / Opciones | Periarfissaq / Periarfissat | media |
| Ejemplo | Assersuut | alta |
| Herramienta | Sakku | media |
| Asistente | Ikiortaq | media |
| Imagen / Foto | Assi | alta |
| Video | Video | baja-pendiente (préstamo) |
| Audio / Sonido / Voz | Nipi | alta |
| Texto | Allagaq | media |
| Documento | Allakkiaq | media |
| Música | Nipilersorneq | media |
| Canción | Erinarsuut | alta |
| Letra (de canción) | Oqaasiliat (con la canción delante: «erinarsuutip oqaasiliai») | baja-pendiente |
| Cámara | Assiliut | alta |
| Galería | Assinut toqqorsivik | baja-pendiente |
| Estilo | Isikkoq | baja-pendiente |
| Color | Qalipaat | alta |
| Fondo | Tunuliaqut | media |
| Calidad | Pitsaassuseq | alta |
| Duración | Sivisussuseq | media |
| Tamaño | Angissuseq | alta |
| Formato | Iluseq | baja-pendiente |
| Título | Qulequtaq | alta |
| Sin título | Qulequtaqanngitsoq | media |
| Descripción | Nassuiaat | alta |
| Resumen | Eqikkaaneq | media |
| Diseño | Ilusilersuineq | baja-pendiente |
| Escena | Takutitaq | baja-pendiente |
| Guion (cine) | Filmimut allaaserisaq | baja-pendiente |
| Personajes | Inuttaasut | baja-pendiente |
| Efectos | Sunniutit | baja-pendiente |
| Subtítulos | Ataani allagaq | baja-pendiente |
| Variaciones | Allanngorartut | baja-pendiente |
| Receta | Nerisassiornermut ilitsersuut | media |
| Cocinar | Igavoq (igagit) | alta |
| Comida | Nerisassaq / Nerisassat | alta |
| Viaje / Viajar | Angalaneq / Angalavoq | alta |
| Noche(s) (de viaje) | Unnuaq / Unnuat | alta |
| Negocio | Niuerneq | alta |
| Empresa | Suliffeqarfik | alta |
| Producto(s) | Nioqqutissiaq / Nioqqutissiat | media |
| Servicios | Sullissinerit | media |
| Cliente | Pisiortoq | media |
| Reseñas | Naliliinerit | baja-pendiente |
| Marketing / Publicidad | Ussassaarineq | media |
| Casa / Hogar | Angerlarsimaffik / Illu | alta |
| Habitación | Ini | alta |
| Muebles | Pequtit | media |
| Belleza | Kusanassuseq | media |
| Maquillaje | Kusassaatit | baja-pendiente |
| Cabello | Nujait | alta |
| Ropa / Moda | Atisat | alta |
| Naturaleza | Pinngortitaq | alta |
| Documentos | Allakkiat | media |

### 4.5 Cuenta, acceso y Credits
| Español | Kalaallisut | Confianza |
|---|---|---|
| Bienvenido | Tikilluarit | alta |
| Gracias | Qujanaq | alta |
| Por favor (cortesía) | Inussiarnersumik | alta |
| Ups / Lo sentimos | Ajoraluartumik | alta |
| Cuenta | Kontu | baja-pendiente (préstamo antiguo) |
| Crear cuenta | Kontu pilersiguk | baja-pendiente |
| Iniciar sesión | Iserit (nombre: iserneq) | media |
| Toca para iniciar sesión | Iserniaruit attoruk | baja-pendiente |
| Cerrar sesión | Anigit (nombre: anineq) | media |
| ¿Quieres salir de Weë? | Weë qimakkusuppiuk? | media |
| Registrarse | Nalunaarsorneqarit | baja-pendiente |
| Contraseña | Isissutissaq | media |
| Email / Correo | E-mail | baja-pendiente |
| Credits | Credits (marca) | — |
| Saldo | Sinneruttut | baja-pendiente |
| Recargar | Amerlisiguk | baja-pendiente |
| Comprar / Compra | Pisigit / Pisineq | alta |
| Pagar / Pago | Akiligit / Akiliineq | media |
| Precio(s) | Akia / Akit | alta |
| Gratis | Akeqanngitsoq | alta |
| Reembolso | Akiliutip utertinnera | baja-pendiente |
| Historial | Pisimasut | baja-pendiente |
| Billetera | Aningaasivik | media |
| Prueba / de prueba | Misiligut / misiligutitut | media |
| Dinero | Aningaasat | alta |

### 4.6 Errores, validación y estados vacíos
| Español | Kalaallisut | Confianza |
|---|---|---|
| Error | Kukkuneq | alta |
| Algo salió mal | Arlaatigut kukkusoqarpoq | media |
| No se pudo … / No pudimos … | <acción>-neq iluatsinngilaq | media |
| No pudimos cerrar la sesión | Anineq iluatsinngilaq | media |
| Sin resultados | Inernernik nassaartoqanngilaq | media |
| No disponible | Atorneqarsinnaanngilaq | media |
| Este archivo no está disponible | Una maanna atorneqarsinnaanngilaq | media |
| Archivo | (se evita; «una» esto) / fili | baja-pendiente |
| Próximamente | Sivitsunngitsukkut | media |
| Nuevo | Nutaaq | alta |
| Cargando… | Utaqqigit… | media |
| Todavía no hay … | Suli …-qanngilaq | alta (molde) |
| Vacío | Imaqanngilaq | media |
| Inválido | Atorsinnaanngitsoq | media |
| Incorrecto / Correcto | Eqqunngitsoq / Eqqortoq | alta |
| Obligatorio | Pisariaqartoq | alta |
| Campo obligatorio | Immersugassaq pisariaqarpoq | media |
| Caracteres | Naqinnerit | media |
| Mínimo / Máximo | Minnerpaamik / Annerpaamik | alta |
| Sin conexión | Attaveqanngilaq | media |
| Conexión | Attaveqarneq | media |
| Permiso requerido | Akuersissut pisariaqarpoq | media |
| Permiso(s) | Akuersissut / Akuersissutit | alta |

### 4.7 Moderación y seguridad
| Español | Kalaallisut | Confianza |
|---|---|---|
| Denunciar | Naammagittaalliuutigiuk | baja-pendiente |
| Reporte / Denuncia | Naammagittaalliuut | media |
| Enviar reporte | Naammagittaalliuut nassiuguk | baja-pendiente |
| Reporte recibido | Naammagittaalliuut tigusaavoq | baja-pendiente |
| Motivo | Pissutaa | media |
| Spam | Spam | baja-pendiente (sigla/préstamo internacional) |
| Acoso o intimidación | Ajornartorsiortitsineq | baja-pendiente |
| Odio o discriminación | Uumiginninneq | media |
| Violencia | Nakuuserneq | alta |
| Estafa o fraude | Peqquserlunneq | media |
| Suplantación de identidad | Inuup allap atianik atuineq | media |
| Contenido sexual | Atoqatigiinnermut tunngasoq | baja-pendiente |
| Contenido ilegal | Inatsisinik unioqqutitsisoq | media |
| Autolesiones | Imminut ajoqusersorneq | media |
| Suicidio | Imminorneq | alta |
| Seguro (a salvo) | Isumannaatsoq | alta |
| Bloquear | Assersoruk | baja-pendiente |
| Moderación | Nakkutilliineq | media |

### 4.8 Configuración, privacidad y ubicación
| Español | Kalaallisut | Confianza |
|---|---|---|
| Idioma | Oqaatsit | alta |
| Elige el idioma | Oqaatsit toqqakkit | baja-pendiente |
| Privacidad | Paasissutissanik illersuineq | baja-pendiente |
| Política de privacidad | Paasissutissanik illersuinermut maleruagassat | baja-pendiente |
| Términos | Piumasaqaatit | media |
| Reglas | Maleruagassat | alta |
| Datos | Paasissutissat | alta |
| Ubicación | Sumiiffik | alta |
| Ubicación aproximada | Sumiiffik eqqoqqissaanngitsoq | media |
| Exacto | Eqqoqqissaartoq | media |
| País | Nuna | alta |
| Ciudad | Illoqarfik | alta |
| Dispositivo | Atortoq | media |
| Ordenador | Qarasaasiaq | alta |
| Teléfono | Oqarasuaat | alta |
| Notificaciones push | Nalunaarutit oqarasuaammut | baja-pendiente |
| Mensajes privados | Oqariartuutit isertortut | baja-pendiente |
| Tema claro / oscuro | Qaamasoq / Taartoq | media |
| Preguntas frecuentes | Apeqqutit akulikitsumik apeqqutigineqartartut | media |
| Contacto / Contáctanos | Attavigisigut | media |
| Versión (número de versión) | Nutarterneq | baja-pendiente |
| Información | Paasissutissat | alta |

### 4.9 Tiempo
| Español | Kalaallisut | Confianza |
|---|---|---|
| ahora | maanna | alta |
| hoy / ayer / mañana | ullumi / ippassaq / aqagu | alta |
| día(s) | ulloq / ullut | alta |
| hora(s) | nalunaaquttap akunnera / akunneri | alta |
| semana | sapaatip akunnera | alta |
| mes | qaammat | alta |
| año | ukioq | alta |
| minuto(s) | minutsi | media (préstamo integrado) |
| restante(s) | sinneruttoq / sinneruttut | media |
| segundo(s) | sekundi / sekundit | media (préstamo integrado) |

### 4.10 Identidad, perfil y social (añadidos en la etapa 3)
| Español | Kalaallisut | Confianza |
|---|---|---|
| Identidad (quién eres) | Kinaassuseq (2sg: kinaassutsit) | media |
| Avatar del Perfil Weë / avatar con IA (la figura alter ego) | Inuusaq (pl. inuusat; 2sg: inuusat; rel. inuusap; instr. inuusamik; equal. inuusatut) | baja-pendiente |
| Avatar como imagen de perfil (selector, predefinidos, onboarding) | Profilimut assi (pl. profilimut assit) | baja-pendiente |
| Foto de perfil | Profilip assia | media |
| Alter ego | Namminermut alla | baja-pendiente |
| Digital (adj./adv.) | qarasaasiakkut | media |
| Emoji | Assinnguaq | baja-pendiente |
| Like (como número: «3 likes») | nuannarinninneq / nuannarinninnerit | baja-pendiente |
| Repost (pestaña / nombre) | Saqqummiuteqqitat / saqqummiuteqqineq | baja-pendiente |
| {{nombre}} reposteó | {{nombre}} saqqummiuteqqiivoq (antipasiva -i-) | baja-pendiente |
| {{nombre}} le dio like a tu publicación | {{nombre}} saqqummiussannik nuannarinnippoq | baja-pendiente |
| {{nombre}} comentó en tu publicación | {{nombre}} saqqummiussannut oqaaseqarpoq | media |
| {{nombre}} respondió a tu comentario | {{nombre}} oqaaseqaatinnut akivoq | media |
| {{nombre}} comenzó a seguirte | {{nombre}} malinnaasunnut ilanngussimavoq | baja-pendiente |
| {{nombre}} te mencionó | Taaneqarputit: {{nombre}} | baja-pendiente |
| {{nombre}} quiere agregarte (ËContact) | {{nombre}} ilinnut attaveqalerusuppoq · ËContact | baja-pendiente |
| {{nombre}} aceptó tu solicitud (ËContact) | {{nombre}} qinnutinnut akuersivoq · ËContact | baja-pendiente |
| Contacto (persona de la agenda ËContact) | Attaveqat / attaveqatit | media |
| Etiquetar (una publicación) | Nalunaaqutseruk | baja-pendiente |
| Marcador (botón de guardar) | Toqqorsinermut nalunaaqutaq | baja-pendiente |
| Redes sociales | Attaveqaatit (en prosa: inooqatigiinnermi attaveqaatit) | baja-pendiente |
| Categoría | Immikkoortitaq / immikkoortitat | media |
| Destacados | Pingaartinneqartut | media |
| Pantalla (la que se ve) | Qupperneq («quppernermit matumannga» de esta pantalla) | baja-pendiente |
| Toca (para…) | Attoruk | media |
| Hola (saludo del Home) | Aluu | alta |
| por ejemplo (abreviado en ejemplos de campos) | Ass. (assersuutigalugu) | media |
| Tecnología | Atortorissaarutit | media |
| Internet | internet (préstamo; «internetimi») | media |
| Programa / programador | programmi / programmiliortoq | media (préstamo integrado) |
| Blog / e-book | blogi / e-atuagaq | baja-pendiente |
| Coche / bicicleta / máquina | biili / sikkili / maskiina | media (préstamos integrados) |

### 4.11 Weë AI: creación, Studio, Filmmaker y Music (añadidos en la etapa 3)
| Español | Kalaallisut | Confianza |
|---|---|---|
| Logo / marca (emblema) | Ilisarnaat (pl. ilisarnaatit; «niuernerma ilisarnaataa» el logo de mi negocio) | media |
| Identificador (técnico, Filmmaker) | Kinaassutsimut ilisarnaat | baja-pendiente |
| Contenido (que se crea para redes) | Imarisassat (instr. imarisassanik); el contenido de algo: imarisaa | baja-pendiente |
| Regenerar / volver a crear | Pilersiteqqiguk (nombre: pilersiteqqinneq) | baja-pendiente |
| Otra versión (de un resultado) | Ilusaa alla | baja-pendiente |
| Diseñar | Ilusilersoruk / ilusilersukkit (pl.) | media |
| Render | Takussutissiaq | baja-pendiente |
| Estudio (de foto) | Assiliisarfik | media |
| Modo demo / demostración | Takutitsineq | baja-pendiente |
| Vista previa | Siumut takuneq | baja-pendiente |
| Proveedor (de IA) | Pilersuisoq / pilersuisut | baja-pendiente |
| Cadena de respaldo (fallback) | Taarsiutissat tulleriiaarneri | baja-pendiente |
| Motor | motori (préstamo; «motorimut») | baja-pendiente |
| Producción (Filmmaker) | Filmiliaq | baja-pendiente |
| Plano / toma | Assilisaq / assiliineq | baja-pendiente |
| Director | Aqutsisoq | media |
| Storyboard | Takutitat titartagaat | baja-pendiente |
| Archivar / duplicar | Toqqorsivimmut nuuguk / Marloriiguk | baja-pendiente |
| Objetivo (meta) | Anguniagaq | media |
| Dependencia | Attuumassut | baja-pendiente |
| Melodía | Erinaq | media |
| Motor de música | Nipilersornermut sakku | baja-pendiente |
| Pistas separadas | Nipit immikkoortitat | baja-pendiente |
| Ecualizador | Nipinik naligiissaarut | baja-pendiente |
| Borrador | Missingiut | media |
| Géneros musicales internacionales, Piano, MIDI | Pop, Rock, Jazz, Hip hop, Reggaeton, Piano, MIDI (iguales) | media |
| Alter ego digital / foto 3D / mundo 3D | 3D como sigla con guion: «3D-silarsuaq» | media |

### 4.12 Negocio, Chef, Home y Travel (añadidos en la etapa 3)
| Español | Kalaallisut | Confianza |
|---|---|---|
| Ingrediente(s) | Nerisassiassaq / nerisassiassat | media |
| Menú (de comidas) | Nerisassanut pilersaarut / -tit | baja-pendiente |
| Lista de compras | Pisiassat allattorsimaffiat | media |
| Calorías / proteínas / azúcar | kaloriit / proteinit / sukkut | media (préstamos) |
| Interacciones (estadística) | Qisuariarnerit | baja-pendiente |
| Mensajes recibidos | Oqariartuutit tigusat | media |
| Inversores | Aningaasaliisut | media |
| CV | CV (sigla con guion: «CV-ga» mi CV, «CV-it» tu CV) | media |
| Nombres de producto que el español deja en inglés (Business Plan, Business Coach, Pricing Assistant, Brand Kit, SWOT, Customer Insights, Business Ideas, Business Profile) | iguales, como en los demás idiomas | — |
| Redes y apps ajenas (Instagram, TikTok, YouTube, Facebook, WhatsApp, Firestore) | iguales y SIN sufijo (objeto de «atorlugu», tras «·» o entre paréntesis) | — |

### 4.13 Moldes nuevos (añadidos en la etapa 3)
| Español | Kalaallisut | Confianza |
|---|---|---|
| Falta X | Amigaataavoq: X | media |
| Ya … (completivo) | -reer- («taaseereerputit» ya votaste) | alta |
| No te cobré | Akiliisinneqanngilatit | media |
| Te devolví los Credits | Credits utertippakka | media |
| Tienes {{saldo}} Credits | {{saldo}} Credits pigaatit | media |
| Credits disponibles | Credits atorsinnaasatit | media |
| No se pudo cargar / mostrar X | X takutinneqarsinnaanngilaq / -nngillat | media |
| Cargando X… | X takutinneqalerpoq… / -lerput… | media |
| Opcional | Pisariaqanngilaq | media |
| Función / posibilidad | Periarfissaq | media |
| Quiero … (voz de la persona en objetivos) | desiderativo 1sg: «…-rusuppunga / -rusuppara» (tras vocal; i → e: «pilersitserusuppunga»), «…-kkusuppara» tras consonante («allanngortikkusuppara») | baja-pendiente |
| ¿Quieres …? | «…-rusuppiuk? / -kkusuppiuk?» | baja-pendiente |
| Que elija Weë | Weë toqqaali (optativo 3sg) | baja-pendiente |
| Cuando sepas X, dímelo | «Ullut ilisimalerukkit, oqaluttuutinga» (molde de Travel) | baja-pendiente |

### 4.14 Decisiones de unificación (etapa 3)
Una forma por concepto; donde el español separa dos conceptos, el groenlandés también.

| Concepto | Formas que convivían | Elegida | Dónde se cambió |
|---|---|---|---|
| Avatar del Perfil Weë / avatar con IA | «avatari» (A), «inuusaq» (C), «profilimut assi» (D) | **inuusaq** (formación transparente, no préstamo) | weeai ×4, servidor/movimientos ×2, avatar ×2 (`aiSection`, `aiTitle`), help.a2 |
| Avatar = imagen de perfil (selector, onboarding, perfil) | «profilimut assi» | **profilimut assi** (concepto distinto, se mantiene) | — |
| «Avatar Humano IA» (mismo español en dos módulos) | dos frases | «Inuusaq inuttut isikkulik (AI)» | avatar.aiSection = aiAvatar.humanAvatar |
| Logo / marca | «ilisarnaat» | **ilisarnaat** | — |
| Hashtag / etiqueta / etiquetar | «ilisarnaat», «ilisarnaaseruk» | **nalunaaqutaq**, **nalunaaqutseruk** | business, home, composer ×2, saved |
| Identificador (Filmmaker) | «ilisarnaat» | **kinaassutsimut ilisarnaat** | filmmaker ×6 |
| Identidad | «ilisarnaataasoq» / «kinaassuseq» | **kinaassuseq** | help.a2 |
| Regenerar | «pilersiqqiguk» / «pilersiteqqiguk» | **pilersiteqqiguk** | aiAvatar ×3 |
| Letra de canción | «erinarsuutip oqaasii» / «oqaasiliat» | **oqaasiliat** | catalogo ×3, home, servidor/opciones, servidor/plan/texto ×5 |
| Menú (comidas) | «nerisassat allattorsimaffiat» / «nerisassanut pilersaarut» | **nerisassanut pilersaarut** | chef ×2, creator |
| Ingredientes | «nerisassiassat» / «akuutissat» | **nerisassiassat** | servidor/plan/casa ×2 |
| Contenido (que se crea) | «imassat» / «imarisassat» | **imarisassat** | catalogo ×5 |
| Tecnología | «teknikki», «atortut nutaaliat», «atortut», «atortorissaarutit» | **atortorissaarutit** (igual que la comunidad oficial) | catalogo ×2, weebiz ×2 |
| Pantalla | «saqqaq» / «qupperneq» | **qupperneq** | creaciones |
| Categoría | «immikkoortut» / «immikkoortitat» | **immikkoortitat** | home |
| Notificaciones (in-app y push con el mismo español) | dos redacciones | una sola (ver §4.10) | notifications ×2, servidor/avisos ×4, servidor/publica |
| «Tienes {{saldo}} Credits» / «Credits disponibles» | tres redacciones | «{{saldo}} Credits pigaatit» / «Credits atorsinnaasatit» | credits ×2, aiAvatar |
| Mismo texto español con dos traducciones | encuesta antigua, «Ese perfil no es tuyo», «Adjuntar», «Cambiar foto», «Empezando…», coste no calculado, CV actualizado, inversores, e-mail a cliente, destacados, interacciones, mensajes recibidos, «Video de Instagram», eslogan de Business, frase de Weë AI del menú | la forma del glosario o la más transparente | servidor/social ×2, weeai ×3, studio, creaciones, servidor/progreso, creator, catalogo ×5, weebiz, business ×2, nav |
| Desiderativo tras -i | «-irusup-» | «-erusup-» (i → e ante r, ortografía moderna); tras -t: «-kkusup-» | catalogo ×8 |
| Comillas | "…" y “…” sueltas | **»…«** | business ×2, composer ×2, weebiz, servidor/plan/visual ×2 |
| Puntos suspensivos | «...» | **«…»** | 33 cadenas (aiAvatar, brain, composer, studio, weebiz) |
| Marcas ajenas con sufijo | «Instagram-imut», «YouTube-mi», «TikTok-imi», «Firestore-mi» | sin sufijo («Instagram atorlugu», tras coma, entre paréntesis) | creator, home, settings |
| Errores | «-neq iluatsinngilaq» y «-neqarsinnaanngilaq» | se mantienen los DOS con reparto: «-neq iluatsinngilaq» para una acción de la persona (guardar, enviar, subir); «-neqarsinnaanngilaq» para cargar/mostrar/conectar | music ×2, filmmaker (de «aaneqar-» a «takutinneqar-») |

Referencias cruzadas comprobadas (una etiqueta citada en otra cadena coincide letra por letra): `help.a5` »Suliniummut
toqqoruk« = `weeai.saveToProject`; `help.a9` »Peqqussut assiliguk« = `wall.copyPrompt`; `help.q9` »Qanoq pilersippara« =
`wall.howIMadeIt` (en mayúsculas allí); `help.a3` »Nalugara« = «🤷 No sé»; `help.a7` = `communities.officialName*`;
`filmmaker.emptyListText` »Videot« = `studio.videosTitle` y »Takutitat arlallit« = `studio.xpMultiScene`; »Pilersitakka« =
`creaciones.title`; `music.brainNotice` = `music.helpMe`; las dos versiones de la app solo aparecen en `profesional`
(«Weë · tamanut» / «Weë · pilersitsisunut»).

Total: 295 entradas de la etapa 1 + 84 de la etapa 3 = 379 (más los moldes de §2; §4.14 son decisiones, no entradas). Los traductores usan
EXACTAMENTE estas formas; si un término nuevo hace falta, se añade aquí con su marca antes de usarlo.

## 5. Plurales
- `Intl.PluralRules('kl-GL')`: `one` (solo 1) y `other` (todo lo demás, 0 incluido). Se escriben `_one` y `_other`, como el
  español; ninguna forma más. El dual histórico del groenlandés no existe en el groenlandés occidental moderno y no se usa.
- `_one`: hueco + sustantivo en singular («{{contador}} ulloq»); `_other`: hueco + sustantivo en plural («{{contador}} ullut»).
- Tras el número, el sustantivo no lleva caso que dependa del número; si la frase pide caso (p. ej. «en 3 días»), el caso va
  en el sustantivo, nunca en el hueco («{{contador}} ullut qaangiuppata» molde, pendiente).
- El verbo concuerda en número con el sujeto plural en `_other` (p. ej. «… sinneruttoq» / «… sinneruttut»).

## 6. Términos pendientes de confirmación nativa
Todo lo marcado **baja-pendiente** en §4, y además el uso en interfaz de todo lo marcado **media**. En concreto, por bloques:

- **Formas verbales de botón** (morfología de imperativo con bases en -t/-g, la más insegura): Taamaatiguk, Nassiuguk,
  Misileqqiguk, Saqqummiuguk, Saqqummiuteqqiguk, Ilanngutiguk, Ikkuguk, Immiuguk, Pilersiguk, Unitsiguk, Unitsikkallaruk,
  Aallartiguk, Itigartiguk, Ikiguk, Qamiguk, Assiliguk, Misiliguk, Iluarsiguk, Pitsanngorsaruk; 2sg→3pl isertukkit, allakkit,
  toqqakkit; 2sg→1sg Tupigusutsinnga; Akiuk, Akueriuk, Qimaguk, Taaguk.
- **Navegación**: Aallarnerfik (Home), Ujarlerit (Buscar como destino), Pilersitsigit (Crear como destino), Nalunaarutit
  (Notificaciones; ¿o Ilisimatitsissutit?), Toqqagassat (Menú), Aqqutissiuut (Navegación), Ingerlaffigiuk (Ir a), Misissuigit
  (Explora), Tulliuttoq (Siguiente), Siuliaq (Anterior), «immikkoortoq ammasoq» (sección actual).
- **Nombres del menú**: Peqatigiiffiit (comunidades; la palabra suele designar asociaciones formales), Aaqqissuussinerit
  (configuración), Toqqorsimasat (guardados), Ikiuineq (ayuda), Suliniutikka, Pilersitakka.
- **Préstamos**: profili / profilera, kontu, video, e-mail, minutsi, fili, Spam.
- **Acciones**: Siammarteruk (compartir; candidato alternativo: una forma con avitseqatigiip-), Peeruk (¿o Piiaruk?), Toqqoruk,
  Naammassivoq (Listo; ¿o Inerpoq?), Akuerivara (Aceptar como botón único), Aalleruk (descargar), Anninniaruk (exportar),
  «Siornatut iliuk» (restablecer), Nutseruk, Eqikkaaruk, Aaqqissoruk.
- **Social**: Malinnaagit / Malinnaasut (seguir / seguidores), Nuannarivara / Nuannarisat (like), Oqaaseqaat / Oqaaseqarit,
  Oqariartuut (mensaje de chat), Isertortoq (privado), Imminut oqaluttuarineq (biografía), Saqqaa (portada), Pisortatigoortoq,
  Ataasiarlugu takuneqarsinnaasoq (foto de un solo uso), Atuisoq ateqanngitsoq, Arlaat.
- **Weë AI**: AI / «qarasaasiap silaa», Peqqussut (prompt), Isumassarsiat, Isikkoq (estilo), Iluseq (formato),
  Ilusilersuineq (diseño), Takutitaq (escena), Filmimut allaaserisaq (guion), Inuttaasut, Sunniutit, «Ataani allagaq»,
  Allanngorartut, Naliliinerit (reseñas), Kusassaatit, Assinut toqqorsivik, Sullissinerit, Nioqqutissiat.
- **Cuenta y Credits**: Iserit / Anigit para iniciar/cerrar sesión, «Iserniaruit attoruk», Nalunaarsorneqarit, Isissutissaq,
  Sinneruttut (saldo), Amerlisiguk (recargar), Akiliutip utertinnera, Pisimasut (historial), Aningaasivik, misiligutitut.
- **Moderación**: Naammagittaalliuutigiuk / Naammagittaalliuut (denunciar / reporte), tigusaavoq, Ajornartorsiortitsineq
  (acoso), Uumiginninneq, «Atoqatigiinnermut tunngasoq», Assersoruk (bloquear), Nakkutilliineq.
- **Configuración**: «Paasissutissanik illersuineq» (privacidad), Piumasaqaatit, «Oqaatsit toqqakkit», «Nalunaarutit
  oqarasuaammut», «Oqariartuutit isertortut», Nutarterneq (versión), Attavigisigut, Ikitaq / Qamitaq.
- **Frases completas de los módulos ancla**: «Suna kissaatiginerlugu Weë oqaluttuarfiguk. AI-mik Weë isumaginnissaaq.»
  (nav.weeAiPitch, igualada en la etapa 3 a `weeai.tellWee`, que tiene el mismo español),
  «Ullumi suna pilersikkusuppiuk?», «Weë - Siunissap peqatigiiffia», «Weë qimakkusuppiuk?», «Arlaatigut kukkusoqarpoq»,
  «Inernernik nassaartoqanngilaq», «Una maanna atorneqarsinnaanngilaq», «Sivitsunngitsukkut», «Utaqqigit…»,
  «Saqqummiussat allat takukkit», «Aqqutissiuut · Weë».
- **Convenciones**: comillas »…«; sufijo con guion en siglas («AI-mik»); la aposición de marca tras sustantivo flexionado.

### 6.1 Añadido en la etapa 3 (edición de coherencia de los 54 módulos)
Lo que señalaron los cinco traductores y lo que encontró la edición. Nada de esto está confirmado; las correcciones de la
etapa 3 son de COHERENCIA (una forma por concepto), no de corrección lingüística validada.

**Morfología (lo más inseguro de todo el diccionario):**
- **Imperativos sobre bases en -t / -g / -q.** Qué terminación toma cada base (-guk, -uk, -ruk, -kkit, -git, -it) se eligió
  por analogía, no por conocimiento seguro de cada verbo. Casos a revisar uno por uno: Pilersiguk / pilersikkit (base
  pilersit-), Pilersiteqqiguk (regenerar, elegido en la etapa 3 frente a «pilersiqqiguk»), Marloriiguk, Qummut nuuguk,
  Ilanngutiguk frente a Ilanngussigit (los dos aparecen: transitivo con objeto definido / antipasivo con objeto indefinido),
  Ikkuguk / ikkussigit / ikkukkit, Taarseruk, Nalunaaqutseruk, Peerukkit (corregido desde «peerkit»), Siammarteruk frente a
  siammartitsigit / siammartikkit, Aaqqissoqqikkusukkukku, Allanngortiguk, Qaangiuk (omitir).
- **Antipasivas con hueco de sujeto** (§2.3): «{{nombre}} saqqummiussannik nuannarinnippoq» (like), «{{nombre}}
  saqqummiuteqqiivoq» (repost; la antipasiva con -i- tras -qqip- es propuesta: ¿«saqqummiuteqqissivoq» o
  «saqqummiussiqqippoq»?), «{{nombre}} malinnaasunnut ilanngussimavoq» (empezó a seguirte; circunloquio «se unió a tus
  seguidores»), «{{nombre}} ilinnut attaveqalerusuppoq» (quiere conectar), «{{nombre}} qinnutinnut akuersivoq» (aceptó; ¿rige
  alativo o instrumental?), «{{nombre}} oqaaseqaatinnut akivoq» (respondió; se eligió «akivoq» frente a «akisivoq»),
  «{{nombre}} saqqummiussivoq · {{comunidad}}», «{{nombre}} naammassivoq: »{{objetivo}}«». Y las pasivas con el agente tras
  dos puntos: «Taaneqarputit: {{nombre}}».
- **Posesivos de 1.ª y 2.ª persona.** Profilera (mi perfil), Suliniutikka, Pilersitakka, Allakkiakka, Oqaasiliakka,
  Niuernerma (de mi negocio), CV-ga (se unificó a -ga frente a «CV-ra»: ¿cuál pide una sigla leída «si-vi»?), Inuusara;
  2.ª persona: kinaassutsit, profilinnut, saqqummiussannik, qinnutinnut, malinnaasunnut. **Homonimias** a vigilar:
  «inuusat» = «avatares» y «tu avatar»; «isumassarsiat» = «ideas» y «tu idea»; «pilersitatit» (tus creaciones).
- **Desiderativo -rusup- / -kkusup-.** Elegido en la etapa 3: tras vocal «-rusup-» con i → e ante r (pilersitserusuppunga,
  iluarserusuppara, paaserusuppara, qalipaaserusuppara, tunerusuppara, akerusuppakka) y tras t «-kkusup-»
  (allanngortikkusuppara, pilersikkusuppiuk, qimakkusuppiuk). Confirmar la regla y cada verbo, y también
  «pissarsiarerusuppigit», «takuqqikkusutatit», «aaqqikkusullugulu».
- **Formas dubitativas / interrogativas indirectas** (-nerlugu, -nersoq, -nerlunga, -nerlutit): «Suna kissaatiginerlugu
  Weë oqaluttuarfiguk», «qanoq akeqassanersoq», «sumilu aallartissanerlunga nalugara», «suna igassanerlugu», «suna
  pilersikkusunnerlugu», «qanoq iliorlutit pilersissimanerlugit». Revisar persona y número de cada una.
- **Optativo** «Weë toqqaali» (que elija Weë, `music.autoPick`): ¿es natural en una etiqueta de botón, o mejor
  «Weë toqqaatigiuk» / «Weë toqqaatiguk»?
- **Ortografía i/e ante uvular** fuera del desiderativo: «Igalaaminiq» (vidrio) y «Saviminiq» (metal) en `design` se
  dejaron como están porque la edición no sabe si son excepciones léxicas o errores («igalaamineq», «savimineq»).
- **Sufijo con guion en préstamos no siglas**: «Tarot-imik» (home); ¿«tarotimik»?

**Léxico nuevo de la etapa 3 (todo lo marcado baja-pendiente en §4.10–§4.13), en especial:**
- **Inuusaq** (avatar del Perfil Weë): formación transparente «lo que se parece a una persona»; alternativa el préstamo
  «avatari». **Profilimut assi** para el avatar como imagen de perfil: confirmar que la distinción se entiende.
- **Kinaassutsimut ilisarnaat** (identificador técnico) y **nalunaaqutaq / nalunaaqutseruk** (hashtag / etiquetar): elegidos
  para que «ilisarnaat» quede solo como logo/emblema. Confirmar que «nalunaaqutaq» no choca con «nalunaaqutsikkit» (marcar
  como leídas) ni con «nalunaaquttap akunnera» (hora).
- **Imarisassat** (contenido que se crea) frente a «imaq» (contenido, glosario 4.3) e «imassat»; **oqaasiliat** (letra de
  canción); **nerisassanut pilersaarut** (menú de comidas); **atortorissaarutit** (tecnología); **qupperneq** (pantalla);
  **assinnguaq** (emoji); **attaveqaatit** (redes sociales); **qisuariarnerit** (interacciones).
- Las dos versiones de la app: «Weë · tamanut» (versión app) / «Weë · pilersitsisunut» (versión creator) y su etiqueta
  «Weë: suussusaa» (`profesional`).
- Léxico técnico de Filmmaker, Studio (cámara, ópticas, luces, movimientos) y Music (pistas, ecualizador, mezcla y
  masterización: «Akulerussineq inaarsaanerlu»), formado por los agentes con palabras transparentes.
- Nutrición (`chef`): préstamos «kaloriit», «proteinit», «sukkut» y formaciones para carbohidratos, frutos secos y alérgenos.
- Ejemplos adaptados a Groenlandia en `weebiz` («Nuuk, Kalaallit Nunaat», «Kaffisoqarfik Qeqqani»).

**Lo que se deja en inglés a propósito** (como en el noruego, el finés y el islandés): Business Plan, Business Coach, Pricing
Assistant, Brand Kit, SWOT, Customer Insights, Business Ideas, Business Profile, Instagram Story, Facebook Story; las puertas
«Beauty», «Fashion», «Writer», «3D World» de Weë Studio; géneros musicales, Piano, MIDI; platos (Pasta carbonara, Lomo
saltado). Una persona nativa debe decir si alguno de estos debe traducirse.

### 6.x Integración en la migración de la UI (2026-11-05, wt-ui-migracion)
434 claves nuevas traducidas por un agente de IA al integrar el groenlandés con la migración de la demo YC, **sin revisión nativa**,
con este glosario (sin danés, marcas sin sufijo):
`pages` (111, Páginas/WeëPages), `fashion` (129, Weë Fashion), `boost` (106), `weeai` (18, portada de Weë Travel), `wall` (14),
`credits` (13, compra por importe), `music` (13), `design` (11), `studio` (8), `chef` (7), `servidor/movimientos` (3, Boost),
`menu` (1). Retirados: `weebiz` y `credits.pkgBasic` / `badgePopular` / `badgeBestValue`. Todos baja-pendiente:
«qupperneq / qupperneret» (Página/s), «annertusineq / annertusiguk» (Boost, impulsar), «ussassaarineq» (promoción/campaña),
«immikkoortitsineq» (reservar Credits), «missingiut» (borrador) frente a «missingersuut» (estimación), «isikkoq» (look/estilo),
«kusassaatit» (maquillaje), «kukiit» (uñas), «arnap atisaa ataaseq» (vestido: formación del agente para no usar el préstamo danés),
«akuleriissitsineq» (mezcla), «naammassiguk» (masterizar), «misiligut» (demo).
Los 843 textos críticos están en `docs/i18n/revision-nativa/kl.csv`.

## 7. Estado de validación
- **Técnica (hecha):** `node scripts/i18n-validar-modulo.mjs kl common nav menu` → 3 módulos, **0 errores**; 7 avisos, todos
  marcas idénticas al español por regla (Credits, ËContact ×2, Weëls, WeeTalk ×2, Weë AI). **Ningún aviso de danés ni de æøå.**
  Claves: common 29, nav 15, menu 30 (mismo orden que el español, tipo apuntando al español). Formatos de §1 medidos con Node.
- **Pendiente para el integrador (código, no texto):** `ListFormat` sin datos kl y tiempo relativo con marco danés (§1);
  `index.ts` de `kl`, registro en `i18n/idiomas.ts` / `diccionarios.ts`, garantía de que `kl` no cae en `da`.
- **Lingüística (NO hecha):** ninguna persona nativa ha revisado nada. Todo el diccionario `kl` es un borrador de agente con
  confianza global **baja-media**: el léxico básico (sí/no, gracias, bienvenido, error, nombre, persona, imagen, idioma) es
  fiable; la morfología verbal de botones y la terminología digital no lo son. Requisito antes de publicar: revisión de una
  persona hablante nativa de Kalaallisut, idealmente con criterio de Oqaasileriffik.
- **Visual (NO hecha):** las palabras groenlandesas son largas (polisíntesis); hay que inspeccionar botones, pestañas y la barra
  inferior en 320/360/390/1024/1440 por desbordes antes de dar nada por cerrado.
