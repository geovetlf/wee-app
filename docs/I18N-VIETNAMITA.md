# Vietnamita (vi-VN) en Weë — método, guía de estilo y glosario

Rama `i18n/vi-vn` (worktree `wee-trabajo/wt-i18n-vi`), desde `fashion/renombre-visible` `644d147e`, la misma base que el griego (`i18n/el-gr`) y el neerlandés (`i18n/nl-nl`). Preparado el 2026-10-30. **Traducción hecha por agentes; sin revisión humana nativa.** Nada de esto es validación lingüística profesional.

## 1. Método (el mismo de los demás idiomas; ver `docs/I18N.md` § 5)

Catálogo `i18n/idiomas.ts` (`vi`, `listo: true`, `vi-VN` en `LOCALES_CONTEMPLADOS`) → diccionario `i18n/textos/vi/` (37 módulos tipados contra el español + `index.ts`) → `i18n/diccionarios.ts` → permisos de iOS (`locales/vi.json` + `app.json`) → fila de `components/ErrorBoundary.tsx` → suite `functions/test/i18n-vietnamita.test.mjs` → huella → CSV de revisión con `scripts/i18n-revision.mjs exportar vi`. Sin sección `servidor/` (como los otros 13). La preferencia se guarda en el aparato y en la cuenta (`components/SincronizarIdioma.tsx` → `users.language`) sin cambios.

## 2. Lo propio del vietnamita (comprobado con Node 24/ICU, 2026-10-30)

1. **SIN plural**: `Intl.PluralRules('vi')` declara una sola categoría, `other`. La forma `_one` NO se lee nunca (ni con 1): `_one` y `_other` llevan **exactamente el mismo texto**, como en coreano, japonés y chino. El número va delante sin cambiar el sustantivo: «{{contador}} bình luận».
2. **NFC obligatorio**: los tonos se apilan sobre las vocales con circunflejo o cuerno («ế», «ộ», «ữ»). «Tiếng Việt» mide 10 caracteres en NFC y 14 en NFD; todo texto se escribe en NFC (los precompuestos), nunca con marcas combinantes sueltas.
3. **Formatos** (de `Intl` con `vi-VN`, nunca a mano): `1.234.567 ₫` (sin decimales), `12.345,6`, `29/10/2026`, `14:30`, listas «a, b và c».
4. **Fuente**: Inter cubre el vietnamita completo (comprobado con su tabla `cmap`, también «₫»).
5. **Espacios**: el vietnamita separa sílabas con espacios; los espacios de borde se copian exactamente del español.
6. **LTR**, una sola escritura.

## 3. Guía de estilo

- **Tratamiento**: «bạn» para la persona, neutro y cordial, como las apps de redes sociales en Vietnam; nunca «mày», «anh/chị» ni «quý khách». La app no se refiere a sí misma con un pronombre: se usa el nombre («Weë») o la frase impersonal.
- **Botones**: verbo corto o verbo + objeto: «Lưu», «Hủy», «Xóa», «Gửi», «Chỉnh sửa», «Chia sẻ», «Theo dõi», «Tiếp tục», «Đóng».
- **Grafía de los tonos**: estilo moderno en «oa/oe/uy» («hoà» o «hòa» según la norma de Vietnam; se usa **«hòa», «thủy», «hóa»** de forma constante, que es la usada por Google y Apple en vietnamita).
- **Marcas** intocables, en latino sin traducir: Weë, Wäll, Weëls, WeeTalk, ËContact, ẄContact, Credits, Weë AI / WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo, Weë Beauty, Weë Home, y Weë Business solo donde el español lo nombra como PRODUCTO. «Credits» siempre así (se puede decir «số dư Credits»).
- **Identificadores**, `{{huecos}}`, emojis, rutas, ids, modelos y API: byte a byte. Si en/de/fr/it dejaron una palabra en inglés (Fashion, Beauty, 3D World, funciones de Weë Business), el vietnamita también.
- **Lo que escribe una persona** no se traduce.
- **Comillas**: “…” para citar un botón en una frase.

## 4. Glosario

| Español | Vietnamita | Nota |
|---|---|---|
| Inicio / el Home | Trang chủ | |
| Buscar | Tìm kiếm | |
| Crear (+) | Tạo | |
| Explorar | Khám phá | |
| Publicación · Publicar | bài viết · Đăng | |
| Comentario · Responder | bình luận · Trả lời | |
| Me gusta | Thích | contador: «{{contador}} lượt thích» |
| Compartir | Chia sẻ | |
| Seguir / Siguiendo / Seguidores | Theo dõi / Đang theo dõi / người theo dõi | |
| Guardar / Guardados | Lưu / Đã lưu | |
| Cancelar · Eliminar · Editar · Enviar | Hủy · Xóa · Chỉnh sửa · Gửi | |
| Siguiente · Atrás · Cerrar · Continuar | Tiếp · Quay lại · Đóng · Tiếp tục | |
| Reintentar | Thử lại | |
| Cargando… | Đang tải… | |
| Algo salió mal | Đã xảy ra lỗi | |
| No sé (🤷) | Tôi không biết | |
| Perfil · Perfil Real · Perfil Weë | Hồ sơ · Hồ sơ thật · Hồ sơ Weë | |
| Comunidad(es) | cộng đồng | |
| Notificaciones · Configuración · Ayuda | Thông báo · Cài đặt · Trợ giúp | |
| Iniciar / cerrar sesión | Đăng nhập / Đăng xuất | |
| Crear cuenta · Registrarse | Tạo tài khoản · Đăng ký | |
| Contraseña · Correo | mật khẩu · email | |
| Mensaje · conversación | tin nhắn · cuộc trò chuyện | |
| Proyecto · Mis proyectos | dự án · Dự án của tôi | |
| Mis creaciones · creación | Sáng tạo của tôi · tác phẩm | |
| Prompt · Copiar prompt | prompt · Sao chép prompt | |
| Imagen · Video · Foto · Texto | hình ảnh · video · ảnh · văn bản | |
| Pregunta · Tutorial | câu hỏi · hướng dẫn | |
| Denunciar | Báo cáo | |
| Subir · Descargar | Tải lên · Tải xuống | |
| Saldo | số dư | |
| Cómo lo hice | Tôi đã làm thế nào | |
| Plantilla · borrador · resultado | mẫu · bản nháp · kết quả | |
| IA | AI | «Weë AI»; en prosa «AI» |

## 5. Lo que NO cubre este trabajo

- Sección `servidor/` en vietnamita (esos textos salen en inglés, como en los otros 13).
- Palabras clave del buscador de Weë AI y nombres de ciudades: usa la lista inglesa.
- Detector de idioma: el vietnamita usa alfabeto latino y necesita palabras funcionales; el cambio de `functions/src/shared/idiomaDelTexto.ts` se prepara en este worktree DESPUÉS de que termine la cadena del Gran Motor.
- Revisión humana nativa y validación visual: pendientes.
