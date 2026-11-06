# Weë en islandés (is · is-IS) — guía de traducción e implementación

Estado (2026-11-03): **en construcción** en el worktree `wt-i18n-is-kl` (rama `i18n/is-kl`). Traducción hecha por agentes de IA y
**SIN revisión por una persona nativa o competente en islandés**. Nada de esto está en `main`. Etapa 1: esta guía + `common`, `nav`,
`menu` (anclas de estilo). Etapa 2: los 54 módulos (app y `servidor/`, incluido `servidor/plan/`; ~4.166 cadenas), traducidos por
cinco agentes en paralelo. Etapa 3 (pasada de coherencia, 2026-11-03): los términos que esos agentes propusieron se fundieron en el
§ 4, las divergencias entre módulos se unificaron (§ 4.1) y las citas de botones se comprobaron contra el texto real (§ 4.2).
Cualquier término nuevo que se repita se añade al § 4 antes de usarlo en otro módulo.

## 1. Registro
- `CodigoDeIdioma`: `'is'`. Locale: `is-IS`. Nombre nativo: `Íslenska`. Dirección `ltr`. Sin variantes (no hay norma regional).
- Formatos por `Intl` con `is-IS` (medidos con Node, ICU 78.3):
  - número: `12.345,6` (punto de miles, coma decimal);
  - moneda: `1.235 kr.` (ISK, sin decimales); otra moneda: `1.234,50 EUR`. La moneda la decide la transacción;
  - fecha corta `29.10.2026`; larga `29. október 2026` (meses en minúscula); hora `14:30` (24 h);
  - lista «a, b og c» (conjunción) y «a, b eða c» (disyunción), sin coma antes de «og»;
  - tiempo relativo: «fyrir 3 dögum».
- Plural (CLDR): `one` / `other`. `one` = enteros que terminan en 1 **salvo los que terminan en 11** (1, 21, 31, 101 → one;
  11, 111 → other); 0, 2–20 y decimales → other. Ver § 5.

## 2. Forma de escribir
- Islandés contemporáneo de interfaz (como la localización islandesa de Android/iOS y la terminología de Íðorðabankinn /
  Tölvuorðasafn). Purismo: palabra islandesa asentada antes que préstamo («tölva», «skjár», «stillingar», «tengill», «netfang»,
  «gervigreind»). Préstamos solo los de uso real (p. ej. «prófíll»).
- Þ þ, Ð ð, Æ æ, Ö ö y vocales con tilde (á é í ó ú ý) siempre; nunca transliteradas. NFC, UTF-8, LF.
- **Trato: «þú»** (tuteo), nunca «þér». Posesivos pospuestos al sustantivo con artículo («prófíllinn minn», «verkefnin mín»).
- **Botones y acciones: INFINITIVO sin «að»** («Vista», «Eyða», «Hætta við», «Loka», «Senda», «Deila», «Breyta», «Búa til»,
  «Skrá inn», «Reyna aftur»). Justificación: es la convención de Android, iOS y Windows en islandés, es neutra (no da órdenes) y
  evita las formas cliticizadas del imperativo («eyddu», «vistaðu»), largas e irregulares en un botón.
- **Frases dirigidas a la persona** (instrucciones, ayudas, errores con solución): imperativo de «þú» con clítico
  («Reyndu aftur.», «Veldu ástæðu», «Skrifaðu netfangið þitt», «Ýttu til að…»). Nunca se mezclan los dos en un mismo botón.
- Títulos y botones: mayúscula solo al principio, sin punto final. Mensajes completos con punto. Rótulos de sección en mayúsculas
  solo donde el español los pone en mayúsculas.
- **Objetivos (`…Goal`) y pasos del plan: INFINITIVO sin «að»**, como el español («Hanna vöru», «Búa til lag», «Skrifa handrit»),
  porque además de ir a Weë Brain son el título del trabajo y entran en «{{nombre}} lauk við „{{objetivo}}“». Solo donde el
  español ya pone un imperativo («Corrige este texto», «Explícame…») se conserva el imperativo de «þú».
- **Citas de rótulos**: cuando una frase cita un botón o una sección, el texto entre „…“ es el valor islandés EXACTO de esa clave
  (§ 4.2). Si el texto del botón cambia, cambia también la cita.
- Errores: «Ekki tókst að + infinitivo» («Ekki tókst að vista») para «No se pudo / No pudimos…»; «Ekki náðist samband við
  Weë» para «No se pudo conectar con Weë»; el estado breve «No salió (bien)» es «Tókst ekki».
