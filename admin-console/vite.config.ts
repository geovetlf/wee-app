/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * La consola es una app aparte: su propio build, sus propias dependencias. Lo único que lee de fuera de su carpeta
 * es el traductor puro de Weë (`../i18n/*`: traducir, resolver, idiomas, formato), que no importa React ni
 * React Native. Por eso `fs.allow` abre esta carpeta y `../i18n`, y nada más del repositorio; el test de fronteras
 * (functions/test/admin-console-frontera.test.mjs) exige además que no se importe nada más de la raíz.
 */
export default defineConfig({
  plugins: [react()],
  /*
   * Los archivos de `../i18n` están fuera de esta carpeta, y esbuild buscaría SU tsconfig: el de la raíz, que hereda
   * de `expo/tsconfig.base` (un paquete de la app de usuario, que esta consola no instala). Con `tsconfigRaw` en
   * texto no se busca ninguno. El chequeo de tipos lo hace `tsc` con el tsconfig de esta carpeta.
   */
  esbuild: { tsconfigRaw: '{"compilerOptions":{"jsx":"react-jsx"}}' },
  server: { host: '127.0.0.1', port: 5174, strictPort: true, fs: { allow: [__dirname, path.resolve(__dirname, '../i18n')] } },
  preview: { host: '127.0.0.1', port: 5174 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/preparar.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
