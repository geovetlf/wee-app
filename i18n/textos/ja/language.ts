/*
 * JAPONÉS — Configuración → Idioma.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Idioma de la interfaz» es 表示言語, como lo llaman los sistemas en japonés.
 * «Próximamente», para un idioma, es 近日対応 (glosario); el título de la
 * sección lo dice entero: 対応予定の言語.
 */
export const language: typeof import('../es/language').language = {
  title: '言語',
  explanation: 'Weëの表示言語を変更できます。投稿やコメントは、書いた人の言葉のまま表示されます。',
  comingSoon: '近日対応',
  comingSoonTitle: '対応予定の言語',
  selected: '選択中',
};
