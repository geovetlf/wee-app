import { useState, type FormEvent } from 'react';
import { clasificarErrorDeInicio, type ErrorDeInicioDeSesion, type ServicioDeSesion } from '../auth/sesion';
import { useT } from '../i18n/i18n';
import { Icono } from '../componentes/Iconos';
import { Marca, SelectorDeIdioma } from '../componentes/Marco';

const CLAVE_DE_ERROR: Record<ErrorDeInicioDeSesion, string> = {
  credenciales: 'admin.login.errorCredenciales',
  demasiados: 'admin.login.errorDemasiados',
  red: 'admin.login.errorRed',
  otro: 'admin.login.errorOtro',
};

export const Login = ({ sesion }: { sesion: ServicioDeSesion }) => {
  const t = useT();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<ErrorDeInicioDeSesion | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enCurso) return;
    setEnCurso(true);
    setError(null);
    try {
      await sesion.entrar(email.trim(), clave);
    } catch (fallo) {
      setError(clasificarErrorDeInicio(fallo));
    } finally {
      setEnCurso(false);
    }
  };

  return (
    <main className="pantalla-central">
      <div className="tarjeta-central">
        <div className="barra-minima"><Marca /><SelectorDeIdioma /></div>
        <h1>{t('admin.login.titulo')}</h1>
        <p className="nota">{t('admin.login.explicacion')}</p>
        <form className="formulario" onSubmit={enviar}>
          <label>
            <span>{t('admin.login.correo')}</span>
            <input className="campo" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            <span>{t('admin.login.clave')}</span>
            <input className="campo" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
          {error && <p className="estado error" role="alert"><Icono nombre="error" /><span>{t(CLAVE_DE_ERROR[error])}</span></p>}
          <button type="submit" className="boton primario grande" disabled={enCurso}>
            {enCurso ? t('admin.login.entrando') : t('admin.login.entrar')}
          </button>
        </form>
      </div>
    </main>
  );
};