- Vacíos: «Engar/Engin/Enginn + sustantivo» concordado («Engar færslur», «Engin samfélög», «Engin skilaboð»), o «… enn» para «todavía».
- Puntos suspensivos con el carácter «…» («Hleður…»).
- Comillas islandesas **„…“** (abre abajo, cierra arriba). Comillas internas ‚…‘.
- **Declinación alrededor de huecos y marcas.** El islandés declina los nombres; un hueco `{{nombre}}` o una marca no se pueden
  declinar. Estrategias, por orden de preferencia:
  1. poner el hueco en posición de nominativo (sujeto o tras dos puntos): «{{nombre}} byrjaði að fylgja þér», «Skipta um prófíl: {{perfil}}»;
  2. aposición tras un sustantivo puente que sí se declina: «Fara á svæðið {{nombre}}», «í forritinu Weë», «í samfélaginu {{nombre}}»;
  3. tras preposición que rige dativo/acusativo, solo con marcas de forma extranjera (Weë, WeeTalk) se acepta la forma invariable
     («í Weë», «með WeeTalk»), como se hace con nombres extranjeros en islandés.
  Nunca se añade desinencia a un hueco ni a una marca («Weës», «WeeTalkið» están prohibidos).
- Números: siempre por hueco/`Intl`; nunca escritos a mano.

## 3. Marcas (byte a byte, en latino, sin declinar)
Weë, WEE, WEË AI, Weë AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weë Business, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, **Credits (nunca
«inneignir» ni «einingar»)**, Filmmaker Engine, World Encode Entity.
- La marca no lleva artículo sufijado ni genitivo: el artículo va en la parte islandesa del compuesto («Weë-prófíllinn»);
  genitivo con sustantivo puente o reformulación («stillingar í Weë», no «Weës stillingar»).
- Compuesto con guion cuando la marca califica a un sustantivo islandés: «Weë-prófíll» (Perfil Weë). La marca queda intacta.
- «Credits» va siempre tras el número y no concuerda: «{{saldo}} Credits», «Þú átt {{saldo}} Credits».
- Lo que escribe una persona (publicaciones, nombres, prompts) no se traduce.

## 4. Glosario fijo (español → islandés)
Derivado de los textos reales de `i18n/textos/es/**` (app y `servidor/`). Verbos de botón en infinitivo; sustantivos en nominativo.
(P) = pendiente de confirmación nativa (§ 6).

