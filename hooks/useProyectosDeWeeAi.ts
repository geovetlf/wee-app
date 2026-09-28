import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { projectsService, WeeProject } from '../services/projectsService';

/**
 * TUS PROYECTOS DE WEË AI, los de «Guardar en proyecto»: los más recientes
 * primero, de verdad —`creatorProjects`, no un catálogo de muestra—. Sin sesión
 * no hay proyectos, y se dice con la lista vacía, no con un error.
 */
export const useProyectosDeWeeAi = () => {
  const { user } = useAuth();
  const [carga, setCarga] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [proyectos, setProyectos] = useState<readonly WeeProject[]>([]);
  const ultima = useRef(0);

  const recargar = useCallback(async () => {
    const yo = ++ultima.current;
    if (!user) {
      setProyectos([]);
      setCarga('lista');
      return;
    }
    setCarga('cargando');
    try {
      const lista = await projectsService.list(user.uid);
      if (yo !== ultima.current) return;
      setProyectos(lista);
      setCarga('lista');
    } catch {
      if (yo === ultima.current) setCarga('error');
    }
  }, [user]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { carga, proyectos, recargar };
};
