# I18N-TURCO — el turco de Weë (`tr` / `tr-TR`)

> Guía de estilo y glosario para quien escriba, revise o amplíe el turco de Weë: hoy y cuando lleguen módulos nuevos
> (Filmmaker, 3D, Weë Music, Weë Travel, Weë Inspira…). La arquitectura común está en [`I18N.md`](I18N.md); aquí solo
> lo que es del turco. Las decisiones se tomaron con fuentes (lista al final) y, donde las fuentes no coinciden, dicen
> qué se eligió, qué se descartó y por qué.
>
> Lo que esta guía pide lo comprueba `functions/test/i18n-turco.test.mjs`. Lo que no se puede comprobar con una
> prueba —naturalidad, tono, contexto— es trabajo de quien escribe y de quien revisa.

## 0. Lo esencial

1. **No se traduce del español palabra a palabra.** Se entiende qué hace la cadena —un botón, un error, una etiqueta
   para el lector de pantalla, un estado vacío— y se escribe lo que escribiría una app turca de consumo.
2. **Se tutea: «sen», en toda la app.** Botones en imperativo desnudo (`Kaydet`, `Paylaş`, `Sil`).
3. **Mayúscula solo al principio** (`Profili düzenle`, `Ana sayfa`) y en los nombres propios.
4. **Las letras turcas siempre**: ç ğ ı İ ö ş ü. La mayúscula de «i» es «İ» (`İptal`, `İndir`); la minúscula de «I»
   es «ı».
5. **Ningún sufijo pegado a un `{{hueco}}`.** Su vocal depende de una palabra que no se conoce: se reescribe la frase.
6. **Las marcas de Weë, intactas.** Si llevan sufijo, con apóstrofo y solo la forma de la tabla del § 9.
7. **`%60`**, con el signo delante; y tras una cifra el sustantivo va en singular: `3 gönderi`.
8. **Consistencia:** un concepto, una palabra, la del glosario (§ 10).

## 1. Idioma, locale y lo que ya resuelve la arquitectura

| | |
|---|---|
| Idioma | `tr`, diccionario en `i18n/textos/tr/` |
| Locale principal | `tr-TR` (en `LOCALES_CONTEMPLADOS`) |
| Variantes | Ninguna |
| Respaldo | `tr-TR` → `tr` → `en`, clave a clave |
| Plural | `Intl.PluralRules('tr')`: `one` y `other`; en la práctica las dos formas dicen lo mismo (§ 6) |
| Formatos | `Intl` con el locale: `30 Eylül 2026`, `14:05`, `1.234.567,89`, `₺1.500,00`, `%60`, `3 gün önce`, `A, B ve C` |
| Web | `<html lang="tr">`, lo escribe `IdiomaContext`; con él, `text-transform` del navegador sigue las reglas turcas |
| Pantalla de error | Su fila `tr` en `components/ErrorBoundary.tsx` |
| Mayúsculas y búsqueda | `i18n/caja.ts`: `conMayusculaInicial(texto, locale)` y `paraBuscar(texto)` |

**Los formatos no se escriben a mano.** Fechas, horas, números, monedas, porcentajes, listas, tiempo relativo y
distancias salen de `i18n/formato.ts` (o de `useIdioma().formato`).

**Nada se pasa a mayúsculas o minúsculas sin locale.** `'istanbul'.toUpperCase()` da `ISTANBUL` e
`'İstanbul'.toLowerCase()` da `i̇stanbul` con un punto suelto. Con `toLocaleUpperCase(locale)` sale `İSTANBUL`. Para
buscar, `paraBuscar` trata i, ı, İ e I como una sola letra: «ibrahim» encuentra a «İbrahim». Lo vigila la prueba
turca (36), que solo admite los usos sin locale de una lista cerrada —extensiones, slugs, campos guardados—. En la app
nativa, `textTransform: 'uppercase'` de React Native no conoce el locale en iOS («STIL» en vez de «STİL»), así que los
rótulos en mayúsculas del diseño se pintan con `components/TextoEnMayusculas.tsx`, que usa `toLocaleUpperCase`; la
prueba (36c) no deja volver el estilo. En el diccionario, cada cadena se escribe con su caja normal.

## 2. Tono y registro