| Español | Islandés |
|---|---|
| **Navegación y estructura** | |
| Inicio / Home | Heim |
| Buscar | Leita |
| Buscar… (campo) | Leita… |
| Crear | Búa til |
| Explora / Explorar | Kanna |
| Menú / Abrir menú | Valmynd / Opna valmynd |
| Sección actual | Núverandi hluti |
| Ir a… | Fara á / Fara í … |
| Volver | Til baka |
| Siguiente | Áfram |
| Ver todos / Ver todas | Sjá allt |
| Ver más | Sjá meira |
| Ver historial | Skoða feril |
| Vista general | Yfirlit |
| Resumen | Samantekt |
| Configuración / Ajustes (pantalla) | Stillingar |
| Ajustes (de una creación) | Stillingar |
| Preferencias | Kjörstillingar |
| Ayuda | Hjálp |
| Acerca de Weë | Um Weë |
| Preguntas frecuentes | Algengar spurningar |
| Contacto | Hafa samband |
| Información | Upplýsingar |
| Términos | Skilmálar |
| Términos de servicio | Þjónustuskilmálar |
| Privacidad | Persónuvernd |
| Política de privacidad | Persónuverndarstefna |
| Guardados | Vistað |
| Mis proyectos | Verkefnin mín |
| Mis creaciones | Sköpunarverkin mín |
| Mis documentos | Skjölin mín |
| Destacados / Destacado | Valið efni / Valið |
| Tendencias | Vinsælt núna |
| Temas populares | Vinsæl umræðuefni |
| Recientes | Nýjast |
| Más antiguas | Elst |
| Ordenar | Raða |
| Filtrar | Sía |
| Todo / Todas | Allt / Allar |
| Ejemplo: (placeholders) | Dæmi: |
| Especialista | Sérfræðingur |
| **Acciones (botones)** | |
| Cancelar | Hætta við |
| Guardar | Vista |
| Guardar ahora | Vista núna |
| Guardando… | Vistar… |
| Guardado | Vistað |
| Cambios sin guardar | Óvistaðar breytingar |
| Eliminar | Eyða |
| Quitar | Fjarlægja |
| Cerrar | Loka |
| Listo (botón) | Lokið |
| Aceptar (aviso) | Í lagi |
| Entendido | Ég skil |
| Enviar | Senda |
| Compartir | Deila |
| Reintentar (botón) | Reyna aftur |
| Inténtalo de nuevo (frase) | Reyndu aftur. |
| Editar | Breyta |
| Añadir / Agregar | Bæta við |
| Abrir | Opna |
| Continuar | Halda áfram |
| Empezar | Byrja |
| Subir (archivo) | Hlaða upp |
| Descargar | Sækja |
| Adjuntar | Hengja við |
| Copiar | Afrita |
| Pegar | Líma |
| Deshacer | Afturkalla |
| Rehacer | Endurtaka |
| Exportar | Flytja út |
| Importar | Flytja inn |
| Restablecer | Endurstilla |
| Recargar (pantalla) | Endurhlaða |
| Archivar | Setja í geymslu |
| Desarchivar | Taka úr geymslu |
| Cambiar nombre | Endurnefna |
| Reproducir | Spila |
| Pausar | Gera hlé |
| Grabar | Taka upp |
| Dictar | Lesa inn |
| Tomar foto / Hacer una foto | Taka mynd |
| Cambiar foto | Skipta um mynd |
| Permitir | Leyfa |
| Mostrar | Sýna |
| Ocultar | Fela |
| Cargar más | Hlaða fleiri |
| Marcar todas como leídas | Merkja allt sem lesið |
| Mejorar | Bæta |
| Corregir | Leiðrétta |
| Resumir | Draga saman |
| Traducir | Þýða |
| Acortar | Stytta |
| Alargar | Lengja |
| Analizar | Greina |
| Responder | Svara |
| Respondido | Svarað |
| Usar en proyecto | Nota í verkefni |
| 🤷 Sorpréndeme | 🤷 Komdu mér á óvart |
| 🤷 No sé | 🤷 Ég veit það ekki |
| No sé, ayúdame a elegir | Ég veit það ekki, hjálpaðu mér að velja |
| Quitar republicación | Fjarlægja endurbirtingu |
| Borrar (campo, búsqueda) | Hreinsa |
| Sembrar valores por defecto (admin) | Frumstilla |
| **Estados** | |
| Cargando… | Hleður… |
| Procesando / En proceso | Í vinnslu |
| Subiendo | Hleður upp |
| Próximamente | Væntanlegt |
| No disponible | Ekki tiltækt |
| Nuevo | Nýtt |
| Borrador | Drög |
| Sin título | Án titils |
| Activo | Virkur (concordado) |
| Archivada | Í geymslu |
| Lista para generar | Tilbúin til gerðar |
| Pendiente de integración | Bíður tengingar |
| Oficial | Opinbert |
| Público | Opinbert |
| ahora | núna |
| Hoy | Í dag |
| Ayer | Í gær |
| No salió / No salió bien (estado) | Tókst ekki |
| Listo (estado de una creación) | Tilbúið |
| **Social** | |
| Publicación / Post | Færsla |
| Publicaciones | Færslur |
| Publicar | Birta |
| Nueva publicación | Ný færsla |
| Publicado en Weë | Birt í Weë |
| Comentario | Athugasemd |
| Comentar | Skrifa athugasemd |
| Escribe un comentario… | Skrifaðu athugasemd… |
| Me gusta / Like (contador) | Líkar við (P) |
| Likes (pestaña del perfil) | Líkar við (P) |
| Nuevo like (push) | Nýtt „líkar við“ (P) |
| {{nombre}} le gustó / le dio like a tu publicación | {{nombre}} merkti færsluna þína með „líkar við“ (P; el verbo «líka við» pide sujeto en dativo y el hueco no se declina) |
| Republicar | Endurbirta |
| reposteó | endurbirti |
| Seguir | Fylgja |
| Siguiendo | Fylgist með |
| Seguidor / Seguidores | Fylgjandi / Fylgjendur |
| comenzó a seguirte | byrjaði að fylgja þér |
| te mencionó | minntist á þig (P) |
| Mencionar | Minnast á (P) |
| Mención / menciones | Tilvísun / tilvísanir (P; solo para la @-mención: «referencia» es «fyrirmynd») |
| Te mencionaron | Minnst var á þig |
| Comunidad / Comunidades | Samfélag / Samfélög |
| Crear comunidad | Stofna samfélag |
| Unirse | Ganga í |
| Salir (de comunidad) | Hætta í |
| Miembro / miembros | Meðlimur / meðlimir |
| Reglas de la comunidad | Reglur samfélagsins |
| Perfil | Prófíll (P) |
| Perfil Real | Raunprófíll (P) |
| Perfil Weë | Weë-prófíll |
| Perfil Real / Perfil Weë dentro de una frase | Siempre con mayúscula, como nombres propios: «í Raunprófílnum», «Weë-prófílinn» |
| Perfil principal | Aðalprófíll |
| Alter ego (del Perfil Weë) | Hliðarsjálf |
| Editar perfil | Breyta prófíl |
| Nombre de usuario | Notandanafn |
| Biografía | Um mig |
| Sitio web | Vefsíða |
| Portada | Forsíðumynd |
| Agregar portada | Bæta við forsíðumynd |
| Usuario / Usuarios | Notandi / Notendur |
| Usuario anónimo | Nafnlaus notandi |
| Invitado | Gestur |
| Alguien | Einhver |
| Tú | Þú |
| Mensaje / Mensajes | Skilaboð |
| Conversación | Samtal |
| Escribe un mensaje… | Skrifaðu skilaboð… |
| Chat | Spjall |
| Notificaciones | Tilkynningar |
| Notificaciones push | Ýtitilkynningar |
| No leídas | Ólesið |
| Encuesta | Könnun |
| Voto | Atkvæði |
| Votaste | Þú kaust |
| Encuesta finalizada | Könnun lokið |
| Pregunta / Respuesta | Spurning / Svar |
| Historias | Sögur |
| Etiqueta | Merki |
| Hashtag | Myllumerki |
| Foto única | Mynd sem hverfur |
| Ver una sola vez | Skoða einu sinni |
| Modo efímero | Hverfult spjall (P) |
| Tema (chat) | Þema |
| Muro (Wäll) | Wäll-veggurinn (sustantivo puente) |
| Opción (encuesta) | Valkostur |
| Solicitud (ËContact) | Beiðni |
| Conexión (ËContact) | Tenging |
| Contacto de ËContact / ËContacts | ËContact-tengiliður / ËContact-tengiliðir |
| Lugar (etiquetado en una publicación) | Staður |
| Watermark / marca de agua | Vatnsmerki |
| Calificación (reseña) | Einkunn |
| Consultar (precio) | Verð eftir samkomulagi |
| Fondo | Bakgrunnur |
| Visibilidad | Sýnileiki |
| Reseña / Reseñas | Umsögn / Umsagnir |
| Cómo lo hice | Svona gerði ég þetta |
| Creado con | Gert með |
| Calendario de publicaciones | Birtingadagatal |
| **Creación e IA** | |
| Inteligencia artificial / IA | Gervigreind (sigla GG solo si falta espacio) |
| Generar | Búa til (botón); framleiða (técnico) |
| Creación / Creaciones | Sköpunarverk |
| Imagen / Imágenes | Mynd / Myndir |
| Foto | Ljósmynd / mynd |
| Vídeo / Videos | Myndband / Myndbönd |
| Audio | Hljóð |
| Texto | Texti |
| Documento | Skjal |
| 3D | Þrívídd |
| Modelo 3D | Þrívíddarlíkan |
| Prompt | Fyrirmæli (P) |
| Copiar prompt | Afrita fyrirmæli |
| Mostrar / Ocultar prompt | Sýna fyrirmæli / Fela fyrirmæli |
| Tu idea | Hugmyndin þín |
| Referencia / Referencias | Fyrirmynd / Fyrirmyndir |
| Proyecto | Verkefni |
| Resultado (de una creación) | Útkoma |
| Resultados (de una búsqueda) | Niðurstöður |
| Resultados (de un negocio) | Árangur |
| Objetivo (`…Goal`) | Infinitivo sin «að», como el español (§ 2) |
| Avatar | Myndgervingur (P; pl. myndgervingar; ac. myndgerving, dat. myndgervingi; nunca el préstamo «avatar») |
| Avatar Weë | Weë-myndgervingur |
| Logo / logos | Merki (neutro, invariable en plural; nunca «lógó») |
| Marca (comercial) | Vörumerki |
| Render | Þrívíddarmynd / raunsæ mynd |
| Face swap | Andlitsskipti (P) |
| Espacio (Weë Home) | Rými |
| Plantilla | Sniðmát |
| Estilo | Stíll |
| Variaciones | Útgáfur |
| Calidad | Gæði |
| Alta / Estándar (calidad) | Mikil / Venjuleg |
| Resolución | Upplausn |
| Formato | Snið |
| Proporción | Hlutföll |
| Cuadrado / Vertical / Horizontal | Ferningur / Lóðrétt / Lárétt |
| Duración / Longitud | Lengd |
| Tono | Tónn |
| Movimiento | Hreyfing |
| Automático | Sjálfvirkt |
| Realista | Raunsætt |
| Ilustración | Teikning |
| Minimalista | Naumhyggja |
| Escena | Atriði |
| Varias escenas | Mörg atriði |
| Plano (cine) | Skot (P) |
| Primer plano / Primerísimo plano | Nærmynd / Ofurnærmynd |
| Lente / óptica | Linsa |
| Storyboard | Söguborð |
| Vestuario | Búningar |
| Diálogo | Samræða |
| Efectos de sonido | Hljóðbrellur |
| Ambiente (sonido) | Umhverfishljóð |
| Línea de tiempo | Tímalína |
| Toma | Taka |
| Guion | Handrit |
| Personaje | Persóna |
| Narrador | Sögumaður |
| Director | Leikstjóri |
| Producción | Framleiðsla |
| Subtítulos | Skjátextar |
| Efectos | Brellur |
| Quitar el fondo | Fjarlægja bakgrunn |
| Antes y después | Fyrir og eftir |
| Voz | Rödd |
| Música | Tónlist |
| Canción | Lag |
| Letra | Söngtexti |
| Instrumental | Hljóðfæraleikur |
| Pistas separadas | Aðskildar rásir |
| Tonalidad | Tóntegund |
| Mezclar y masterizar | Hljóðblanda og fullvinna (P) |
| Ecualizador | Tónjafnari |
| Verso / Preestribillo / Estribillo | Erindi / Forviðlag / Viðlag |
| Puente / Interludio | Brú / Millikafli |
| Intro / Outro | Inngangur / Lokakafli |
| Tempo | Hraði |
| Cover | Ábreiða |
| Sintetizador | Hljóðgervill |
| Beat | Taktur (P) |
| Jingle | Auglýsingastef |
| Receta / Recetas | Uppskrift / Uppskriftir |
| Ingrediente | Hráefni |
| Lista de compras | Innkaupalisti |
| Por porción | Í hverjum skammti |
| Sin gluten / Sin lactosa / Sin azúcar | Glútenlaust / Laktósalaust / Sykurlaust |
| Vegetariano / Vegano | Grænmetisfæði / Vegan |
| Alérgenos | Ofnæmisvaldar |
| Viaje | Ferð |
| Planificar un viaje | Skipuleggja ferð |
| Diseño / Diseñar | Hönnun / Hanna |
| Interiores | Innanhússhönnun |
| Arquitectura | Arkitektúr |
| Mobiliario | Húsgögn |
| Moda | Tíska |
| Prenda | Flík |
| Look | Útlit |
| Outfit | Klæðnaður |
| Portada (de un libro) | Kápa |
| CV | Ferilskrá |
| Maquillaje | Förðun |
| Cabello | Hár |
| Negocio | Fyrirtæki |
| Producto / Productos | Vara / Vörur |
| Marketing | Markaðssetning |
| Redes sociales | Samfélagsmiðlar |
| Red social (una) | Samfélagsmiðill |
| Emprendimiento | Sprotafyrirtæki |
| Cliente | Viðskiptavinur |
| Weë Brain está pensando… | Weë Brain er að hugsa… |
| ¿Qué quieres crear hoy? | Hvað viltu búa til í dag? |
| Motor / Engine (en prosa) | Vél |
| Fallback (motor) | Varaleið (P) |
| Salud (de un proveedor) | Ástand |
| Weë versión creator / versión app | Weë – skapendaútgáfa / Weë – appútgáfa (P) |
| **Cuenta, Credits y billetera** | |
| Cuenta | Aðgangur |
| Crear cuenta | Stofna aðgang |
| Iniciar sesión | Skrá inn |
| Cerrar sesión | Skrá út |
| Regístrate | Skráðu þig |
| Email (dirección) | Netfang |
| Contraseña | Lykilorð |
| ¿Olvidaste tu contraseña? | Gleymdirðu lykilorðinu? |
| Continuar con Google | Halda áfram með Google |
| Entrar como invitado | Halda áfram sem gestur |
| Bienvenido a Weë | Velkomin í Weë (P) |
| Credits | Credits (marca) |
| Saldo | Inneign |
| Tu saldo | Inneignin þín |
| Recargar | Fylla á |
| Recarga | Áfylling |
| Recarga de prueba | Prufuáfylling |
| Billetera | Veski |
| Historial | Ferill |
| Compra | Kaup |
| Reembolso | Endurgreiðsla |
| Reembolsado | Endurgreitt |
| Gratis | Ókeypis |
| Coste por confirmar | Kostnaður óstaðfestur |
| Precio | Verð |
| Obtener Credits | Fá Credits |
| Mejor valor | Besta verðið |
| Credits disponibles | Credits til ráðstöfunar |
| Te quedan {{saldo}} | Þú átt {{saldo}} eftir |
| Coste / Costo | Kostnaður |
| Sin coste / Sin costo | Enginn kostnaður |
| No tienes suficientes Credits | Þú átt ekki nóg af Credits |
| **Errores, validación y vacíos** | |
| Error | Villa |
| Algo salió mal | Eitthvað fór úrskeiðis |
| No se pudo… / No pudimos… | Ekki tókst að… |
| Sin resultados | Engar niðurstöður |
| No hay conexión | Engin nettenging |
| No se pudo conectar con Weë | Ekki náðist samband við Weë |
| Este contenido ya no está disponible | Þetta efni er ekki lengur tiltækt |
| Email inválido | Ógilt netfang |
| Contraseña incorrecta | Rangt lykilorð |
| Las contraseñas no coinciden | Lykilorðin stemma ekki |
| Mínimo 6 caracteres | Að minnsta kosti 6 stafir |
| caracteres / palabras | stafir / orð |
| Permiso requerido | Heimild krafist |
| Permisos | Heimildir |
| Todavía no tienes… | Þú átt engin … enn |
| Sé el primero en… | Vertu fyrst til að… (P) |
| ¿Estás seguro? | Ertu viss? |
| Ups | Úbbs |
| **Moderación y seguridad** | |
| Denunciar | Tilkynna |
| Reporte | Tilkynning |
| Enviar reporte | Senda tilkynningu |
| Motivo | Ástæða |
| Spam | Ruslefni |
| Acoso o intimidación | Áreitni eða einelti |
| Odio o discriminación | Hatur eða mismunun |
| Contenido sexual | Kynferðislegt efni |
| Violencia | Ofbeldi |
| Estafa o fraude | Svindl eða svik |
| Suplantación de identidad | Að villa á sér heimildir (P) |
| Contenido ilegal | Ólöglegt efni |
| Autolesiones o suicidio | Sjálfsskaði eða sjálfsvíg |
| Bloquear | Loka á |
| Silenciar | Þagga niður í |
| **Ajustes, privacidad y ubicación** | |
| Idioma | Tungumál |
| Tema | Þema |
| Oscuro / Claro | Dökkt / Ljóst |
| Ubicación | Staðsetning |
| Zona aproximada | Áætlað svæði |
| Quitar mi ubicación | Fjarlægja staðsetninguna mína |
| País | Land |
| Cámara | Myndavél |
| Galería | Myndasafn |
| Micrófono | Hljóðnemi |
| Enlace | Tengill |
| Archivo | Skrá |
| Respuestas privadas | Einkasvör |

