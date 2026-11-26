import { useState, useEffect, useCallback } from 'react';
import { voteService, VoteType, VoteStats, CONTADOR_DE_VOTO } from '../services/voteService';

interface UseVoteOptions {
  postId: string;
  userId?: string;
  initialStats?: Partial<VoteStats>;
}

/*
 * Qué salió mal, como CÓDIGO y no como frase: esto es un hook, no sabe en qué idioma se mira, y hoy nadie lo pinta
 * (PostCard, el detalle y los Weëls solo leen `stats`). Antes guardaba frases en español escritas a mano; si algún día
 * se enseña, quien lo pinte elige la clave i18n según el código.
 */
export type ErrorDeVoto = 'sin-sesion' | 'voto-fallido' | 'quitar-voto-fallido';

interface UseVoteReturn {
  stats: VoteStats;
  isLoading: boolean;
  error: ErrorDeVoto | null;
  voteAgree: () => Promise<void>;
  voteDisagree: () => Promise<void>;
  removeVote: () => Promise<void>;
  toggleVote: (type: VoteType) => Promise<void>;
  refreshStats: () => Promise<void>;
}

/** Las estadísticas tal como quedan cuando el voto de la persona pasa a `nuevo` (null = sin voto). */
function conVoto(prev: VoteStats, nuevo: VoteType | null): VoteStats {
  const contadores: Record<string, number> = {
    agreementCount: prev.agreementCount,
    disagreementCount: prev.disagreementCount,
    fireCount: prev.fireCount ?? 0,
    laughCount: prev.laughCount ?? 0,
  };
  if (prev.userVote) contadores[CONTADOR_DE_VOTO[prev.userVote]] = Math.max(0, contadores[CONTADOR_DE_VOTO[prev.userVote]] - 1);
  if (nuevo) contadores[CONTADOR_DE_VOTO[nuevo]] += 1;
  return {
    ...prev,
    agreementCount: contadores.agreementCount,
    disagreementCount: contadores.disagreementCount,
    fireCount: contadores.fireCount,
    laughCount: contadores.laughCount,
    userVote: nuevo,
  };
}

export function useVote({ postId, userId, initialStats }: UseVoteOptions): UseVoteReturn {
  const [stats, setStats] = useState<VoteStats>({
    agreementCount: initialStats?.agreementCount ?? 0,
    disagreementCount: initialStats?.disagreementCount ?? 0,
    fireCount: initialStats?.fireCount ?? 0,
    laughCount: initialStats?.laughCount ?? 0,
    totalVotes: (initialStats?.agreementCount ?? 0) + (initialStats?.disagreementCount ?? 0),
    agreementPercentage: 0,
    userVote: initialStats?.userVote ?? null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorDeVoto | null>(null);

  // Calcular porcentaje cuando cambian los contadores
  useEffect(() => {
    const total = stats.agreementCount + stats.disagreementCount;
    const percentage = total > 0 ? Math.round((stats.agreementCount / total) * 100) : 0;
    if (percentage !== stats.agreementPercentage) {
      setStats(prev => ({ ...prev, agreementPercentage: percentage }));
    }
  }, [stats.agreementCount, stats.disagreementCount]);

  // Cargar voto del usuario al montar. Una lista recicla la tarjeta con OTRA publicación (o cambia la cara activa):
  // la respuesta que llega tarde es de la publicación de antes y no puede marcar el voto de la nueva.
  useEffect(() => {
    let vivo = true;
    if (userId && postId) {
      voteService.getUserVote(postId, userId).then(vote => {
        if (vivo) setStats(prev => ({ ...prev, userVote: vote }));
      });
    }
    return () => {
      vivo = false;
    };
  }, [postId, userId]);

  const refreshStats = useCallback(async () => {
    if (!postId) return;
    try {
      const newStats = await voteService.getVoteStats(postId, userId);
      setStats(newStats);
    } catch (err) {
      console.error('Error refreshing vote stats:', err);
    }
  }, [postId, userId]);

  const handleVote = useCallback(async (type: VoteType) => {
    if (!userId) {
      setError('sin-sesion');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Optimistic update: quitar el voto si repite el mismo tipo; si no, agregar o cambiar (los contadores se mueven de uno en uno)
    const previousStats = { ...stats };
    setStats(prev => conVoto(prev, prev.userVote === type ? null : type));

    try {
      await voteService.toggleVote(postId, userId, type);
    } catch (err) {
      // Revertir en caso de error
      setStats(previousStats);
      setError('voto-fallido');
      console.error('Error voting:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, userId, stats]);

  const voteAgree = useCallback(() => handleVote('agree'), [handleVote]);
  const voteDisagree = useCallback(() => handleVote('disagree'), [handleVote]);

  const removeVote = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    const previousStats = { ...stats };

    // Optimistic update
    setStats(prev => conVoto(prev, null));

    try {
      await voteService.removeVote(postId, userId);
    } catch (err) {
      setStats(previousStats);
      setError('quitar-voto-fallido');
      console.error('Error removing vote:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, userId, stats]);

  const toggleVote = useCallback((type: VoteType) => handleVote(type), [handleVote]);

  return {
    stats,
    isLoading,
    error,
    voteAgree,
    voteDisagree,
    removeVote,
    toggleVote,
    refreshStats,
  };
}

export default useVote;