**«Sen» en toda la interfaz**, también en errores, avisos y textos legales cortos de la app. Es lo que hacen Instagram,
Facebook y Spotify (`Şifreni mi unuttun?`, `Hesabın yok mu?`, `Tekrar hoş geldin`), lo que pide el español de Weë,
que tutea, y lo que admite Microsoft para un público joven. Nunca se mezclan: una app que dice `Şifrenizi mi
unuttunuz?` en una pantalla y `Hesabın yok mu?` en la de al lado (TikTok web) da sensación de descuido. [MS §4.1.13]
[IG] [FB] [SPOT]

| Tipo de cadena | Forma | Ejemplo |
|---|---|---|
| Botón, acción de menú | Imperativo desnudo, corto | `Kaydet`, `Paylaş`, `Sil`, `Devam et`, `Yeniden dene` |
| Título de pantalla o sección | Sintagma nominal, sin punto | `Ayarlar`, `Profili düzenle`, `Bildirimler` |
| Instrucción | Imperativo de «sen», amable, sin `lütfen` de relleno | `Göndermek için bir fotoğraf seç.` |
| Mensaje informativo | Frase completa con punto | `Değişikliklerin kaydedildi.` |
| Error | Qué pasó + qué hacer; sin culpar | `Gönderi paylaşılamadı. Bağlantını kontrol edip yeniden dene.` |
| Advertencia / confirmación | Pregunta directa con `mi` separado | `Bu gönderi silinsin mi?` · `Emin misin?` |
| Estado vacío | Qué falta + invitación, sin exclamaciones de más | `Henüz gönderi yok. İlk paylaşan sen ol.` |
| Etiqueta del lector de pantalla | Qué es o qué hace, sin «düğmesi» (el rol ya lo dice) | `Menüyü aç` |
| Weë Brain, conversación | Cercano, frases cortas, «sen» | `Harika! Nereye gitmek istersin?` |

- **`lütfen` solo cuando se pide algo que molesta** (esperar, volver a intentarlo tras un fallo nuestro); no en cada
  instrucción. [MS §4.1.14]
- **Disculpa:** `maalesef`; `özür dileriz` solo si es grave. Nunca `üzgünüz`, que es un calco del inglés. [MS §2.1.2]
- **Menos exclamaciones que el inglés.** Una bienvenida sí; un error no.
- **El imperativo de «siz» con -ınız (`yapınız`) suena a orden de ventanilla**: no aparece nunca. [MS §4.1.16]
- **Las casillas se escriben como si hablara la persona** («…imzamı ekle»), igual que en Microsoft. [MS §4.1.13]

## 3. Escritura

- **Mayúscula tipo frase** en botones, títulos, pestañas y menús: `Profili düzenle`, `Ana sayfa`, `Yeni mesaj`. Apple
  y Netflix capitalizan cada palabra, Instagram mezcla las dos cosas en la misma pantalla; Mozilla, Microsoft y
  Android usan la mayúscula de frase, que es también la del español de Weë. [MOZ] [MS §4.1.5] [AOSP]
- **Nunca TODO EN MAYÚSCULAS** para dar énfasis: no es costumbre turca y rompe la i. [MS §4.1.5]
- **Circunflejo según la TDK**: `yapay zekâ`, `şikâyet`, `hikâye`, `hâlâ` (todavía; `hala` es la tía), `kâr`
  (beneficio; `kar` es la nieve), `dükkân`, `kâğıt`. Apple y los documentos del Estado lo escriben; Google, Meta y
  Microsoft lo quitan. Weë sigue la norma, y la sigue siempre. [TDK-düzeltme] [TDK-GTS] [APPLE]
- **`de/da` conjunción, separada** y sin apóstrofo: `Sen de katıl`. **`ki`, separado** salvo en las formas fijas
  (`belki`, `çünkü`, `sanki`…). **La partícula `mi`, separada** y con su armonía: `Emin misin?`, `Silinsin mi?`.
  [TDK-de] [TDK-ki] [TDK-mi]
- **Préstamos comunes, sin apóstrofo**: `promptu kopyala`, `videolar`. El apóstrofo es de los nombres propios.
- **`Ana sayfa`** en dos palabras, como escribe la TDK los compuestos con `ana`. [TDK]

## 4. Sufijos: la regla que más se rompe

El turco pega las terminaciones y las hace concordar con la última vocal y la última consonante de la palabra. Eso
funciona con palabras conocidas y **falla con lo que no se conoce al traducir**. Instagram, X y OpenAI lo tienen mal
hoy en producción (`instagram'in`, `X'daki`, `ChatGPT’te` junto a `ChatGPT'de`). [INVESTIGACIÓN § 5]

