import type { ReactNode } from 'react';

export const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="seccion">
    <h2>{titulo}</h2>
    {children}
  </section>
);

export const Dato = ({ etiqueta, valor, resaltar }: { etiqueta: string; valor: ReactNode; resaltar?: boolean }) => (
  <div className={`dato${resaltar ? ' resaltado' : ''}`}>
    <dt>{etiqueta}</dt>
    <dd>{valor}</dd>
  </div>
);

export const Datos = ({ children }: { children: ReactNode }) => <dl className="datos">{children}</dl>;

export const Tabla = ({ cabeceras, children }: { cabeceras: string[]; children: ReactNode }) => (
  <div className="tabla-contenedor">
    <table>
      <thead>
        <tr>{cabeceras.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const Etiqueta = ({ children, tono }: { children: ReactNode; tono?: 'ok' | 'aviso' | 'neutro' }) => (
  <span className={`etiqueta ${tono ?? 'neutro'}`}>{children}</span>
);
