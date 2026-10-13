# Media Cloud · decisiones del dueño (2026-10-12)

**Origen:** decisión del dueño de Weë del **2026-10-12**, transmitida a la línea F (Media Cloud y almacenamiento) de la
ronda R9. Este documento la deja ESCRITA, con fecha, porque hasta hoy no existía: la auditoría de almacenamiento de la
línea C (rama `r9/pc-persistencia`, `e709d1e3`, `docs/WEE-ALMACENAMIENTO-ARQUITECTURA.md` §2) comprobó que en el
repositorio no había ninguna decisión escrita sobre depender o no de Cloudinary; solo una intención y un aplazamiento.

Documentos de esta línea:

| Documento | Qué contiene |
|---|---|
| este | Las decisiones y sus límites |
| [`MEDIA-CLOUD-CLOUDINARY.md`](MEDIA-CLOUD-CLOUDINARY.md) | Inventario de lo que depende de Cloudinary, transición propuesta, revisión del preset sin firmar y de los tokens permanentes de Firebase Storage |
| [`MEDIA-CLOUD-R2.md`](MEDIA-CLOUD-R2.md) | Revisión del adaptador R2 y de Media Cloud, lo cambiado, costes verificados, Weë Cloud (apagado), despliegue gradual y reversión |
| [`MEDIA-CLOUD-RECONCILIACION.md`](MEDIA-CLOUD-RECONCILIACION.md) | Cómo se relacionan los registros antiguos con identidad, dueño, proveedor y ubicación, y la estrategia para reconciliarlos sin pérdidas |

---

## D-1 · Cloudinary NO es una dependencia obligatoria de Weë

**Cloudinary no es el backend impuesto de Weë ni una pieza de la que la arquitectura dependa.** Es un proveedor
HISTÓRICO: ahí viven las publicaciones, portadas, logos y audios subidos hasta hoy, y por ahí siguen subiendo las
pantallas de la app mientras no exista el camino nuevo. Nada más.

Consecuencias, todas ya coherentes con el código:

- La capa de control de los medios es **Media Cloud** (`functions/src/core/media` + `functions/src/media`): identidad del
  objeto, propiedad por cuenta, metadatos, autorización, entrega, migración. Los proveedores guardan bytes; Weë decide.
- Ningún módulo nuevo habla con Cloudinary. Cloudinary aparece en el servidor solo como **fuente histórica de solo
  lectura** (`functions/src/media/cloudinary.ts`, `FuenteHistorica`, apagada sin `MEDIA_LEGACY_CLOUDINARY_CLOUD`) y como
  proveedor reconocible en las fichas antiguas (`functions/src/content/index.ts:72`, `PROVEEDOR_CLOUDINARY`).
- **No se elimina la compatibilidad de golpe.** Las URLs de Cloudinary guardadas en publicaciones, perfiles y mensajes
  siguen sirviéndose tal cual, con sus transformaciones (`services/cloudinaryService.ts:80-117`,
  `functions/src/public/postPageHtml.ts:128-175`). Lo que cambia es el destino de lo NUEVO, y solo cuando el dueño lo
  active (ver D-2 y el plan de `MEDIA-CLOUD-R2.md` §7).
- El preset sin firmar `hidetok-simple` NO se borra ni se renombra desde aquí: hacerlo rompe todas las subidas actuales
  (`services/cloudinaryService.ts:5-11`, `docs/LEGADO-HIDETOK.md`). Su sustituto es la subida firmada de Media Cloud.

## D-2 · Cloudflare R2: AUTORIZADO preparar, NO activar

Autorizado: **desarrollo, pruebas y preparación** de la integración del adaptador R2 por el Storage Port y la arquitectura
Media Cloud que ya existen. **No autorizado:** activarlo en producción, cambiar el almacenamiento activo, exportar
Functions nuevas, desplegar, crear buckets, tocar IAM, secretos o reglas remotas.

- R2 entra SOLO por `PuertoDeAlmacenamiento` (`functions/src/core/media/puerto.ts:272`) con su adaptador
  (`functions/src/media/r2.ts`) y su descriptor en el registro (`functions/src/media/catalogo.ts:17`). No se conecta ningún
  módulo directamente al proveedor y no se crea una segunda abstracción.
- Media Cloud sigue siendo la capa de control central. El adaptador no conoce cuentas ni decide nada.

## D-3 · Lo antiguo no se borra ni se migra

Ningún asset existente se borra ni se mueve. Primero se establece la correspondencia verificable entre registro, dueño,
proveedor de origen y ubicación física (ver `MEDIA-CLOUD-RECONCILIACION.md`); hasta entonces todo se conserva donde está.

## D-4 · Weë Cloud sigue DESACTIVADO

Sin subidas, sin cobros y sin tarifa inventada. Se permite el diseño técnico y documentar costes
(`MEDIA-CLOUD-R2.md` §5-§6). El principio «local por defecto; Weë Cloud opcional y pagado con Credits; sin planes ni
suscripciones» sigue vigente.

## D-5 · Límites de esta línea

Sin despliegues, sin cambiar el almacenamiento activo en producción, sin borrar assets, sin migraciones destructivas, sin
tocar otros proyectos (Dizaster, MelonOffice) y sin IAM, secretos ni producción. Los contratos del Content Core
(`functions/src/content/**`) no se cambian: lo que la reconciliación necesite de ellos va como propuesta.