**Ningún sufijo pegado a un `{{hueco}}`.** Ni `{{nombre}}'in`, ni `{{topluluk}}'ta`, ni `{{contador}}'ü`. La frase se
reescribe con uno de estos patrones (Microsoft § 5.5.2; Mozilla Türkiye; así lo hace Firefox):

| Patrón | Ejemplo |
|---|---|
| El hueco como sujeto | `{{nombre}} seni ËContact listesine ekledi` · `{{nombre}} yeniden paylaştı` |
| Un sustantivo detrás que lleva el sufijo | `{{nombre}} adlı kullanıcının gönderisi` · `{{nombre}} topluluğuna katıldın` · `{{archivo}} dosyası yüklenemedi` |
| Etiqueta | `Paylaşan: {{nombre}}` · `Başlangıç: {{hora}}` |
| Cifras sin sufijo | `{{contador}} gönderi` · `{{contador}} kişi beğendi` |
| Fechas | `{{fecha}} tarihinde` · `Katılım: {{fecha}}` |
| Citas | `“{{busqueda}}” için sonuç yok` (tras las comillas de cierre no va apóstrofo) |

## 5. Puntuación

- **Apóstrofo recto `'`** entre el nombre propio y su sufijo: `Weë'de`, `WeeTalk'ta`. Es el de Google, Meta, Microsoft
  y el de los ejemplos de la TDK, y el que escribe la gente al buscar. [TDK-kesme]
- **Comillas tipográficas `“…”`** para citar lo que la persona escribió o el nombre de un botón. Tras las de cierre, el
  sufijo va sin apóstrofo. [TDK-noktalama]
- **`…`, un solo carácter**, sin espacio delante: `Yükleniyor…`. [MOZ] [APPLE]
- **Dos puntos** donde el inglés pondría un guion largo; el guion largo no se usa en frases. `&` se escribe `ve`.
  [MS §4.1.15]

## 6. Números, fechas, horas, dinero y unidades

- **Todo lo que `Intl` sabe hacer lo hace `Intl`**: `30 Eylül 2026`, `30.09.2026`, `14:05`, `1.234.567,89`,
  `₺1.500,00`, `%60`, `3 gün önce`, `dün`, `A, B ve C`, `5 km`. La TDK prescribe `14.05` para la hora; Weë usa lo que
  da `Intl` (`14:05`), que es lo que ve la gente en su teléfono. [CLDR 48] [TDK-SSS]
- **El porcentaje va delante y sin espacio**: `%60`, `%{{descuento}} indirim`. Nunca `60%`. [TDK] [CLDR]
- **Compacto**: `1,3 B` es 1 300 (`B` = bin, mil), `2,5 Mn` millones, `2,5 Mr` miles de millones. Lo escribe `Intl`.
- **Tras una cifra, singular**: `3 gönderi`, `12 kişi`, `5 Credits`. `_one` y `_other` dicen lo mismo salvo que el
  español escriba el uno sin cifra y el turco quiera `Bir yanıt`. [MS §5.5] [GNOME]
- **Números con sufijo** (si alguna vez hace falta, nunca tras un hueco): `2026'da`, `8'inci`. [TDK-sayı]
- **Ordinales con punto**: `{{numero}}. öneri`, `2. fotoğraf` (la forma corta de la TDK, que no necesita sufijo).
- **La duración de un viaje, las noches primero**: `10 gece 11 gün`, como anuncian los viajes en turco. Un rango de
  fechas, sin preposiciones: `12–18 Ekim 2026`, `12 Ekim 2026 – 2 Kasım 2026`.

## 7. Longitud

Medido sobre 598 cadenas de iOS 26: el turco ocupa **0,89 veces el español** en conjunto (percentil 90: 1,15), pero
sus palabras son largas (6,8 caracteres de media) y **no se parten**: `kaydedebilirsin`, `etkinleştirebilirsin`. El
riesgo no es el total sino UNA palabra larga en un botón o una pestaña.

- Botones, pestañas y chips: la forma más corta natural (`Paylaş`, no `Paylaşımı yap`).
- Sin abreviar títulos ni nombres de producto. [MS §4.1.1]
- «Sen» ayuda: `kaydedebilirsin` son dos letras menos que `kaydedebilirsiniz`.

