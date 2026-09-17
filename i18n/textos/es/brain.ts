/*
 * WEË BRAIN — el sitio de trabajo del cerebro de Weë.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Brain" ni los nombres de los seis satélites —Weë
 * Studio, Weë Music, Weë Business, Weë Design, Weë Chef, Weë Travel—, que son
 * marca y se escriben igual en todos los idiomas. Salen de
 * `constants/weeExperiences.ts`, que es su única fuente. Tampoco están las
 * herramientas de la caja ni los precios: eso ya vive en `weeai`, y repetirlo
 * aquí acabaría con dos textos distintos para el mismo botón.
 */
export const brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'Tu asistente inteligente para todo',
  slogan: 'Imagina · Consulta · Crea · Conecta',
  description: 'Todo el poder de Weë, en una sola conversación.',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  /*
   * Lo que oye quien no ve la pantalla. El dibujo cuenta una sola cosa —que
   * todo Weë sale del mismo cerebro— y eso es lo que se dice, en una frase, en
   * vez de leer seis círculos y seis líneas.
   */
  systemLabel: 'Weë Brain, conectado con las demás secciones de Weë AI',
  goTo: 'Ir a {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'Escribe aquí tu mensaje...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  /*
   * Buscar en internet dejó de tener botón propio en la fila (decisión del
   * usuario, 2026-09-16) y pasó aquí dentro: no es una herramienta para
   * preparar el mensaje, es cómo quieres que Weë Brain conteste.
   */
  settingsHint: 'Cómo quieres que te conteste.',
  searchGroup: 'Buscar en internet',

  /*
   * Los dos primeros botones de la fila llevan a lo mismo —elegir una imagen—,
   * pero no se llaman igual: quien no ve la pantalla oiría "Adjuntar, Adjuntar"
   * y no sabría cuál es cuál. Y React, que usa el nombre para distinguirlos,
   * tampoco.
   */
  imageLabel: 'Imagen',
  settingsLabel: 'Ajustes',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  /*
   * Weë Brain se cobra por bloques: doce respuestas por un Credit (decisión del
   * usuario, 2026-09-16). Sin decirlo, el saldo bajaría una vez de cada doce sin
   * motivo aparente, que es justo lo que hace que una aplicación parezca rota.
   *
   * Va en la misma línea pequeña donde ya se lee el costo, sin dibujar nada
   * nuevo: se cuenta lo que queda, no lo gastado, porque lo que interesa antes
   * de escribir es cuántas te faltan.
   */
  blockLeft: 'Te quedan {{restantes}} de {{total}} respuestas',
};
