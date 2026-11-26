/*
 * WeëAI sencillo · crear para publicar (decisión del dueño, 2026-11-23).
 *
 * La portada de WeëAI ofrece tres cosas —Imagen, Video corto y Editar mi foto—,
 * la pantalla que las crea, el resultado con «Publicar» en una hoja, «Recrear
 * este estilo» desde el Ẅall y su aviso al autor.
 *
 * Los nombres de Weë no se traducen: Weë, WeëAI, Ẅall, Weël, Weëls, Credits.
 * Las cifras (Credits, segundos) entran por interpolación ya formateadas con el
 * locale activo (`formato.numero`); nunca se pegan a la frase.
 *
 * Este archivo es el MOLDE: añadir una clave aquí y olvidarla en inglés no compila.
 */
export const publicar = {
  /* La portada */
  heroEtiqueta: 'Crea y publica',
  heroTitulo: '¿Qué quieres crear?',
  heroSub: 'Lista para tu Ẅall, tus Weëls o tu comunidad',
  puertaImagen: 'Imagen',
  puertaImagenDesc: 'Para tu Ẅall o tu comunidad',
  puertaVideo: 'Video corto',
  puertaVideoDesc: 'Un Weël vertical de hasta {{segundos}} s',
  puertaEditar: 'Editar mi foto',
  puertaEditarDesc: 'Súbela y dile qué cambiar',
  adjuntarFoto: 'Adjuntar una foto para editarla',
  borradores: 'Borradores',
  borradoresConTotal: 'Borradores: {{total}}',

  /* Elegir */
  tuIdea: 'Tu idea',
  ideaImagen: 'Describe la imagen que quieres',
  ideaVideo: 'Describe el video que quieres',
  dondePublicar: '¿Dónde lo vas a publicar?',
  formatoPublicacion: 'Publicación',
  formatoCuadradaWall: 'Cuadrada · Ẅall',
  formatoCuadradoWall: 'Cuadrado · Ẅall',
  formatoVertical: 'Vertical',
  formatoVerticalDesc: 'Pantalla completa',
  formatoWeel: 'Weël',
  formatoWeelDesc: 'Vertical · hasta {{segundos}} s',
  estilo: 'Estilo',
  queWeeElija: 'Que Weë elija',
  estiloReal: 'Foto real',
  estiloIlustracion: 'Ilustración',
  estiloCine: 'Cine',
  estiloAnime: 'Anime',
  duracion: 'Duración',
  segundos: '{{segundos}} s',
  desdeUnaFoto: 'Desde una foto',
  opcional: 'Opcional',
  desdeUnaFotoHint: 'Sube una foto para que salga en el video',
  elegirFoto: 'Elegir foto',
  cambiarFoto: 'Cambiar foto',
  quitarFoto: 'Quitar la foto',
  subiendoFoto: 'Subiendo tu foto…',
  errorSubirFoto: 'No se pudo subir la foto. Prueba con otra.',
  fotoDemasiadoGrande: 'La foto pesa demasiado: el máximo es 10 MB.',

  /* El precio, antes de crear */
  costara: 'Costará',
  soloSiSaleBien: 'Solo se cobra si sale bien',
  masLargoMasCredits: 'Más largo, más Credits',
  precio: '≈ {{credits}} Credits',
  calculandoPrecio: 'Calculando el precio…',
  precioNoDisponible: 'No pudimos calcular el precio. Inténtalo de nuevo.',
  precioDePrueba: 'Precio de prueba',
  tienes: 'Tienes {{credits}} Credits',
  crearImagen: 'Crear imagen',
  crearVideo: 'Crear video',
  editarFoto: 'Editar foto',
  crearMiVersion: 'Crear mi versión',
  precioCambio: 'El precio cambió a {{credits}} Credits. Revísalo antes de crear.',

  /* Sin saldo */
  teFaltanCredits: 'Te faltan Credits',
  estoCuesta: 'Esto cuesta',
  tienesRotulo: 'Tienes',
  credits: '{{credits}} Credits',
  sinSaldoHint: 'Compra Credits y vuelve aquí: tu idea y tus elecciones se quedan como están.',
  comprarCredits: 'Comprar Credits',
  guardarComoBorrador: 'Guardar como borrador',

  /* Creando */
  creandoImagen: 'Creando tu imagen',
  creandoWeel: 'Creando tu Weël',
  creandoVideo: 'Creando tu video',
  editandoFoto: 'Editando tu foto',
  pasoEntendi: 'Entendí tu idea',
  pasoCreando: 'Creando',
  pasoRetoques: 'Últimos retoques',
  puedesSalir: 'Puedes salir: lo encontrarás en tu Historial.',
  seguirNavegando: 'Seguir navegando',

  /* Error */
  errorTitulo: 'Weë no pudo crearlo',
  errorTexto: 'Algo falló de nuestro lado. Tu idea sigue aquí: prueba otra vez o cámbiala un poco.',
  noSeTeCobro: 'No se te cobró',
  intentarDeNuevo: 'Intentar de nuevo',
  cambiarLaIdea: 'Cambiar la idea',

  /* Resultado */
  tuImagen: 'Tu imagen',
  tuWeel: 'Tu Weël',
  tuVideo: 'Tu video',
  tuFotoEditada: 'Tu foto editada',
  publicarComoWeel: 'Publicar como Weël',
  publicarEnWall: 'Publicar en el Ẅall',
  enElWall: 'En el Ẅall',
  compartirFuera: 'Compartir fuera',
  compartirFueraPronto: 'Compartir fuera, con la marca de agua de Weë, llegará pronto',
  descargar: 'Descargar',
  descargado: 'Guardado en tu dispositivo',
  errorDescargar: 'No se pudo descargar. Inténtalo de nuevo.',
  guardarEnBorradores: 'Guardar en borradores',
  guardadoEnBorradores: 'Guardado en Borradores',
  errorGuardar: 'No se pudo guardar. Inténtalo de nuevo.',
  otraVersion: 'Otra versión',
  quienPublica: 'Quién publica',
  antes: 'Antes',
  despues: 'Después',
  demoNoPublicable: 'Es una vista previa de demostración: podrás publicar cuando Weë cree de verdad.',
  weelMuyLargo: 'Este video dura más de {{segundos}} s: se puede publicar en el Ẅall, pero no como Weël.',

  /* La hoja de publicar */
  textoDeLaPublicacion: 'Escribe algo sobre tu publicación (opcional)',
  automatico: 'Automático',
  hechoConWeeAi: 'Hecho con WeëAI',
  tipoImagen: 'Imagen',
  tipoVideoCorto: 'Video corto',
  tipoFotoEditada: 'Foto editada',
  ideaCitada: 'Idea: «{{idea}}»',
  mostrarMiIdea: 'Mostrar mi idea',
  mostrarMiIdeaHint: 'Así otros pueden recrear tu estilo',
  publicarBoton: 'Publicar',
  publicando: 'Publicando…',
  publicado: 'Publicado',
  errorPublicar: 'No se pudo publicar. Inténtalo de nuevo.',
  cerrar: 'Cerrar',

  /* Editar mi foto */
  queCambiar: '¿Qué quieres cambiar?',
  cambioPlaceholder: 'Por ejemplo: ponme una chaqueta de cuero y luz de atardecer',
  subeTuFoto: 'Sube tu foto',
  subeTuFotoHint: 'Elige una foto y dile a Weë qué cambiar',
  sugQuitarFondo: 'Quitar el fondo',
  sugLuzEstudio: 'Luz de estudio',
  sugOtraRopa: 'Otra ropa',
  sugIlustracion: 'En ilustración',
  avisoPermiso: 'Usa fotos tuyas o de alguien que te dio permiso.',

  /* Recrear este estilo */
  recrearEstilo: 'Recrear este estilo',
  estiloDe: 'Estilo de {{nombre}}',
  quitarEstiloDe: 'Quitar el estilo de {{nombre}}',
  seMencionara: 'Al publicar se menciona a {{nombre}} como inspiración.',
  inspiradoEn: 'Inspirado en {{nombre}}',
  notifRecrear: '{{nombre}} recreó el estilo de tu publicación',
};
