import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { projectsService } from '../services/projectsService';

/**
 * Los Borradores de WeëAI (el proyecto marcado `tipo: 'borradores'`): su id y cuántas creaciones guarda. Se relee cada
 * vez que la pantalla vuelve a estar delante, para que la píldora de la portada diga la verdad tras guardar uno.
 * Sin sesión, o si todavía no existe, no hay nada que enseñar (la píldora no se pinta: no se inventan datos).
 */
export const useBorradores = (): { projectId: string | null; total: number } => {
  const { user } = useAuth();
  const enFoco = useIsFocused();
  const [estado, setEstado] = useState<{ projectId: string | null; total: number }>({ projectId: null, total: 0 });

  useEffect(() => {
    if (!user || !enFoco) return;
    let vigente = true;
    (async () => {
      try {
        const borradores = await projectsService.findDrafts(user.uid);
        if (!borradores) { if (vigente) setEstado({ projectId: null, total: 0 }); return; }
        const trabajos = await projectsService.jobsForProject(user.uid, borradores.id);
        if (vigente) setEstado({ projectId: borradores.id, total: trabajos.length });
      } catch {
        if (vigente) setEstado({ projectId: null, total: 0 });
      }
    })();
    return () => { vigente = false; };
  }, [user, enFoco]);

  return estado;
};
