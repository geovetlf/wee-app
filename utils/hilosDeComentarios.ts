/**
 * LAS RESPUESTAS, DEBAJO DE SU COMENTARIO (R9, petición del dueño: «que se pueda comentar dentro de un comentario»).
 *
 * No hay colección, servicio ni sistema nuevo: un comentario que responde a otro es un documento más de `comments`
 * con `parentCommentId` —el campo que el modelo ya tenía (`services/firestoreService.ts`, «Para respuestas a
 * comentarios»)— y la suscripción de siempre (`commentsService.subscribeToPost`) ya los trae todos, del más antiguo al
 * más nuevo. Esto solo decide el ORDEN en que se pintan y cuáles van con sangría.
 *
 * Un solo nivel: responder a una respuesta cuelga del mismo comentario raíz (`raizDeRespuesta`), así la conversación
 * nunca se va escalonando hacia la derecha. Una respuesta cuyo comentario ya no está se enseña como comentario normal:
 * nada de lo que alguien escribió desaparece.
 *
 * Puro y sin React: lo ejecuta functions/test/weels-feed.test.mjs (sección F).
 */
export interface ComentarioConPadre {
  id?: string;
  parentCommentId?: string;
}

export interface LineaDelHilo<C extends ComentarioConPadre> {
  comentario: C;
  /** Va con sangría, debajo de su comentario raíz. */
  esRespuesta: boolean;
}

/** El comentario raíz del que cuelga uno (él mismo si no responde a nadie o si su cadena se rompe). */
export const raizDeRespuesta = <C extends ComentarioConPadre>(comentario: C, porId: Map<string, C>): C => {
  let actual = comentario;
  const vistos = new Set<string>();
  while (actual.parentCommentId && porId.has(actual.parentCommentId) && !vistos.has(actual.parentCommentId)) {
    vistos.add(actual.parentCommentId);
    actual = porId.get(actual.parentCommentId) as C;
  }
  return actual;
};

/** Los comentarios en el orden en que se pintan: cada raíz seguida de sus respuestas, todo en el orden de llegada. */
export const ordenarEnHilos = <C extends ComentarioConPadre>(comentarios: readonly C[]): LineaDelHilo<C>[] => {
  const porId = new Map<string, C>();
  comentarios.forEach((c) => { if (c.id) porId.set(c.id, c); });
  const respuestas = new Map<string, C[]>();
  const raices: C[] = [];
  comentarios.forEach((c) => {
    const raiz = raizDeRespuesta(c, porId);
    if (raiz === c || !raiz.id) raices.push(c);
    else respuestas.set(raiz.id, [...(respuestas.get(raiz.id) || []), c]);
  });
  const lineas: LineaDelHilo<C>[] = [];
  raices.forEach((r) => {
    lineas.push({ comentario: r, esRespuesta: false });
    (r.id ? respuestas.get(r.id) || [] : []).forEach((c) => lineas.push({ comentario: c, esRespuesta: true }));
  });
  return lineas;
};
