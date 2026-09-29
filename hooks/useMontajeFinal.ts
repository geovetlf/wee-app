import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { tomaService, type DestinoDelMontaje, type MontajeFinal } from '../services/tomaService';

/**
 * WEË FILMMAKER · EL MONTAJE FINAL DE UNA PRODUCCIÓN Y SU PUBLICACIÓN (Fase 14 del motor).
 *
 * Lo que el panel de exportar necesita, y nada más:
 *
 *   · el montaje de la revisión GUARDADA, si ya se pidió: cómo va y, cuando está
 *     hecho, la dirección de su vídeo y de su póster;
 *   · PEDIRLO, con un gesto: el servidor decide qué se monta desde lo guardado,
 *     y si la puerta del render está cerrada lo dice (`render_not_enabled`);
 *   · PUBLICARLO, con otro gesto: como Weël o en el Home, con la cara activa
 *     —la real o la Weë, la misma que usa el compositor—.
 *
 * Mientras el montaje está en marcha se vuelve a preguntar cada pocos segundos,
 * y solo entonces: un montaje hecho, fallido o sin pedir no pregunta nada.
 */

/** `desfasado` (Fase 26 del motor, R11): hay un montaje de esta revisión, pero se hizo con otras tomas de las que los planos tienen hoy. */
export type FaseDelMontaje = 'cargando' | 'sin_montaje' | 'pidiendo' | 'en_marcha' | 'hecho' | 'fallido' | 'no_disponible' | 'rechazado' | 'desfasado';
export type FaseDeLaPublicacion = 'nada' | 'publicando' | 'publicada' | 'ya_estaba' | 'rechazada';

export interface PublicacionDelMontaje {
  readonly fase: FaseDeLaPublicacion;
  readonly destino?: DestinoDelMontaje;
  /** Por qué no se publicó: el código del servidor o de la red. */
  readonly motivo?: string;
}

export interface MontajeDeLaProduccion {
  readonly fase: FaseDelMontaje;
  readonly montaje: MontajeFinal | null;
  readonly url: string | null;
  readonly poster: string | null;
  /** Por qué no se pudo pedir: el código del servidor o de la red. */
  readonly motivo: string | null;
  /** El tope del día, cuando ese fue el motivo. */
  readonly limite: number | null;
  /** Si el montaje hecho cabe en un Weël. El servidor lo vuelve a comprobar al publicar. */
  readonly cabeEnUnWeel: boolean;
  readonly publicacion: PublicacionDelMontaje;
  readonly pedir: () => void;
  readonly publicar: (destino: DestinoDelMontaje) => void;
}

/** Cada cuánto se pregunta por un montaje en marcha. */
export const CADA_CUANTO_SE_MIRA_MS = 5_000;
/** Lo que dura como mucho un Weël. Lo decide el servidor; aquí solo se usa para no ofrecer lo que no cabe. */
export const MAX_SEGUNDOS_DE_UN_WEEL = 15;

const EN_MARCHA: ReadonlySet<string> = new Set(['queued', 'processing', 'reconciling']);

export const faseDe = (m: MontajeFinal | null): FaseDelMontaje => {
  if (!m) return 'sin_montaje';
  if (m.state === 'completed') return 'hecho';
  if (m.state === 'failed') return 'fallido';
  return 'en_marcha';
};

/**
 * `refresco` (Fase 26 del motor): lo que distingue los vídeos que tienen puestos los planos. Enlazar otra toma no
 * cambia la revisión, pero sí el montaje que toca: cuando cambia, se vuelve a mirar.
 */
