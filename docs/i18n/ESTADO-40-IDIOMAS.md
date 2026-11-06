# Estado de los 40 idiomas

Medido el 2026-10-30 en `wt-i18n-40` (rama `i18n/40-idiomas`), sin commit. **Ningún idioma está LISTO PARA PRODUCCIÓN ni VALIDADO POR REVISOR NATIVO.**

- **Traducción de app y servidor:** de IA, salvo el español.
- **Pruebas:** suite propia, cobertura, huecos, marcas y sección del servidor. Ver `REGISTRO-AUDITORIA.md`.
- **Visual:** medición real en navegador de escritorio con emulación de móvil, como invitado, en Inicio. RTL añade dos rutas que para un invitado también caían en Inicio. Sin sesión iniciada, sin teléfono real. Solo se miraron a ojo capturas de fa, km, ar y ga.
- **Evidencias:** `wee-trabajo/_visual/2026-10-30-i18n-40-v2/<locale>/`.

| Idioma | Código | Locale | Archivos | Estado inicial | Trabajo de esta misión | Pruebas | Visual automático | Revisión nativa | Bloqueo | Estado final |
|---|---|---|---|---|---|---|---|---|---|---|
| Español | `es` | es-PE | `i18n/textos/es/`, `locales/` | Original | Molde | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | No aplica | — | AUDITORÍA TÉCNICA APROBADA |
| Inglés | `en` | en-US | `i18n/textos/en/`, `locales/` | En GitHub main | Texto de error | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Alemán | `de` | de-DE | `i18n/textos/de/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Francés | `fr` | fr-FR | `i18n/textos/fr/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Italiano | `it` | it-IT | `i18n/textos/it/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Portugués de Brasil | `pt` | pt-BR | `i18n/textos/pt/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Portugués de Portugal | `pt-PT` | pt-PT | `i18n/textos/pt-PT/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Chino simplificado | `zh` | zh-CN | `i18n/textos/zh/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Chino tradicional | `zh-TW` | zh-TW | `i18n/textos/zh-TW/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Coreano | `ko` | ko-KR | `i18n/textos/ko/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Ruso | `ru` | ru-RU | `i18n/textos/ru/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Japonés | `ja` | ja-JP | `i18n/textos/ja/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Turco | `tr` | tr-TR | `i18n/textos/tr/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Sueco | `sv` | sv-SE | `i18n/textos/sv/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Hindi | `hi` | hi-IN | `i18n/textos/hi/`, `locales/` | En main; sin servidor | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Danés | `da` | da-DK | `i18n/textos/da/`, `locales/` | En main; con servidor | Texto de error | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Árabe | `ar` | ar-EG | `i18n/textos/ar/`, `locales/` | Sin commit, auditado; sin servidor | Sección del servidor | Pasan | 15 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | RTL solo en Inicio como invitado | REVISIÓN NATIVA PENDIENTE |
| Hebreo | `he` | he-IL | `i18n/textos/he/`, `locales/` | Sin commit, auditado; sin servidor | Sección del servidor | Pasan | 15 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | RTL solo en Inicio como invitado | REVISIÓN NATIVA PENDIENTE |
| Persa | `fa` | fa-IR | `i18n/textos/fa/`, `locales/` | Sin commit, auditado; sin servidor | Sección del servidor | Pasan | 15 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | RTL solo en Inicio como invitado | REVISIÓN NATIVA PENDIENTE |
| Indonesio | `id` | id-ID | `i18n/textos/id/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Malayo | `ms` | ms-MY | `i18n/textos/ms/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Croata | `hr` | hr-HR | `i18n/textos/hr/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Bosnio | `bs` | bs-BA | `i18n/textos/bs/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Serbio cirílico | `sr` | sr-Cyrl-RS | `i18n/textos/sr/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Montenegrino | `cnr` | cnr-ME | `i18n/textos/cnr/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | Pocas fuentes: confianza media-baja | REVISIÓN NATIVA PENDIENTE |
| Polaco | `pl` | pl-PL | `i18n/textos/pl/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Catalán | `ca` | ca-ES | `i18n/textos/ca/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Griego | `el` | el-GR | `i18n/textos/el/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | Tuteo por decidir | REVISIÓN NATIVA PENDIENTE |
| Neerlandés | `nl` | nl-NL | `i18n/textos/nl/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Vietnamita | `vi` | vi-VN | `i18n/textos/vi/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Húngaro | `hu` | hu-HU | `i18n/textos/hu/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Finés | `fi` | fi-FI | `i18n/textos/fi/`, `locales/` | Sin commit, auditado | Sección del servidor | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Mongol | `mn` | mn-MN | `i18n/textos/mn/`, `locales/` | Sin commit, auditoría parcial | Sección del servidor; auditoría terminada | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Noruego bokmål | `nb` | nb-NO | `i18n/textos/nb/`, `locales/` | Sin commit, auditoría parcial | Sección del servidor; auditoría terminada | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | 78 filas sin aplicar por decisión de término | REVISIÓN NATIVA PENDIENTE |
| Alemán suizo | `de-CH` | de-CH | `i18n/textos/de-CH/`, `locales/` | Sin commit, auditoría parcial | Sección del servidor; auditoría terminada | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | 50 propuestas bloqueadas por la prueba D2 | REVISIÓN NATIVA PENDIENTE |
| Irlandés | `ga` | ga-IE | `i18n/textos/ga/`, `locales/` | Sin commit, auditoría parcial | Sección del servidor; auditoría terminada | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Jemer | `km` | km-KH | `i18n/textos/km/`, `locales/` | Sin commit, auditoría parcial | Sección del servidor; auditoría terminada | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | Grafía sin fuente verificada | REVISIÓN NATIVA PENDIENTE |
| Rumano | `ro` | ro-RO | `i18n/textos/ro/`, `locales/` | Sin commit, auditoría parcial | Sección del servidor; auditoría terminada | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | — | REVISIÓN NATIVA PENDIENTE |
| Serbio latino | `sr-Latn` | sr-Latn-RS | `i18n/textos/sr-Latn/`, `locales/` | Sin commit, generado | Generador con `servidor/` | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | Se genera desde el cirílico | REVISIÓN NATIVA PENDIENTE |
| Filipino | `fil` | fil-PH | `i18n/textos/fil/`, `locales/` | Sin commit, base antigua | Alineado con la base; registro | Pasan | 5 combinaciones; desborde 0; dirección mala 0 | Pendiente, 0 textos | Frases sin nombre pendientes de otra línea | REVISIÓN NATIVA PENDIENTE |
