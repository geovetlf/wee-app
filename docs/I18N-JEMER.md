# Weë en jemer (km · km-KH) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-km` (rama `i18n/km-kh`, base `644d147e`, la misma de todos los
worktrees de idioma activos). Traducción hecha por agentes y **SIN revisión por una persona competente en jemer**. Nada de esto está
en `main`.

## 1. Registro
- `CodigoDeIdioma`: `'km'`. Locale: `km-KH`. Nombre nativo en el selector: `ភាសាខ្មែរ`. Dirección `ltr`. Sin variantes.
- Formatos por `Intl` con `km-KH` (medido en Node 24): dígitos LATINOS por defecto (`12,345.6`), moneda `1,234.50៛`, fecha
  `29/10/2026`, hora de 12 horas (`2:30 PM`), lista «a, b និង c». Los dígitos jemeres (០-៩) **no se escriben a mano**: si un día se
  quieren, es `numberingSystem: 'khmr'` en los formatos, no texto.
- Plural: `Intl.PluralRules('km')` solo tiene **other**: donde el español declara `_one`/`_other`, el jemer escribe las dos formas
  **idénticas** y con `{{contador}}`; nunca «1» a mano.

## 2. Forma de escribir (esto es lo que decide la calidad visual)
- Escritura jemer (U+1780–U+17FF). **Sin espacios entre palabras**: el jemer separa frases, no palabras. Para que el navegador
  pueda cortar línea entre palabras se usa el **ZWSP (U+200B)** entre palabras donde haga falta, como hacen los sitios jemeres
  bien hechos; el espacio normal solo entre frases/cláusulas y alrededor de palabras latinas (marcas, cifras). El validador no
  exige espacios y acepta ZWSP.
- Marcas combinantes (coeng ្, vocales dependientes, signos) van en el orden canónico Unicode; el texto se entrega en NFC.
- Puntuación jemer: fin de frase **។** (khan) en frases completas; «?» latino es habitual en interfaces y se admite; «៖» para los
  dos puntos; coma latina «,» se usa poco: preferir ZWSP o reformular.
- Dígitos: latinos (los pone `Intl`). Ninguna cifra jemer a mano.
- Trato: respetuoso neutro (អ្នក), sin formas reales ni de monje; botones breves en verbo (រក្សាទុក, បោះបង់, ផ្ញើ, បង្ហោះ, ទាញយក, បន្ត).
- Préstamos asentados en la interfaz jemer: «ប៉ុស្តិ៍» (post), **«ចូលចិត្ត»** (like), «មតិ» (comentario), «ប្រវត្តិរូប» (perfil), «គណនី»
  (cuenta), «ការជូនដំណឹង», «ការកំណត់», «ប្រមុខ/Prompt» → se deja **«Prompt»** en latino (como en las apps de IA en jemer),
  «AI» en latino junto a nombres y «បញ្ញាសិប្បនិម្មិត» en prosa, «ជជែក» (chat).
- NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
WEE, Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits / Weë Credits (**nunca
«ក្រេឌីត»**), Filmmaker Engine, World Encode Entity. Entre jemer y una marca va un espacio normal. «Weë Business» solo donde el
español lo dice. Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Jemer | Nota |
|---|---|---|
| Inicio / Home | ទំព័រដើម | |
| Buscar | ស្វែងរក | |
| Publicación / Publicar | ប៉ុស្តិ៍ / បង្ហោះ | |
| Comentario | មតិ | |
| Like | ចូលចិត្ត | |
| Compartir / Repostear | ចែករំលែក / បង្ហោះឡើងវិញ | |
| Seguir / Siguiendo / Seguidores | តាមដាន / កំពុងតាមដាន / អ្នកតាមដាន | |
| Comunidad | សហគមន៍ | |
| Perfil Real / Perfil Weë | ប្រវត្តិរូបពិត / ប្រវត្តិរូប Weë | |
| Guardados | បានរក្សាទុក | |
| Configuración | ការកំណត់ | |
| Ayuda | ជំនួយ | |
| Notificaciones | ការជូនដំណឹង | |
| Mis creaciones | ស្នាដៃរបស់ខ្ញុំ | |
| Proyecto | គម្រោង | |
| Subir / Descargar | បង្ហោះឡើង / ទាញយក | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | គណនី / ចូល / ចុះឈ្មោះ / ចាកចេញ | |
| Contraseña / Correo | ពាក្យសម្ងាត់ / អ៊ីមែល | |
| Cancelar / Guardar / Eliminar / Editar | បោះបង់ / រក្សាទុក / លុប / កែសម្រួល | |
| Listo / Hecho | រួចរាល់ | |
| Volver | ត្រឡប់ | |
| No sé 🤷 | មិនដឹងទេ | |
| Invitado | ភ្ញៀវ | |
| Imagen / Video / Audio / Texto | រូបភាព / វីដេអូ / សំឡេង / អត្ថបទ | |
| Crear / Generar | បង្កើត / បង្កើត | |
| Viaje / Receta / Diseño / Negocio | ដំណើរកម្សាន្ត / រូបមន្ត / ការរចនា / អាជីវកម្ម | |
| Plano / Toma / Escena / Guion | ការថត (shot) / ការថតម្តង (take) / ឈុត / អត្ថបទរឿង | |
| Chat | ជជែក | |
| Cargando… / Error / Reintentar | កំពុងផ្ទុក… / កំហុស / ព្យាយាមម្តងទៀត | |

## 5. Tipografía (lo que hay que medir, no suponer)
- Inter (la única fuente de la app) **no tiene glifos jemeres**: el texto cae a la fuente del sistema (Windows: Leelawadee UI /
  Khmer UI; Android: Noto Sans Khmer; iOS: Khmer Sangam MN; web: la del sistema). Hay que **medir** con `_visual/auditar.mjs`
  (campo `fuentes`) y mirar las capturas: altura de línea (el jemer apila coeng y vocales superiores/inferiores: necesita más
  `lineHeight` que el latino), recortes en botones/chips de altura fija, cortes de línea.
- Si hace falta una fuente propia (Noto Sans Khmer, OFL), es una decisión del dueño: dependencia nueva, no se añade aquí.

## 6. Lo que NO está hecho y no se finge
- Revisión humana: pendiente (CSV en `wee-trabajo/_km-revision/`).
- Validación visual: pendiente (puerto 8105); es la parte crítica del jemer.
- `SIN_ESPACIOS` en `i18n-cobertura` (regla de espacios de borde) hoy solo cubre `ja|zh`: el jemer también separa sin espacios;
  si la regla 4 falla, se propone añadir `km` AHÍ (cambio compartido, con autorización), no relajar nada en el diccionario.