export const useMontajeFinal = (productionId: string | null, revision: number | null, refresco = ''): MontajeDeLaProduccion => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const cara = userProfile?.uid || user?.uid || null;
  const [fase, setFase] = useState<FaseDelMontaje>('cargando');
  const [montaje, setMontaje] = useState<MontajeFinal | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [limite, setLimite] = useState<number | null>(null);
  const [publicacion, setPublicacion] = useState<PublicacionDelMontaje>({ fase: 'nada' });
  /* Cada producción y revisión abre una generación nueva: lo que llega tarde de la anterior no se pinta. */
  const generacion = useRef(0);

  const ponerMontaje = useCallback(async (m: MontajeFinal | null, gen: number) => {
    if (gen !== generacion.current) return;
    setMontaje(m);
    setFase(faseDe(m));
    if (!m || m.state !== 'completed' || !m.assetId || !productionId) {
      setUrl(null);
      setPoster(null);
      return;
    }
    const [direccion, posters] = await Promise.all([tomaService.urlDelMaterial(m.assetId), tomaService.postersDeLaProduccion(productionId)]);
    if (gen !== generacion.current) return;
    setUrl(direccion);
    setPoster(posters.get(m.assetId) ?? null);
  }, [productionId]);

  /* Al abrir la producción, o al guardarse otra revisión: el montaje de ESA revisión, si se pidió. */
  useEffect(() => {
    const gen = ++generacion.current;
    setMotivo(null);
    setLimite(null);
    setPublicacion({ fase: 'nada' });
    if (!productionId || revision === null) {
      setMontaje(null);
      setFase('cargando');
      return;
    }
    setFase('cargando');
    void (async () => {
      const [lista, vigente] = await Promise.all([
        tomaService.montajesDeLaProduccion(productionId),
        tomaService.huellaDelMontajeVigente(productionId, revision),
      ]);
      if (gen !== generacion.current) return;
      const deLaRevision = lista?.find((m) => m.revision === revision) ?? null;
      /* Sin poder preguntar la huella de hoy, se sigue eligiendo por revisión, como antes: no se esconde lo que hay. */
      if (vigente === null) { await ponerMontaje(deLaRevision, gen); return; }
      /*
       * R11: el montaje que vale es el de la huella de HOY. Si el de esta revisión se hizo con otras tomas, está
       * desfasado: se dice, no se ofrece publicarlo y se ofrece montarlo otra vez.
       */
      const deHoy = vigente.lista ? lista?.find((m) => m.huella === vigente.huella) ?? null : null;
      if (!deHoy && deLaRevision) {
        setMontaje(null);
        setUrl(null);
        setPoster(null);
        setFase('desfasado');
        return;
      }
      await ponerMontaje(deHoy, gen);
    })();
    // `refresco` no se lee: basta con que cambie para volver a mirar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productionId, revision, refresco, ponerMontaje]);

  /* Mientras está en marcha, y solo entonces, se vuelve a preguntar. */
  useEffect(() => {
    if (!productionId || !montaje || !EN_MARCHA.has(montaje.state)) return undefined;
    const gen = generacion.current;
    const reloj = setTimeout(() => {
      void (async () => {
        const m = await tomaService.estadoDelMontaje(productionId, montaje.huella);
        /* Si no se pudo preguntar, se sigue con lo que había: la próxima vuelta lo intenta otra vez. */
        await ponerMontaje(m ?? { ...montaje }, gen);
      })();
    }, CADA_CUANTO_SE_MIRA_MS);
    return () => clearTimeout(reloj);
  }, [productionId, montaje, ponerMontaje]);

  const pedir = useCallback(() => {
    if (!productionId || revision === null || fase === 'pidiendo') return;
    const gen = generacion.current;
    setFase('pidiendo');
    setMotivo(null);
    setLimite(null);
    void (async () => {
      const r = await tomaService.pedirMontaje(productionId, revision);
      if (gen !== generacion.current) return;
      if (r.ok) {
        await ponerMontaje(r.montaje, gen);
        return;
      }
      setMotivo(r.motivo);
      setLimite(r.limite ?? null);
      setFase(r.motivo === 'render_not_enabled' ? 'no_disponible' : 'rechazado');
    })();
  }, [productionId, revision, fase, ponerMontaje]);

  const publicar = useCallback((destino: DestinoDelMontaje) => {
    if (!productionId || !montaje || montaje.state !== 'completed' || !cara || publicacion.fase === 'publicando') return;
    const gen = generacion.current;
    setPublicacion({ fase: 'publicando', destino });
    void (async () => {
      const r = await tomaService.publicarMontaje(productionId, montaje.huella, destino, cara);
      if (gen !== generacion.current) return;
      setPublicacion(r.ok ? { fase: r.yaEstaba ? 'ya_estaba' : 'publicada', destino } : { fase: 'rechazada', destino, motivo: r.motivo });
    })();
  }, [productionId, montaje, cara, publicacion.fase]);

  const cabeEnUnWeel = !!montaje && montaje.state === 'completed' && montaje.durationSec > 0 && montaje.durationSec <= MAX_SEGUNDOS_DE_UN_WEEL;
  return { fase, montaje, url, poster, motivo, limite, cabeEnUnWeel, publicacion, pedir, publicar };
};