## 8. Patrones de interfaz

| Situación | Patrón |
|---|---|
| Cargando | `Yükleniyor…`, `Kaydediliyor…`, `Oluşturuluyor…` |
| Hecho | `Kaydedildi`, `Paylaşıldı`, `Kopyalandı` |
| Falló | `… yapılamadı. Yeniden dene.` / `Bir sorun oluştu.` |
| Sin conexión | `İnternet bağlantını kontrol et.` |
| Confirmar borrado | `… silinsin mi?` + `Sil` / `İptal` |
| Sin resultados | `Sonuç yok` / `“{{busqueda}}” için sonuç yok` |
| Estado vacío | `Henüz … yok.` + invitación en «sen» |
| Buscar (placeholder) | `… ara` (`Kişi ara`, `Topluluk ara`) |
| Contador | `{{contador}} gönderi` |

## 9. Las marcas

`Weë` · `Weë AI` · `Weë Studio` · `Weë Design` · `Weë Photo` · `Weë Writer` · `Weë Music` · `Weë Beauty` · `Weë Chef` ·
`Weë Home` · `Weë Business` · `Weë Travel` · `Weë Brain` · `Weë Inspira` · `Weë Credits` · `Credits` · `Weëls` ·
`Wäll` · `WeeTalk` · `ËContact` · `ẄContact`

**Ni se traducen, ni se adaptan, ni se pluralizan.** `Weë Stüdyo`, `Weë Müzik`, `Weë Şef`, `Kredi`, `Krediler` están
mal aunque suenen naturales: son justo la tentación del turco, porque se escriben casi igual.

**Sufijos.** La TDK pide apóstrofo y que la terminación siga la PRONUNCIACIÓN del nombre (`Cannes'a`, `Photoshop'ta`),
sin ablandar la consonante (`WeeTalk'a`, no `WeeTalğ'a`). La pronunciación de varias marcas de Weë no está fijada
(«Wäll» ¿vol o vel?, «Travel» ¿travıl o trevıl?), así que solo se usan las terminaciones que salen IGUAL con cualquier
lectura razonable. El resto de casos se escribe con un sustantivo detrás que lleva el sufijo.

| Marca | Terminaciones admitidas | Si no, con sustantivo |
|---|---|---|
| `Weë` (vi / ve: vocal anterior) | `'ye` `'yi` `'de` `'den` `'deki` `'nin` `'yle` | — |
| `Weë AI` (e-ay / a-ı) | `'da` `'dan` `'daki` | `Weë AI ile`, `Weë AI bölümüne` |
| `Weë Studio`, `Weë Photo` (…o) | `'da` `'dan` `'daki` `'ya` `'yu` `'nun` | — |
| `Weë Design` (dizayn) | `'da` `'dan` `'daki` `'a` `'ı` `'ın` | — |
| `Weë Music` (müzik), `Weë Chef` (şef) | `'te` `'ten` `'teki` `'e` `'i` `'in` | — |
| `Weë Brain` (breyn) | `'de` `'den` `'deki` `'e` `'i` `'in` | — |
| `Weë Beauty` (byuti) | `'de` `'den` `'deki` `'ye` `'yi` `'nin` | — |
| `Weë Inspira` (…a) | `'da` `'dan` `'daki` `'ya` `'yı` `'nın` | — |
| `WeeTalk` (vitok / vitalk) | `'ta` `'tan` `'taki` `'a` | `WeeTalk sohbeti` para los demás casos |
| `Weëls` (vils) | `'te` `'ten` `'teki` `'e` `'i` `'in` | `Weëls videosu` |
| `Weë Travel`, `Weë Business`, `Weë Writer`, `Weë Home`, `Wäll`, `ËContact`, `ẄContact`, `Credits`, `Weë Credits` | ninguna | `Weë Travel ile`, `Wäll sayfan`, `ËContact listen`, `Credits bakiyen`, `250 Credits` |

## 10. Glosario

### 10.1 Las palabras del encargo

