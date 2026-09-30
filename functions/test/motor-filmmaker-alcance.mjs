/**
 * FILMMAKER ENGINE — LO QUE SUS FASES TOCAN, POR NOMBRE.
 *
 * Encargo del usuario del 2026-09-28, «CONTINUAR Y COMPLETAR FILMMAKER ENGINE»:
 * seguir el roadmap de `docs/FILMMAKER.md` (F2–F6) hasta dejar el motor
 * terminado, sin romper los contratos cerrados del vídeo, del material y del
 * dinero.
 *
 * Las vallas de las fases anteriores —la ruta asíncrona del vídeo, el puente
 * PRE-F1-D y F1-D— fijan «F1-A, productions y el Core, sin tocar» desde su
 * base. Siguen valiendo para lo suyo; esta lista es lo ÚNICO que dejan pasar,
 * archivo a archivo, y cada fase del motor añade aquí lo que toca con su porqué.
 * Nada del dinero puede entrar en ella: `filmmaker-lenguaje.test.mjs` lo vigila.
 */
export const TOCADOS_POR_EL_MOTOR = Object.freeze([
  /* Fase 1 · el lenguaje completo: 23 operaciones nuevas; modelo, validación, requisitos y recomendaciones, intactos. */
  'functions/src/filmmaker/operaciones.ts',
  /*
   * Fase 2 · el estado y la traza de una toma: un módulo NUEVO de solo lectura, que junta la reserva, el trabajo
   * (por `decidirLiquidacion`, la del barrido), la fila del libro, el material y el plano. Además toca, sin pasar
   * por esta lista porque las vallas de F1-D ya los nombran uno a uno, `creator/toma.ts` (leerUnidadDeToma),
   * `creator/video.ts` (solo `export` en PLAZO_DE_VIDEO_MS) y `shots/puerta.ts` (la operación `shot.takes`).
   * Fase 3 · la producción entera: el mismo módulo (`estadoDeLaProduccion`), `creator/toma.ts` (`unidadesGuardadas`,
   * que ahora usa también `shot.videos` con la misma regla y el mismo resultado) y `shots/puerta.ts` (`shot.production`).
   */
  'functions/src/creator/estadoDeToma.ts',
  /*
   * Fase 4 · la reserva de una toma que se quedó sin trabajo (decisión del usuario, 2026-09-28: SOLO esa; el POST sin
   * respuesta sigue retenido). Un módulo nuevo que decide qué reservas de tomas se devuelven —por el puerto de
   * liquidación del runtime, sin llamar al Credit Engine por su cuenta— y el programador, que solo lo compone. La
   * pasada del runtime gana el paso opcional `reservasSinTrabajo` en `runtime/index.ts`, que no pasa por esta lista
   * porque las vallas de F1-D ya lo nombran.
   */
  'functions/src/creator/recuperacionDeTomas.ts',
  'functions/src/settlement/programado.ts',
  /*
   * Fase 5 · el requisito de cada plano, calculado por el servidor con F1-A (decisión del usuario, 2026-09-28: la
   * valla G12 se amplía por nombre). Un módulo nuevo de solo lectura que lee la producción guardada con el lector de
   * `productions` y calcula sus requisitos; `creator/video.ts`, que ya nombran las vallas de F1-D, lo usa en vez del
   * requisito de la app, que solo se compara.
   */
  'functions/src/creator/requisitoDelServidor.ts',
  /*
   * Fase 6 (F4 del roadmap) · varios planos a la vez. Un módulo nuevo que ORQUESTA: presupuesta y genera las unidades
   * de una producción pidiéndole cada una a la puerta del vídeo —`creator/video.ts` gana el modo `produccion`—, con
   * el requisito del servidor. No cobra, no pone precio y no llama al conductor: eso lo sigue haciendo cada toma.
   */
  'functions/src/creator/lotes.ts',
  /*
   * Fase 7 (F5 del roadmap) · el montaje final, como manifiesto: qué se montaría y con qué, puro y con su huella; y
   * los argumentos de FFmpeg que lo ejecutarían (decisión del usuario: FFmpeg propio). Ninguno ejecuta nada: el
   * render llega cuando se decida dónde corre y cómo se instala el binario. `shots/puerta.ts` gana `shot.montage`.
   */
  'functions/src/creator/composicion.ts',
  'functions/src/creator/ffmpeg.ts',
  /*
   * Fase 8 (F5 del roadmap, segunda parte) · el render, ejecutado (decisiones del usuario, 2026-09-28: FFmpeg propio
   * como tarea general del Job Engine; el resultado, material `asset_` más un registro en la producción; gratis con
   * cinco al día). Tres módulos nuevos —el pedido y su registro, el ejecutor, y el trabajador con sus dos puertas— y
   * `index.ts`, que exporta esas dos puertas. `composicion.ts` gana `huellaDelManifiesto`. Ni Credits, ni el conductor.
   */
  'functions/src/creator/render.ts',
  'functions/src/creator/renderizador.ts',
  'functions/src/creator/renders.ts',
  'functions/src/index.ts',
  /*
   * Fase 9 (F2 del roadmap) · Weë Brain con la producción abierta (decisión del usuario, 2026-09-28): la caja del
   * editor es el mismo Weë Brain y solo cambia el contexto. Un módulo nuevo que lee la producción, la cuenta para el
   * prompt y comprueba lo que propone con F1-A EN MEMORIA; `prompts.ts` gana el vocabulario y la instrucción; y la
   * puerta de Weë Brain (`brain.ts`) la cuenta en la MISMA entrada que se cotiza —mismo servicio, mismo bloque de
   * doce, sin tocar cómo se cobra— y deja fuera del conductor los mensajes con producción. Nada se aplica solo.
   */
  'functions/src/creator/brain.ts',
  'functions/src/creator/prompts.ts',
  'functions/src/creator/produccionEnBrain.ts',
  /*
   * Fase 10 (F3 del roadmap) · los vínculos a Elements, verificados (decisión del usuario, 2026-09-28: «vínculo
   * verificado»). Guardar deja de rechazar todo vínculo «hasta F3» y comprueba los NUEVOS: un Element de la cuenta,
   * activo, de la clase que toca y en su versión de ahora. La puerta traduce el código nuevo. Generar no cambia.
   */
  'functions/src/productions/index.ts',
  'functions/src/productions/puerta.ts',
  /*
   * Fase 11 · los pósters (decisión del usuario, 2026-09-28: «pósters de las tomas»). Un módulo NUEVO —qué póster, de
   * qué vídeo, el trabajo y su lectura—; el renderizador gana el ejecutor del póster, el del montaje en el momento y
   * el latido de todo el intento; el trabajador, la tarea nueva y sus dos operaciones. La variante se escribe con
   * `anotarVariante` del Content Core, tal cual: el Content Core no se toca. Ni Credits, ni proveedores.
   */
  'functions/src/creator/poster.ts',
  /*
   * Fase 12 · restaurar una versión (D12 de F6; el usuario, sin preferencia, deja la recomendada): `productions/index.ts`
   * gana `restaurarRevision` y el tipo de revisión `restore` —sin campos nuevos—, y `reconstruirRevision` lo sigue;
   * `productions/puerta.ts` gana la operación `restore`. Los dos ya están en la lista desde la Fase 10. F1-A, sin tocar.
   *
   * Fase 13 · el prompt avanzado, usado al generar (D9 de F6; autorizado por el usuario, «AUTORIZADO D9 — ADVANCED
   * PROMPT»): toca `creator/plano.ts` —el texto de Weë, sin cambiar, y DETRÁS el bloque, entero o rechazado, sin
   * órdenes de proveedor, con la plantilla `fm-plano-2`— y `creator/video.ts` —la reserva guarda la plantilla de SU
   * texto—, que no entran aquí porque las vallas de F1-D ya los nombran uno a uno. En la app,
   * `utils/mensajesDeFilmmaker.ts` y una clave en los once diccionarios. F1-A, el dinero y el Job Engine, sin tocar.
   */
  /*
   * Fase 14 · publicar el montaje (D8; encargo del usuario del 2026-09-28, «CERRAR EL FILMMAKER ENGINE»): un módulo
   * NUEVO que comprueba —cara, render hecho, material, archivo, duración— y escribe la publicación con la forma del
   * compositor; la puerta `renders` (ya en la lista) gana `render.publish`. Ni Credits, ni proveedores, ni reglas.
   */
  'functions/src/creator/publicacion.ts',
  /*
   * Fase 15 · cancelar una toma (D11; mismo encargo): un módulo NUEVO que decide y ejecuta la cancelación con lo que
   * ya existe —`JobEngine.cancelar`/`evaluar`, `decidirLiquidacion`, el puerto `liquidacionDeWee().reembolsar` y el
   * compare-and-set del almacén— y la consuma después desde la pasada programada (`settlement/programado.ts`, ya en la
   * lista); `creator/video.ts` (nombrado por las vallas de F1-D) gana el modo `cancelar` y `creator/estadoDeToma.ts`
   * dos motivos. El adaptador de Seedance gana `pararTareaDeSeedance` —PREGUNTA antes y solo borra lo que está en
   * cola—, que solo llama la cancelación y solo con su puerta abierta (`aiSettings/cancelacion`, cerrada por defecto).
   * El adaptador NO entra en esta lista: su tamaño lo fijan por nombre video-asincrono H2 y puente-pre-f1d E4, que se
   * reanclan con esta fase, y la suite de la fase comprueba que su cambio es solo esa función añadida.
   * Ni el Credit Engine, ni el Job Engine, ni el runtime cambian.
   */
  'functions/src/creator/cancelacionDeToma.ts',
  /*
   * Fase 17 · el vocabulario de cámara v2 (D14; mismo encargo: «debe integrarse al Core de forma determinista…
   * versionar el contrato si es necesario»): `core/creative.ts` gana nueve valores AL FINAL de tres listas —encuadres
   * extreme_wide, full, medium_close_up, over_the_shoulder e insert; movimientos zoom_in, zoom_out y rack_focus;
   * composición leading_lines—, que son de la VERSIÓN 2 del lenguaje y solo de ella: con `version: 1` no existen. Ni
   * una ruta nueva, ni un valor de la 1 movido, y `CREATIVE_PARAMETERS_VERSION` sigue en 1 (la versión con que Weë
   * escribe por defecto). F1-A (`filmmaker/operaciones.ts`, ya en la lista) escribe la 2 SOLO cuando hace falta, así
   * que lo que ya existe se sigue escribiendo igual, byte a byte; `creator/prompts.ts` (en la lista) enseña los nueve a
   * Weë Brain en el editor de producciones. El texto del plano (`creator/plano.ts`) no cambia ni una coma.
   */
  'functions/src/core/creative.ts',
  /*
   * Fase 18 · las referencias de los Elements, preparadas y cerradas (mismo encargo: «referencias de Elements, canary,
   * sin gasto real»): un módulo NUEVO que saca los vínculos del plano del requisito del SERVIDOR, lee cada Element por
   * su runtime y sus materiales de imagen por el Content Core, y decide —puro— si se usarían: hace falta la puerta de
   * la cuenta abierta (`aiSettings/referencias`, cerrada) Y un modelo validado (la lista está VACÍA, en el código). La
   * puerta del vídeo (`creator/video.ts`, nombrada por las vallas de F1-D) solo lo CUENTA al cotizar. Ni una capacidad
   * nueva al Core, ni un proveedor, ni Credits: la toma sigue siendo `video.generate` con el texto de siempre.
   */
  'functions/src/creator/referenciasDeElementos.ts',
  /*
   * Fase 19 · las voces del diálogo (mismo encargo: «voces de diálogo, canary, sin gasto real»): un módulo NUEVO con el
   * catálogo de voces de Weë para Filmmaker —VACÍO, en el código—, la comprobación pura de una asignación (quien habla
   * → voz del catálogo, para sus usos y sus idiomas) detrás de su puerta (`aiSettings/voces`, cerrada), y el plan de
   * voces de una producción guardada, solo LEÍDO. La puerta `renders` (ya en la lista) gana `voice.plan`. Ni se guarda
   * una asignación, ni se sintetiza, ni se cobra, ni se llama a un proveedor; F1-A, sin tocar.
   */
  'functions/src/creator/vocesDeDialogo.ts',
  /*
   * Fase 20 · conectar en la app lo que el motor ya hace (encargo del usuario del 2026-09-28, «CERRAR EL FILMMAKER
   * ENGINE»): la puerta `elements` gana `list` —los vivos de la cuenta, de una clase, sin sus materiales, por el
   * `candidatosDeLaCuenta` de siempre— para vincular las fichas de una producción. `productions` (ya en la lista) gana
   * `history`, que solo LEE las versiones. Ni se escribe nada nuevo, ni Credits, ni proveedores, ni una Function nueva.
   */
  'functions/src/elements/puerta.ts',
  /*
   * Fase 22 · los arreglos de la auditoría final (encargo del usuario del 2026-09-28, «MASTER EXECUTION PROMPT», fase A):
   * `elements/index.ts` gana `paginaDeElementosDeLaCuenta` —los de una clase, por páginas y en orden estable por su
   * id, con cursor— para que `list` deje de tener el tope de ocho (R7). `candidatosDeLaCuenta`, que usa el contexto
   * visual de Weë Brain, no cambia ni una coma. `creator/produccionEnBrain.ts`, `brain.ts` y `prompts.ts` (ya en la
   * lista) ponen el id de lo nuevo que propone Weë Brain, su porqué, y dejan de contar una respuesta sin propuesta
   * aplicable (R1). Ni se escribe nada nuevo, ni Credits, ni proveedores, ni una Function nueva.
   */
  'functions/src/elements/index.ts',
  /*
   * Fase 33 · los riesgos del motor que se cierran sin gastar (encargo del usuario del 2026-09-29, «Fase 32 en
   * adelante»): el Weë Video Engine pide `adaptive` al editar y extender un vídeo —Seedance 2.5 la exige— (R19) y
   * deja de reenviar al adaptador los segundos de vídeo de entrada que declara quien llama (R22). No es dinero: el
   * precio lo sigue calculando `credits/aiPricing.ts`, sin tocar; aquí solo se deja de pasar un dato del cliente. El
   * adaptador de Seedance NO entra en esta lista: su tamaño lo fijan por nombre video-asincrono H2 y puente-pre-f1d
   * E4, reancladas con esta fase, igual que en la Fase 15.
   */
  'functions/src/engine/video.ts',
  /*
   * 3D dentro de Filmmaker (encargo del usuario del 2026-09-29): el registro de matrices candidatas verifica Tripo y
   * Hunyuan 3D contra sus APIs oficiales y suma Meshy y World Labs, todas PENDING y SIN capacidades ni modelos —nada
   * puede elegirlas; la validación del registro lo impide—. Ni un adaptador, ni una cadena, ni Credits.
   */
  'functions/src/registry/matrices.ts',
]);

/** Lo que una valla anterior ve cambiado, sin lo que el motor tiene dicho que toca. */
export const fueraDelMotor = (archivos) => archivos.filter((f) => !TOCADOS_POR_EL_MOTOR.includes(f));

/** Lo que el motor no puede tocar nunca por esta lista: el dinero. */
export const DINERO = Object.freeze([/^functions\/src\/credits\//, /^functions\/src\/core\/financial\//, /^functions\/src\/core\/router\.ts$/]);
