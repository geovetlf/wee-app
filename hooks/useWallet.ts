import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountUidOf, creditsService, CreditsBalance } from '../services/creditsService';

/**
 * Saldo de Credits de la cuenta activa, en tiempo real (docs/CREDITS.md).
 * Los Credits son por cuenta: el Perfil Weë comparte el saldo del perfil real,
 * así que se escucha siempre el uid de Firebase Auth.
 * Devuelve balance null mientras carga o si no hay sesión.
 */
export const useWallet = (uid?: string | null) => {
  const { user } = useAuth();
  const accountUid = user?.uid || accountUidOf(uid);
  const [account, setAccount] = useState<CreditsBalance | null>(null);

  useEffect(() => {
    if (!accountUid) {
      setAccount(null);
      return;
    }
    return creditsService.subscribeToBalance(accountUid, setAccount);
  }, [accountUid]);

  return {
    /** Nombre heredado: la cuenta de Credits (saldo y acumulados). */
    wallet: account,
    account,
    balance: account ? account.balance : null,
  };
};

export default useWallet;
