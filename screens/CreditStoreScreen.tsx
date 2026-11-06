import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { creditsService, ConfiguracionDeCompra, newRequestId } from '../services/creditsService';
import { notify } from '../utils/notify';
import CompraPorImporte, { CompraElegida } from '../components/tienda/CompraPorImporte';

/**
 * Tienda de Credits (docs/CREDITS.md §10): la compra por importe de la demo YC, de verdad.
 *
 * La app no decide nada de dinero:
 *   · el saldo es el de la cuenta (`useWallet`, el mismo monedero para el Perfil Real y el Perfil Weë);
 *   · la regla (US$5–100, de 5 en 5, 100 Credits por dólar) la manda el servidor (`getCreditCost` → `compra`);
 *   · la compra la valida, la confirma con el proveedor y la acredita el servidor (`validatePurchase`). Mientras
 *     no haya pagos conectados, la "recarga de prueba" la resuelve el proveedor `test` (solo dev y emuladores).
 * El saldo de la pantalla cambia cuando el servidor escribe la compra, por la escucha en tiempo real.
 *
 * Reintentos: el `requestId` de una compra se conserva mientras no haya una respuesta definitiva del servidor.
 * Si se cae la red y la persona vuelve a pulsar, es LA MISMA orden: el servidor no acredita dos veces.
 */
/** El mercado de facturación. No se deduce del idioma ni de la ubicación; hoy la app factura en dólares. */
const MERCADO: 'US' | 'PE' = 'US';

/** Respuestas del servidor que cierran la compra (aceptada o rechazada): después, un requestId nuevo. */
const DEFINITIVAS = ['PURCHASE_INVALID', 'INVALID_REQUEST', 'NOT_IMPLEMENTED', 'unimplemented', 'failed-precondition', 'invalid-argument', 'permission-denied'];

const CreditStoreScreen = () => {
  const { t, formato } = useIdioma();
  const { user } = useAuth();
  const nav = useNavigation();
  const { balance } = useWallet();

  const [compra, setCompra] = useState<ConfiguracionDeCompra | null>(null);
  const [catalogo, setCatalogo] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [purchasing, setPurchasing] = useState(false);
  const pendiente = useRef<{ clave: string; requestId: string } | null>(null);
  const mercado = MERCADO;

  // Los Credits son por cuenta (uid de Auth): el Perfil Weë comparte el saldo
  const accountUid = user?.uid;

  // La regla de la compra la decide el servidor: es la única fuente.
  const cargarCatalogo = useCallback(() => {
    let cancelled = false;
    setCatalogo('cargando');
    creditsService
      .getCosts()
      .then(({ compra: delServidor }) => {
        if (cancelled) return;
        setCompra(delServidor);
        setCatalogo(delServidor ? 'listo' : 'error');
      })
      .catch(() => {
        if (!cancelled) setCatalogo('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => (accountUid ? cargarCatalogo() : undefined), [accountUid, cargarCatalogo]);

  const handlePurchase = async (elegida: CompraElegida) => {
    if (!accountUid) return (nav as any).navigate('Login');
    if (purchasing) return;
    setPurchasing(true);
    const clave = `${mercado}:${elegida.amountUsd}:${elegida.displayed.currency}:${elegida.displayed.amountMinor}:${elegida.credits}`;
    if (!pendiente.current || pendiente.current.clave !== clave) pendiente.current = { clave, requestId: newRequestId('compra') };
    try {
      // Sin pagos conectados todavía: recarga de prueba validada y acreditada por el servidor (solo dev)
      const result = await creditsService.comprarImporte({
        requestId: pendiente.current.requestId,
        amountUsd: elegida.amountUsd,
        market: mercado,
        displayed: elegida.displayed,
        credits: elegida.credits,
      }, 'test');
      pendiente.current = null;
      notify(t('credits.testTopUpReady'), t('credits.testTopUpDone', { cantidad: formato.numero(result.credits) }));
    } catch (e) {
      const details = (e as any)?.details || {};
      const code = String(details.code || (e as any)?.code || '');
      const motivo = String(details.motivo || '');
      if (DEFINITIVAS.some((c) => code.includes(c))) pendiente.current = null;
      const message = motivo === 'mercado_no_disponible' ? t('credits.buyMarketUnavailable')
        : code.includes('NOT_IMPLEMENTED') || code.includes('unimplemented') || (code.includes('PURCHASE_INVALID') && !motivo)
          ? t('credits.purchasesComingSoon')
          : t('credits.topUpFailed');
      notify(t('credits.topUpFailedTitle'), message);
      // Si el servidor dijo que lo enseñado no coincide, se vuelve a pedir la regla vigente.
      if (motivo) cargarCatalogo();
    }
    setPurchasing(false);
  };

  return (
    <CompraPorImporte
      saldo={accountUid ? balance : 0}
      compra={compra}
      mercado={mercado}
      estadoDelCatalogo={catalogo}
      comprando={purchasing}
      onComprar={handlePurchase}
      onReintentar={cargarCatalogo}
      onCerrar={() => nav.goBack()}
      onHistorial={() => (nav as any).navigate('Wallet')}
    />
  );
};

export default CreditStoreScreen;
