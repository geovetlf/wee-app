import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { creditsService, CreditsBalance, saldoVisible } from '../services/creditsService';

/**
 * Saldo de Credits de la cuenta, en tiempo real (docs/CREDITS.md).
 *
 * LA CUENTA ES LA SESIÓN. Los Credits son por cuenta y la cuenta es el uid de
 * Firebase Auth: la identidad autenticada, sin pasar por ningún perfil ni por
 * ningún prefijo. Antes este hook admitía un uid de perfil y le recortaba
 * `hidi_` para «deducir» la cuenta; eso era manipular una cadena, no resolver
 * una identidad. Ya no recibe nada: no hay nada que resolver.
 * Devuelve balance null mientras carga o si no hay sesión.
 */
export const useWallet = () => {
  const { user } = useAuth();
  const accountUid = user?.uid ?? null;
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
    /* Con su fracción en µCredits a la baja (nunca más de lo que hay); una cuenta sin fracción, el entero de siempre. */
    balance: account ? saldoVisible(account) : null,
  };
};

export default useWallet;
