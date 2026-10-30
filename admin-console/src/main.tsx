import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos.css';
import { App, PantallaDeArranqueRechazado } from './App';
import { crearCliente } from './api/cliente';
import { resolverEntorno } from './config/entorno';
import { conectarConLosEmuladores } from './firebase';
import { ProveedorDeIdioma } from './i18n/i18n';

const raiz = createRoot(document.getElementById('raiz')!);
const entorno = resolverEntorno(import.meta.env as unknown as Record<string, string | undefined>);

if (!entorno.ok) {
  raiz.render(
    <StrictMode>
      <ProveedorDeIdioma><PantallaDeArranqueRechazado motivo={entorno.motivo} /></ProveedorDeIdioma>
    </StrictMode>,
  );
} else {
  const firebase = conectarConLosEmuladores(entorno.entorno);
  raiz.render(
    <StrictMode>
      <App servicios={{ cliente: crearCliente(firebase.invocar), sesion: firebase.sesion }} />
    </StrictMode>,
  );
}