### 4.1 Unificaciones de la pasada de coherencia (2026-11-03)
Los cinco agentes de la etapa 2 tradujeron en paralelo y algunos conceptos salieron con dos formas. Se eligió una (la que fija
la guía o, si no la fijaba, la palabra islandesa más asentada) y se aplicó en todos los módulos:

| Concepto | Antes | Ahora | Módulos tocados |
|---|---|---|---|
| Avatar | «avatar» (préstamo, `aiAvatar`), «Weë-prófílmynd» / «gervigreindarmynd» / «mynd» (`servidor/movimientos`, `weeai`) frente a «myndgervingur» (`avatar`, `onboarding`, `profile`, `help`) | **myndgervingur** (P) | `aiAvatar` (24), `servidor/movimientos` (2), `weeai` (4) |
| Logo | «lógó» (`business`, `weebiz`, `servidor/opciones`, `servidor/plan/visual`) frente a «merki» (`catalogo`, `creator`, `weeai`, `help`, `projects`) | **merki** | `business` (1), `weebiz` (2), `servidor/opciones` (1), `servidor/plan/visual` (3) |
| Objetivos `…Goal` | imperativo «Hannaðu vöru», «Búðu til lag» (`catalogo`, `writer`) frente a infinitivo (`business`, `servidor/objetivos`) | **infinitivo** «Hanna vöru», «Búa til lag» (§ 2) | `catalogo` (68 + 1 chip), `writer` (7) |
| Referencia | «tilvísun» en tres errores de `filmmaker` frente a «fyrirmynd» en el resto | **fyrirmynd**; «tilvísun» queda solo para la @-mención | `filmmaker` (3) |
| Like en la notificación | «lét sér líka við» (`servidor/avisos`) frente a «merkti … með „líkar við“» (`notifications`) | **merkti færsluna þína með „líkar við“** | `servidor/avisos` (1) |
| Perfil Real dentro de frase | «raunprófílnum», «raunprófílinn», «raunprófíl» en minúscula | **Raunprófíll** con mayúscula, como nombre propio | `creaciones`, `econtact`, `help` (3) |
| Resultado de una creación | «niðurstaða» en `aiAvatar` | **útkoma** (búsqueda = niðurstöður; negocio = árangur) | `aiAvatar` (2) |
| Credits disponibles | «Tiltæk Credits» (`aiAvatar`) | **Credits til ráðstöfunar** | `aiAvatar` (1) |
| Sin coste | «Án kostnaðar» (`weeai`) frente a «Enginn kostnaður» (`music`) | **Enginn kostnaður** | `weeai` (1) |
| Quitar republicación | «Hætta við endurbirtingu» frente a «Fjarlægja endurbirtinguna» (las dos en `wall`) | **Fjarlægja endurbirtingu** (Quitar = Fjarlægja) | `wall` (1) |

