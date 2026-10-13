import { useEffect, useRef, useState } from 'react';
import { creatorService, CreatorJob } from '../services/creatorService';

/**
 * EL TRABAJO DE WEË AI DEL QUE SALE UNA PUBLICACIÓN, LEÍDO UNA VEZ.
 *
 * «Compartir cómo lo hice» propone los pasos que Weë ya apuntó al crear (`creatorJobs`: el plan y sus pasos). Este hook
 * los LEE: una suscripción de Firestore al trabajo que ya existe, que se suelta en cuanto llega la primera respuesta. No
 * ejecuta nada, no llama a ninguna IA y no toca Credits —el compositor sigue sin hablar con Weë AI para publicar—.
 *
 * Solo pregunta cuando `pedir` es verdadero (el interruptor encendido) y hay un `jobId`; publicar desde el Wäll, o con
 * el interruptor apagado, no hace ninguna lectura. Si se deja de pedir antes de que llegue, se suelta y se podrá volver
 * a preguntar.
 */
export const useTrabajoDeOrigen = (jobId: string | undefined, pedir: boolean): { trabajo?: CreatorJob | null; leyendo: boolean } => {
  const [estado, setEstado] = useState<{ trabajo?: CreatorJob | null; leyendo: boolean }>({ leyendo: false });
  const pedido = useRef(false);

  useEffect(() => {
    if (!pedir || !jobId || pedido.current) return;
    pedido.current = true;
    setEstado({ leyendo: true });
    let pendiente = true;
    let dejar: (() => void) | undefined;
    dejar = creatorService.subscribeToJob(jobId, (trabajo) => {
      if (!pendiente) return;
      pendiente = false;
      setEstado({ trabajo, leyendo: false });
      if (dejar) dejar();
    });
    return () => {
      if (!pendiente) return;
      pendiente = false;
      if (dejar) dejar();
      pedido.current = false;
      setEstado({ leyendo: false });
    };
  }, [jobId, pedir]);

  return estado;
};
