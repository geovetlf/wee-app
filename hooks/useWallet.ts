import { useEffect, useState } from 'react';
import { creditsService, Wallet } from '../services/creditsService';

/**
 * Saldo de Credits del usuario activo, en tiempo real.
 * Devuelve null mientras carga o si no hay usuario.
 */
export const useWallet = (uid?: string | null) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (!uid) {
      setWallet(null);
      return;
    }
    return creditsService.subscribeToWallet(uid, setWallet);
  }, [uid]);

  return {
    wallet,
    balance: wallet ? wallet.balance : null,
  };
};

export default useWallet;