Comprobado y ya coherente, sin cambios: botones (Vista, Eyða, Deila, Birta, Búa til, Sækja, Loka, Breyta, Reyna aftur, Til baka;
ningún botón en imperativo), «færsla», «fyrirmæli», «Credits» (nunca traducido ni declinado), «Weë-prófíll», «sköpunarverk»,
«Ekki tókst að…», los vacíos «Engar/Engin/Enginn … (enn)», las comillas „…“ (ninguna comilla recta ni «» en los valores) y los
nombres de menú y secciones (Heim, Leita, Vistað, Verkefnin mín, Sköpunarverkin mín, Tilkynningar, Stillingar, Hjálp).

### 4.2 Citas de rótulos comprobadas
Toda frase que cita entre „…“ un botón o una sección se comparó con el valor islandés de esa clave:

| Frase | Cita | Clave citada | Estado |
|---|---|---|---|
| `help.a3_*` | „Ég veit það ekki“ | `servidor/opciones.*Idk` («🤷 Ég veit það ekki»), `music.idk` | coincide |
| `help.a5` | „Vista í verkefni“ | `weeai.saveToProject` | coincide |
| `projects.introText` | „{{accion}}“ | `weeai.saveToProject` (se inyecta en tiempo de ejecución) | coincide por construcción |
| `help.a6` | „Weël“ | `composer.kindWeel` | coincide |
| `help.q9` | „Svona gerði ég þetta“ | `wall.howIMadeIt` («SVONA GERÐI ÉG ÞETTA», en mayúsculas por diseño) | coincide |
| `help.a9` | „Afrita fyrirmæli“ | `wall.copyPrompt` | coincide |
| `music.brainNotice` | „Ég veit það ekki, hjálpaðu mér að velja“ | `music.helpMe` / `music.helpMeButton` | coincide |
| `creaciones.progressFindLater`, `filmmaker.take*`, `studio.worldIntro` | „Sköpunarverkin mín“ | `creaciones.title`, `weeai.myCreations` | coincide |
| `filmmaker.emptyListText` | Myndbönd · „Mörg atriði“ | `studio.videosTitle`, `studio.xpMultiScene` | coincide |
| `weetalk.noConversationsHint` | „Einka“ → **„Senda með WeeTalk“** | `wall.sendByWeeTalk` | **corregido** (ver § 6) |