| Español | Turco | Nota |
|---|---|---|
| crear | **oluştur** | YouTube, Facebook, Instagram |
| generar (IA) | **oluştur**; «generativa» = **üretken** | OpenAI, Adobe, Meta. `Yarat` solo en Apple |
| editar | **düzenle** | |
| guardar | **kaydet** | |
| compartir | **paylaş** | También «publicar» una publicación (Instagram, Facebook) |
| eliminar / borrar | **sil** | |
| cancelar | **İptal** | Android, Microsoft; `Vazgeç` (Apple) descartado |
| continuar | **Devam et** | X, LinkedIn, Netflix; `Sürdür` (Apple) descartado |
| volver | **Geri** | |
| configuración | **Ayarlar** | |
| cuenta | **hesap** | |
| perfil | **profil** | Perfil Real = `Gerçek profil`, Perfil Weë = `Weë profili` |
| proyecto | **proje** | «Mis proyectos» = `Projelerim` |
| archivo | **dosya** | |
| imagen | **görsel** | Lo generado o genérico; `fotoğraf` solo para fotos de cámara |
| vídeo | **video** | |
| audio | **ses** | «pista de audio» = `ses kaydı` |
| documento | **belge** | |
| modelo (de IA) | **model** | |
| IA | **yapay zekâ** | § 3; la marca `Weë AI` no se traduce |
| créditos | **Credits** | Marca, sin traducir ni pluralizar: `250 Credits`, `Credits bakiyen` |
| comunidad | **topluluk** | |
| contacto | **kişi** | La agenda es `ËContact`; «contáctanos» = `Bize ulaş` |
| publicación | **gönderi** | YouTube, Instagram, LinkedIn |
| borrador | **taslak** | |
| plantilla | **şablon** | |
| espacio de trabajo | **çalışma alanı** | |

### 10.2 Lo social

| Español | Turco | Nota |
|---|---|---|
| Inicio / Home | **Ana sayfa** | |
| Buscar | **Ara** | |
| Explorar | **Keşfet** | Instagram, TikTok, X |
| Notificaciones | **Bildirimler** | |
| Mensajes / chat | **Mesajlar** / **sohbet** | |
| Me gusta | **Beğen** (botón), **beğeni** (nombre) | |
| Comentario / comentar | **yorum** / **Yorum yap** | |
| Responder | **Yanıtla**, **yanıt** | |
| Repost / republicar | **Yeniden paylaş**; `{{nombre}} yeniden paylaştı` | La pestaña del perfil es `Repost`, como en X: «Yeniden paylaşım» no cabe |
| Seguir / siguiendo | **Takip et** / **Takip ediliyor** | |
| Guardados | **Kaydedilenler** | Apple; `Kaydedildi` es el estado |
| Denunciar | **Şikâyet et** | Un problema técnico: `Bildir` |
| Bloquear / silenciar | **Engelle** / **Sessize al** | |
| Mencionar | **bahset** | |
| Hashtag | **etiket** | X; «tendencia» = `gündem` |
| Weëls | **Weëls**, `Weëls videosu` | Como `Reels videosu` en Instagram |
| Copiar enlace | **Bağlantıyı kopyala** | |

### 10.3 Cuenta y acceso

| Español | Turco | Nota |
|---|---|---|
| Iniciar sesión | **Giriş yap** | Instagram, Facebook, X, Apple, Spotify; `Oturum aç` (Google, Microsoft) descartado |
| Registrarse | **Kaydol** | Instagram, Facebook, TikTok, Spotify |
| Cerrar sesión | **Çıkış yap** | |
| Contraseña | **şifre** | Meta, Google, X, TikTok; `parola` (Apple, Microsoft) descartado |
| Invitado | **misafir** | |
| Correo electrónico | **e-posta** | |

### 10.4 Crear con IA

| Español | Turco | Nota |
|---|---|---|
| prompt | **prompt** | Como en el resto de Weë; préstamo común, sin apóstrofo (`promptu kopyala`) |
| Cómo lo hice | **Nasıl yaptım** | |
| resultado | **sonuç** | |
| versión | **sürüm** | |
| estilo | **stil** | |
| subir / descargar | **Yükle** / **İndir** | |
| especialista | **uzman** | Los especialistas de Weë AI |
| creación (lo creado) | **içerik** | «Mis creaciones» = `Oluşturduklarım` |

### 10.5 Estados y avisos

| Español | Turco |
|---|---|
| Algo salió mal | **Bir sorun oluştu** |
| Inténtalo de nuevo | **Yeniden dene** |
| Cargando… | **Yükleniyor…** |
| Sin resultados | **Sonuç yok** |
| Error | **Hata** |
| Aceptar (aviso) | **Tamam** |
| Próximamente | **Yakında** |

### 10.6 Términos que fijó la primera traducción completa

