import { useId, useRef, useState, type FormEvent } from 'react';
import { clasificarErrorDeInicio, validarAcceso, type ErrorDeInicioDeSesion, type FaltasDelFormulario, type ServicioDeSesion } from '../auth/sesion';
import { useT } from '../i18n/i18n';
import { Marca, SelectorDeIdioma } from '../componentes/Marco';

const CLAVE_DE_ERROR: Record<ErrorDeInicioDeSesion, string> = {
  credenciales: 'admin.login.errorCredenciales',
  correo: 'admin.login.errorCorreoFormato',
  demasiados: 'admin.login.errorDemasiados',
  red: 'admin.login.errorRed',
  otro: 'admin.login.errorOtro',
};

const CLAVE_DE_FALTA_DE_CORREO = { vacio: 'admin.login.errorCorreoVacio', formato: 'admin.login.errorCorreoFormato' } as const;

/** Correo y contraseña, y nada más. Entrar solo demuestra quién eres: el permiso lo decide el servidor después (`Consola`). */
export const Login = ({ sesion }: { sesion: ServicioDeSesion }) => {
  const t = useT();
  const id = useId();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<ErrorDeInicioDeSesion | null>(null);
  const [faltas, setFaltas] = useState<FaltasDelFormulario>({});
  /* El estado no cambia hasta el siguiente pintado: dos envíos seguidos verían los dos `enCurso === false`. */
  const enviando = useRef(false);
  const refCorreo = useRef<HTMLInputElement>(null);
  const refClave = useRef<HTMLInputElement>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando.current) return;
    const correo = email.trim();
    const nuevasFaltas = validarAcceso(correo, clave);
    setFaltas(nuevasFaltas);
    setError(null);
    if (nuevasFaltas.correo || nuevasFaltas.clave) {
      (nuevasFaltas.correo ? refCorreo : refClave).current?.focus();
      return;
    }
    enviando.current = true;
    setEnCurso(true);
    setVerClave(false);
    try {
      await sesion.entrar(correo, clave);
    } catch (fallo) {
      setError(clasificarErrorDeInicio(fallo));
      refClave.current?.focus();
    } finally {
      enviando.current = false;
      setEnCurso(false);
    }
  };

  return (
    <main className="pantalla-central">
      <div className="tarjeta-central">
        <div className="barra-minima"><Marca /><SelectorDeIdioma /></div>
        <h1>{t('admin.login.titulo')}</h1>
        <p className="nota">{t('admin.login.explicacion')}</p>
        <form className="formulario" onSubmit={enviar} noValidate aria-busy={enCurso}>
          <div className="campo-login">
            <label htmlFor={`${id}-correo`}>{t('admin.login.correo')}</label>
            <input
              id={`${id}-correo`}
              ref={refCorreo}
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              readOnly={enCurso}
              value={email}
              aria-invalid={faltas.correo ? true : undefined}
              aria-describedby={faltas.correo ? `${id}-correo-error` : undefined}
              onChange={(e) => { setEmail(e.target.value); setFaltas((f) => ({ ...f, correo: undefined })); }}
            />
            {faltas.correo && <p id={`${id}-correo-error`} className="error-campo">{t(CLAVE_DE_FALTA_DE_CORREO[faltas.correo])}</p>}
          </div>
          <div className="campo-login">
            <label htmlFor={`${id}-clave`}>{t('admin.login.clave')}</label>
            <div className="campo-clave">
              <input
                id={`${id}-clave`}
                ref={refClave}
                type={verClave ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                readOnly={enCurso}
                value={clave}
                aria-invalid={faltas.clave ? true : undefined}
                aria-describedby={faltas.clave ? `${id}-clave-error` : undefined}
                onChange={(e) => { setClave(e.target.value); setFaltas((f) => ({ ...f, clave: undefined })); }}
              />
              <button
                type="button"
                className="boton"
                disabled={enCurso}
                aria-controls={`${id}-clave`}
                aria-label={verClave ? t('admin.login.ocultarClave') : t('admin.login.mostrarClave')}
                onClick={() => setVerClave((v) => !v)}
              >
                {verClave ? t('admin.login.ocultar') : t('admin.login.mostrar')}
              </button>
            </div>
            {faltas.clave && <p id={`${id}-clave-error`} className="error-campo">{t('admin.login.errorClaveVacia')}</p>}
          </div>
          {error && <p className="estado error" role="alert">{t(CLAVE_DE_ERROR[error])}</p>}
          <button type="submit" className="boton primario" disabled={enCurso}>
            {enCurso ? t('admin.login.entrando') : t('admin.login.entrar')}
          </button>
        </form>
      </div>
    </main>
  );
};