## 5. Plurales
- Solo `_one` y `_other`, con el hueco del español (`{{contador}}`; `common.postsCount_*` usa `{{cantidad}}` y se respeta).
- `_one` se aplicará también a 21, 31, 101…: la forma `_one` debe ser correcta con esos números. En islandés lo es (los números
  terminados en 1, salvo 11, concuerdan en singular: «21 færsla»), así que `_one` = singular y `_other` = plural.
- Nunca se escribe «1» a mano ni se omite el hueco en `_one`.
- Adjetivos y participios concuerdan en género con el sustantivo contado.

## 6. Términos pendientes de confirmación nativa
- **Prófíll** (perfil): préstamo muy extendido; la forma purista es «notandasnið/notandasíða». Elegido por brevedad y porque forma
  bien «Raunprófíll / Weë-prófíll».
- **Raunprófíll** (Perfil Real): neologismo; alternativa «Eigin prófíll».
- **Fyrirmæli** (prompt): hay quien usa el préstamo «prompt» o «kvaðning»; elegido «fyrirmæli» (purista y transparente).
- **Líkar við** como contador de «like»; en el habla «læk». Falta decidir la forma exacta del contador.
- **Skot** (plano cinematográfico) frente a «myndskeið»; «Taka» (toma) es firme.
- **Minnast á** para mención (@).
- **Hverfult spjall** (modo efímero).
- **Hljóðblanda og fullvinna** (mezclar y masterizar); el gremio dice a menudo «mastera».
- **Að villa á sér heimildir** (suplantación): largo para un rótulo; alternativa «Fölsk auðkenni».
- **Velkomin í Weë** y **Vertu fyrst til að…**: el islandés marca género (velkominn/velkomin, fyrstur/fyrst); se usa la forma sin
  «(n)/(ur)» siguiendo la práctica reciente de lenguaje inclusivo; confirmar.