Se decidieron al traducir Weë entero y son ya el uso de la casa: un módulo nuevo los reutiliza.

| Ámbito | Español → turco |
|---|---|
| Credits y dinero | saldo `bakiye` (`Credits bakiyen`) · no tienes suficientes `Credits bakiyen yetersiz` · recargar `Bakiye yükle` (nunca `Yükle` a secas, que es subir) · necesario `Gereken` · coste `maliyet` · reembolso `İade` / `İade edildi` · mi billetera `Cüzdanım` · historial `İşlem geçmişi` · ganado / gastado `Kazanılan` / `Harcanan` · la mejor opción `En avantajlı` · descuento por volumen `toplu alım indirimi` · beneficio `kâr` |
| Pruebas y estados | de prueba `deneme` · modo demo `demo modu` · procesando `İşleniyor` · listo `Hazır` (estado) / `Bitti` (botón) / `Tamamlandı` (aviso) · entendido `Anladım` · falló `Başarısız` · Ups `Hay aksi` |
| Publicar y social | encuesta / voto `anket` / `oy` · ubicación `konum` · lugar `yer` · público `Herkese açık` · visibilidad `Görünürlük` · multimedia `Medya` · repost (nombre) `yeniden paylaşım` · vistas `görüntülenme` · mención `bahsetme` · dónde se publica `Paylaşım yerleri` · publicar una creación `Weë'de paylaş` · solicitud `istek` · aceptar / rechazar / retirar `kabul et` / `reddet` / `geri çek` · miembro, unirse, salir `üye`, `Katıl`, `Ayrıl` · oficial `Resmî` · memes `caps` (`meme` es otra cosa en turco) |
| WeeTalk | modo efímero `Kaybolan mesajlar` · foto única `Tek seferlik fotoğraf` · nota de voz `sesli mesaj` · adjuntar `Ekle` · tema del chat `Sohbet teması` · fondo `Arka plan` · notificaciones push `Anlık bildirimler` |
| Perfil y cuenta | nombre visible `Görünen ad` · biografía `Biyografi` · portada `Kapak görseli` · alias del Perfil Weë `Takma ad` · opcional `isteğe bağlı` · ej. `Örn.` · condiciones `Kullanım koşulları` (corto: `Koşullar`) · privacidad `Gizlilik politikası` · sesión `oturum` |
| Crear con IA | vista previa `önizleme` · reproducir / pausa `Oynat` / `Duraklat` · antes / después `Önce` / `Sonra` · marca de agua `filigran` · cambio de cara `yüz değiştirme` · búsqueda con fuentes `Kaynaklı arama` · tutoriales `eğitimler` · cupo de creaciones `oluşturma hakkı` · galería `Galeri` · mis documentos `Belgelerim` · editor `Editör` · dictar `Sesle yaz` · formato (proporción) `Biçim` · timelapse `Hızlandırılmış çekim` · voz en off / narración `Dış ses` / `Sesli anlatım` · pies de foto `Gönderi açıklamaları` |
| Weë Studio (cámara) | encuadre `Kadraj` · ángulo `Açı` · objetivo `Objektif` · iluminación `Aydınlatma` · composición `Kompozisyon` · plano general / medio / corto `Genel plan` / `Orta plan` / `Yakın plan` · dron `Dron` · a ojo de pájaro `Kuşbakışı` · hora dorada `Altın saat` · regla de tercios `Üçler kuralı` · paneo `Yatay pan` / `Dikey pan` |
| Negocio y hogar | negocio `işletme` · directorio `işletme rehberi` · reseña `değerlendirme` (no `yorum`, que es comentario) · ingrediente `malzeme` · información nutricional `Besin değerleri` · sin X `-sız` (`Glütensiz`) · espacio (diseño) `mekân` · recorrido `Sanal tur` · gastos de luz y agua `Faturalar` · envío `Kargo` · promoción `Kampanya` · CTA `harekete geçirici mesaj` |
| Administración (motor) | proveedor `sağlayıcı` · cadenas de fallback `fallback zincirleri` · salud `sağlık durumu` · configuración `yapılandırma` · política `politika` · activar / desactivar `etkinleştir` / `devre dışı bırak` |
| Weëls | un Weël `Weëls videosu`; en botones y chips basta `Weëls` (`Weëls oluştur`), como `Reels videosu` en Instagram |

