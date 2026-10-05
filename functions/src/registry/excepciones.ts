/**
 * LAS EXCEPCIONES A «SOLO MATRICES».
 *
 * La regla de Weë sigue siendo la de `matrices.ts`: se llama a quien entrena y sirve sus propios modelos, por su API
 * oficial directa, y nunca a un intermediario, un agregador ni un revendedor. Un intermediario añade un salto que Weë
 * no controla —disponibilidad, latencia, margen, límites— y cuando algo falla hay que saber de quién es la culpa.
 *
 * Esta lista es lo ÚNICO que permite una excepción, y cada entrada es una decisión del dueño con su fecha y su motivo.
 * Un agregador que no esté aquí no se registra como proveedor (lo vigila `core-registry`). Estar aquí no lo convierte
 * en núcleo de nada: es UN proveedor más detrás del mismo Router y del mismo Gateway, con su adaptador, y se puede
 * reemplazar sin tocar ninguna experiencia. Cada modelo suyo, además, declara su gobierno (licencia, uso comercial,
 * revisión) y sus reglas territoriales, y no es elegible hasta estar APPROVED, ACTIVE y permitido en las jurisdicciones
 * de la operación (`engine/elegibilidad.ts`); sin gobierno declarado, nunca.
 */
export interface ExcepcionDeAgregador {
  /** El id del adaptador en `ADAPTERS`. */
  id: string;
  aprobadaEl: string;
  motivo: string;
}

export const EXCEPCIONES_DE_AGREGADOR: readonly ExcepcionDeAgregador[] = Object.freeze([
  Object.freeze({
    id: 'fal',
    aprobadaEl: '2026-10-05',
    motivo: 'Excepción controlada del dueño: una infraestructura común para varios modelos relevantes (3D: Hunyuan World, '
      + 'Hunyuan 3D). Proveedor reemplazable, nunca gateway, router ni dependencia central.',
  }),
]);

export const esAgregadorAprobado = (id: string): boolean => EXCEPCIONES_DE_AGREGADOR.some((e) => e.id === id);