- **Leiðsögn um Weë** (navegación de Weë, etiqueta de accesibilidad).
- **Fara á svæðið {{nombre}}** (aposición para no declinar el nombre de sección).
- **Í lagi** como botón OK (estándar de iOS/Android en islandés; confirmar frente a «OK»).
- **Weë – samfélag framtíðarinnar** (`nav.documentTitle`): traducción provisional; una decisión posterior lo sustituirá por el
  eslogan corporativo sin traducir.

Añadidos en la pasada de coherencia (2026-11-03):
- **Myndgervingur** (avatar): forma purista; el préstamo «avatar» (masc., «avatarinn») es muy oral y fue lo que usó un grupo de
  módulos. Se unificó en «myndgervingur» por el criterio de purismo del § 2; si la revisión nativa prefiere «avatar» o
  «prófílmynd», el cambio es mecánico (unas 40 cadenas en `aiAvatar`, `avatar`, `onboarding`, `profile`, `help`, `weeai`,
  `servidor/movimientos`). Las construcciones «sem myndgerving» (acusativo tras «nota/hlaða upp mynd sem») piden confirmación.
- **Merki** (logo): elegido frente a «lógó»; coincide con «Merki» = etiqueta y con «vatnsmerki/myllumerki». En contexto
  («merki fyrir vörumerkið mitt», «Bæta við merki» en el negocio) se entiende, pero una persona nativa debería confirmar que no
  confunde; alternativas: «kennimerki», «firmamerki», «lógó».
