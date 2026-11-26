import { FashionModo, SeleccionDeFashion } from '../constants/fashionModes';

/**
 * EL ENCARGO DE FASHION, ESCRITO EN EL IDIOMA DE QUIEN MIRA.
 *
 * Convierte lo elegido en el Composer en una frase para Weë Brain (la orientación de estilo). No es un prompt
 * técnico: es lo que diría la persona, armado con piezas traducidas e interpolación; nunca se pegan cadenas
 * sueltas. `t` y `lista` entran por parámetro (esto se importa fuera de React y traducir aquí congelaría el idioma
 * del arranque). Pura.
 */
export interface ArmadoresDeBrief {
  t: (clave: string, valores?: Record<string, string | number>) => string;
  lista: (elementos: string[]) => string;
}

export const armarBrief = ({ t, lista }: ArmadoresDeBrief, modo: FashionModo, sel: SeleccionDeFashion, texto: string): string => {
  const preferencias: string[] = [];
  for (const grupo of modo.grupos) {
    const elegida = sel.elegidas[grupo.id]?.[0];
    const opcion = grupo.opciones.find((o) => o.id === elegida);
    if (opcion) preferencias.push(t('fashion.reviewLine', { grupo: t(grupo.claveTitulo), valor: t(opcion.clave) }));
  }
  const partes: string[] = [];
  if (preferencias.length) partes.push(t('fashion.briefPrefs', { lista: lista(preferencias) }));
  const idea = texto.trim().slice(0, 300);
  if (idea) partes.push(t('fashion.briefIdea', { texto: idea }));
  if (sel.idk) partes.push(t('fashion.briefIdk'));
  const detalle = partes.length ? partes.join(' ') : t('fashion.briefNoDetail');
  return t(modo.claveBrief, { detalle });
};