Los rótulos que el diseño pinta en mayúsculas y que el español ya escribe así en el diccionario (las secciones del
menú) van en mayúsculas con su `İ`: `PROFİL`, `KEŞFET`. Los que se ponen en mayúsculas al pintarse los escribe
`TextoEnMayusculas`.

## 11. Lo que no se traduce

Las marcas (§ 9); lo que escribe una persona —publicaciones, comentarios, nombres de comunidades y proyectos,
prompts—; identificadores, rutas, emojis y los valores que viajan al servidor.

## 12. Decisiones donde las fuentes no coinciden

| Tema | Opciones | Elegido | Por qué |
|---|---|---|---|
| Tratamiento | sen (Instagram, Facebook, Spotify) / siz (Apple, Google, Microsoft, LinkedIn, Netflix) / mezcla (X, TikTok) | **sen, siempre** | Red social de creadores; el español tutea; Microsoft lo admite para público joven; mezclar es un defecto |
| Caja de botones y títulos | Frase (Mozilla, Microsoft, Android) / Cada Palabra (Apple, Netflix) | **Frase** | Coherente con el español y con las guías de estilo publicadas |
| Circunflejo | Con (TDK, Apple, Estado) / sin (Google, Meta, Microsoft) | **Con, según la TDK** | Es la norma, nunca está mal, y distingue `hâlâ`/`hala`, `kâr`/`kar` |
| Cancelar | İptal / Vazgeç | **İptal** | Android y Microsoft; más corto y conocido |
| Continuar | Devam et / Devam / Sürdür | **Devam et** | X, LinkedIn, Netflix |
| Contraseña | Şifre / Parola | **Şifre** | Redes sociales y Google |
| Iniciar sesión | Giriş yap / Oturum aç | **Giriş yap** | Redes sociales y Apple |
| Imagen | görsel / görüntü / resim | **görsel** | Google, OpenAI, Meta para lo generado |
| Prompt | istem (Adobe) / prompt (OpenAI) | **prompt** | Es la palabra de la comunidad y la del resto de Weë |
| Apóstrofo | ' (Google, Meta, Microsoft, TDK) / ’ (Apple, Mozilla) | **'** | Lo que escribe la gente y lo que busca |
| Hora | 14.05 (TDK) / 14:05 (CLDR) | **14:05** | La da `Intl` y es la del teléfono |

## 13. Cómo se revisa

1. `node <scratch>/validar-tr.cjs <worktree> <módulo>` durante la traducción (huecos, sufijos, porcentajes, letras).
2. `functions/test/i18n-turco.test.mjs`: todo lo comprobable de esta guía, contra el diccionario entero.
3. `functions/test/i18n-nombres-propios.test.mjs`: marcas y sus deformaciones turcas.
4. Revisión humana de lo que no se prueba: naturalidad, tono, contexto.

## Fuentes

- **[MS]** Microsoft Turkish Localization Style Guide — aka.ms/turkish-styleguide (§§ 2.1.2, 3.2, 4.1.1, 4.1.5, 4.1.13–16, 5.3, 5.5.2)
- **[MOZ]** Mozilla Türkiye, Türkçe yerelleştirme yönergeleri — mozilla.org.tr/turkce-yerellestirme-yonergeleri/ ; Firefox `tr` (.ftl)
- **[GNOME]** GNOME Türkiye çeviri rehberi — gnome.org.tr/ceviri/ceviri-nasil-yapilir/
- **[TDK]** Yazım Kılavuzu: kesme işareti, düzeltme işareti, noktalama, kısaltmalar, sayıların yazılışı, bağlaç «da/de» y «ki», soru eki «mi»; Sıkça sorulan sorular; Güncel Türkçe Sözlük (sozluk.gov.tr) — tdk.gov.tr
- **[APPLE]** Cadenas turcas de iOS 26 (índice applelocalization.com) ; support.apple.com/tr-tr
- **[AOSP]** Android `values-tr/strings.xml`
- **[IG] [FB] [SPOT]** Interfaces web de Instagram, Facebook y Spotify en turco, y sus centros de ayuda; también X, TikTok, YouTube, LinkedIn, Netflix, WhatsApp, OpenAI y Adobe
- **[CLDR 48]** Salida de ICU 78.3 / CLDR 48 en Node 24 para `tr-TR`
- **[INVESTIGACIÓN]** Informe de investigación del 2026-09-30 (sesión de implementación), con la medición de longitudes sobre iOS 26