- **Objetivos en infinitivo**: la etapa 2 los había puesto en imperativo en `catalogo` y `writer` («la voz de la persona»); se
  unificaron con el español, `business` y `servidor/objetivos`. Confirmar que «Hanna vöru» se lee natural en la burbuja de la persona.
- **Tilvísun** (mención @ como sustantivo: «Fjarlægja tilvísunina»): «tilvísun» es sobre todo «referencia/cita». Alternativas: un
  giro con «minnast á».
- **„Líkar við“** dentro de frase («merkti færsluna þína með „líkar við“», «Nýtt „líkar við“»): rodeo para no poner el hueco en
  dativo; en el habla se dice «læk» / «lækaði». Pendiente junto con el contador.
- **Taktur** (beat), **Andlitsskipti** (face swap), **Varaleið** (fallback), **Weë – skapendaútgáfa / appútgáfa** (versión creator /
  app) y **Weë-myndgervingur** (Avatar Weë).
- **`weetalk.noConversationsHint` se aparta del español a propósito.** El español dice «Toca "Privado" en cualquier publicación…»,
  pero hoy no existe ningún botón «Privado»: la conversación se abre desde el ⋯ de la publicación con `wall.sendByWeeTalk`
  («Enviar por WeeTalk»). El islandés cita ese botón real («Ýttu á „Senda með WeeTalk“ við hvaða færslu sem er…»). El texto español
  (y el de los demás idiomas) cita un rótulo que no existe: hay que corregirlo en el origen; no es tarea de este diccionario.

### 6.x Integración en la migración de la UI (2026-11-05, wt-ui-migracion)
434 claves nuevas traducidas por un agente de IA al integrar el islandés con la migración de la demo YC, **sin revisión nativa**:
`pages` (111, Páginas/WeëPages), `fashion` (129, Weë Fashion), `boost` (106), `weeai` (18, portada de Weë Travel), `wall` (14),
`credits` (13, compra por importe), `music` (13), `design` (11), `studio` (8), `chef` (7), `servidor/movimientos` (3, Boost),
`menu` (1). Retirados: `weebiz` y `credits.pkgBasic` / `badgePopular` / `badgeBestValue`. Términos a confirmar (P):
«síða» (Página), «auka útbreiðslu» / «kynna» / «kynning» (Boost, impulsar, promoción), «kostað» (promocionado), «taka frá»
(reservar Credits), «máta» / «sýndarmátun» (probar ropa), «stemningstafla» (moodboard), «lokavinna» (masterizar), «sýnishorn» (demo).
Los 843 textos críticos están en `docs/i18n/revision-nativa/is.csv`.

## 7. Estado de validación
- **Técnica (etapa 1):** `node scripts/i18n-validar-modulo.mjs is common nav menu` → 3 módulos, **0 errores**, 7 avisos.
- **Técnica (tras la pasada de coherencia, 2026-11-03):** `node scripts/i18n-validar-modulo.mjs is` → **54 módulos, 0 errores,
  51 avisos**, todos cadenas idénticas al español/inglés por diseño: marcas de Weë (Credits, ËContact, Weëls, WeeTalk, Weë AI,
  WEË AI, Weë AI Engine, Weël, Beauty/Fashion/Writer como entradas de la familia de marca), nombres de producto de Weë Business
  que el español deja en inglés (Business Plan, Brand Kit, SWOT…), marcas de terceros (TikTok, YouTube, Instagram, Facebook,
  WhatsApp), «MIDI», «Reggaeton», «Vegan», platos («Pasta carbonara», «Lomo saltado»), «Drama», «3D World» y huecos sin texto
  («{{salida}} – {{regreso}}», «{{credits}} Credits»). Sin tsc (prohibido en esta tanda). `index.ts` del idioma, `idiomas.ts`,
  `diccionarios.ts` y la huella los escribe el integrador.
- **Lingüística:** NO hecha. Ninguna persona nativa ha revisado este texto: todo es traducción de agente.
- **Visual:** pendiente (el islandés alarga los botones compuestos, p. ej. «Hætta við»).
