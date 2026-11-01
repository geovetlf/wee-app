/** Vite convierte la importación de una imagen en su URL. */
declare module '*.png' {
  const url: string;
  export default url;
}
