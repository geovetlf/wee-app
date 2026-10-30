import { useEffect, useState } from 'react';
import type { UsuarioDeSesion } from './auth/sesion';
import { MOTIVO_DE_ARRANQUE, type MotivoDeRechazo } from './arranque';
import { ProveedorDeIdioma, useT, type IdiomaDeLaConsola } from './i18n/i18n';
import type { Servicios } from './servicios';
import { Consola } from './vistas/Consola';
import { Login } from './vistas/Login';

type Fase = { fase: 'cargando' } | { fase: 'fuera' } | { fase: 'dentro'; usuario: UsuarioDeSesion };

const Raiz = ({ servicios }: { servicios: Servicios }) => {
  const t = useT();
  const [estado, setEstado] = useState<Fase>({ fase: 'cargando' });

  useEffect(() => servicios.sesion.observar((u) => setEstado(u ? { fase: 'dentro', usuario: u } : { fase: 'fuera' })), [servicios.sesion]);

  if (estado.fase === 'cargando') return <p className="estado centrado" role="status">{t('admin.comun.cargando')}</p>;
  if (estado.fase === 'fuera') return <Login sesion={servicios.sesion} />;
  return <Consola key={estado.usuario.uid} usuario={estado.usuario} cliente={servicios.cliente} sesion={servicios.sesion} />;
};

export const App = ({ servicios, idiomaInicial }: { servicios: Servicios; idiomaInicial?: IdiomaDeLaConsola }) => (
  <ProveedorDeIdioma inicial={idiomaInicial}>
    <Raiz servicios={servicios} />
  </ProveedorDeIdioma>
);

/** La consola no arranca (entorno no permitido): solo dice por qué. Sin sesión, sin Firebase, sin datos. */
export const PantallaDeArranqueRechazado = ({ motivo }: { motivo: MotivoDeRechazo }) => {
  const t = useT();
  return (
    <main className="pantalla-central">
      <div className="tarjeta-central" role="alert">
        <h1>{t('admin.arranque.titulo')}</h1>
        <p>{t(MOTIVO_DE_ARRANQUE[motivo])}</p>
        <p className="nota">{t('admin.arranque.ayuda')}</p>
      </div>
    </main>
  );
};
