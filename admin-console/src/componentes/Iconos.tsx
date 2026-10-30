/*
 * LOS ICONOS DE LA CONSOLA: un solo juego, dibujado aquí a trazo, sin biblioteca. Son decorativos (`aria-hidden`): lo que
 * dicen lo dice siempre también un texto, porque ningún estado de la consola se comunica solo con un icono o un color.
 */
const TRAZOS = {
  panorama: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  motor: 'M8 8h8v8H8zM5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3',
  credits: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9.2A3.4 3.4 0 0 0 12 8c-1.7 0-3 .9-3 2s1.300 1.700 3 2 3 .9 3 2-1.300 2-3 2a3.400 3.400 0 0 1-3-1.200M12 6v2M12 16v2',
  moderacion: 'M5 21V4M5 4h11l-2 4 2 4H5',
  operaciones: 'M3 12h4l3-8 4 16 3-8h4',
  cuentas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.200a4 4 0 0 1 0 7.600M18 14.200A7 7 0 0 1 22 21',
  auditoria: 'M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6zM8.500 12l2.500 2.500 4.500-5',
  dominios: 'M12 3 3 8l9 5 9-5zM3 12.500l9 5 9-5M3 17l9 5 9-5',
  orden: 'M8 9.500 12 5.500l4 4M8 14.500l4 4 4-4',
  sube: 'M12 19V5M6.500 10.500 12 5l5.500 5.500',
  baja: 'M12 5v14M6.500 13.500 12 19l5.500-5.500',
  menu: 'M4 6h16M4 12h16M4 18h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  contraer: 'M4 5h16v14H4zM9 5v14M15.500 9.500 13 12l2.500 2.500',
  expandir: 'M4 5h16v14H4zM9 5v14M13 9.500 15.500 12 13 14.500',
  refrescar: 'M20 11a8 8 0 0 0-14.300-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14.300 4L20 15M20 20v-5h-5',
  correcto: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.500l2.700 2.700L16 9.500',
  atencion: 'M12 4 2.500 20h19zM12 10v4.500M12 17.200v.100',
  error: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9l6 6M15 9l-6 6',
  sinDatos: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12h8',
  noIntegrada: 'M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5',
  parcial: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M12 8h5M12 12h7M12 16h5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 7.800v.100',
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  flecha: 'M5 12h14M13 6l6 6-6 6',
  salir: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  candado: 'M6 11h12v9H6zM8.500 11V8a3.500 3.500 0 0 1 7 0v3',
} as const;

export type NombreDeIcono = keyof typeof TRAZOS;

export const Icono = ({ nombre, tamano = 18 }: { nombre: NombreDeIcono; tamano?: number }) => (
  <svg className="icono" aria-hidden="true" focusable="false" width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={TRAZOS[nombre]} />
  </svg>
);
