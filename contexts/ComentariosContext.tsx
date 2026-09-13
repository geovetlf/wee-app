import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Post } from '../services/firestoreService';
import { refNavegacion } from '../navigation/refNavegacion';
import HojaDeComentarios from '../components/HojaDeComentarios';

interface Comentarios {
  /** Abre la conversación de una publicación, encima de donde estés. */
  abrirComentarios: (post: Post) => void;
  cerrarComentarios: () => void;
}

const ComentariosContext = createContext<Comentarios | undefined>(undefined);

/**
 * LA CONVERSACIÓN SE ABRE DESDE CUALQUIER MURO, Y LA HOJA ES UNA SOLA.
 *
 * Las publicaciones se pintan en varios sitios —el muro del Home, la portada
 * web, los muros de sección— y todas usan el mismo `PostCard`. Si cada pantalla
 * montara su propia hoja habría cuatro copias del mismo panel y cuatro sitios
 * donde arreglar lo mismo. Se monta UNA, aquí arriba, y las pantallas solo
 * dicen qué publicación abrir.
 *
 * Es el mismo reparto que ya tiene Weë con la hoja de "Crear", que vive en la
 * navegación global y no dentro de cada muro.
 */
export const ComentariosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [post, setPost] = useState<Post | null>(null);

  const abrirComentarios = useCallback((elegido: Post) => setPost(elegido), []);
  const cerrarComentarios = useCallback(() => setPost(null), []);

  /*
   * Desde un comentario se sigue pudiendo ir al perfil de quien lo escribió
   * —tocando su avatar o su nombre—, que es donde esa navegación tiene sentido.
   * Lo que ya no pasa es lo contrario: abrir la conversación no lleva a ningún
   * perfil. La hoja se cierra al salir, para no dejarla detrás.
   */
  const abrirPerfil = useCallback((userId: string) => {
    setPost(null);
    if (refNavegacion.isReady()) (refNavegacion as any).navigate('UserProfile', { userId });
  }, []);

  const valor = useMemo(() => ({ abrirComentarios, cerrarComentarios }), [abrirComentarios, cerrarComentarios]);

  return (
    <ComentariosContext.Provider value={valor}>
      {children}
      <HojaDeComentarios visible={!!post} post={post} onClose={cerrarComentarios} onAbrirPerfil={abrirPerfil} />
    </ComentariosContext.Provider>
  );
};

export const useComentariosDeLaPublicacion = (): Comentarios => {
  const valor = useContext(ComentariosContext);
  if (!valor) throw new Error('useComentariosDeLaPublicacion necesita estar dentro de ComentariosProvider');
  return valor;
};
