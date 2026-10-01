// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/registry/capabilities.ts: no se edita a mano, se regenera.
import { CapabilityId, Modality } from '../capability';
import { CAPABILITY_CONTRACT_VERSION } from '../contracts';
export type CoreCapabilityId = CapabilityId | 'text.reason' | 'text.analyze' | 'text.transform' | 'image.analyze' | 'image.transform' | 'video.extend' | 'video.analyze' | 'audio.generate' | 'audio.edit' | 'audio.analyze' | 'music.edit' | 'music.extend' | 'music.analyze' | '3d.generate' | '3d.edit' | '3d.analyze' | '3d.texture' | '3d.retopology' | '3d.rig' | '3d.convert' | '3d.export' | 'architecture.design' | 'architecture.render' | 'product.design' | 'industrial.design' | 'vehicle.design' | 'furniture.design' | 'fashion.design' | 'packaging.design' | 'scene.generate' | 'render.generate' | 'render.product' | 'render.architecture' | 'render.interior' | 'render.scene' | 'document.generate' | 'document.analyze' | 'document.transform' | 'translation.text' | 'translation.detect';
export type CatalogStatus = 'ROUTABLE' | 'PENDING' | 'DECLARED' | 'DEPRECATED';
export type CapabilityCategory = 'text' | 'image' | 'video' | 'audio' | 'music' | '3d' | 'design' | 'render' | 'document' | 'translation';
export interface VarianteDeCapacidad {
    key: string;
    description: string;
}
export interface CatalogEntry {
    id: CoreCapabilityId;
    contract: typeof CAPABILITY_CONTRACT_VERSION;
    category: CapabilityCategory;
    accepts: readonly Modality[];
    produces: Modality;
    status: CatalogStatus;
    note?: string;
    variants?: readonly VarianteDeCapacidad[];
}
const e = (id: CoreCapabilityId, category: CapabilityCategory, accepts: readonly Modality[], produces: Modality, status: CatalogStatus, note?: string, variants?: readonly VarianteDeCapacidad[]): CatalogEntry => ({
    id, contract: CAPABILITY_CONTRACT_VERSION, category, accepts, produces, status, note,
    ...(variants?.length ? { variants: Object.freeze([...variants]) } : {}),
});
export const CAPABILITY_CATALOG: readonly CatalogEntry[] = [
    e('text.generate', 'text', ['text'], 'text', 'ROUTABLE', undefined, [
        { key: 'advise', description: 'Mirar lo que hay y aconsejar qué caminos existen, sin decidir por la persona ni producir todavía el resultado.' },
        { key: 'analysis', description: 'Resumir qué quiere lograr la persona, para quién es y cuál es la prioridad. No responde: ordena el encargo.' },
        { key: 'answer', description: 'Contestar una pregunta concreta y terminar con los siguientes pasos.' },
        { key: 'business', description: 'Redactar un documento de trabajo con secciones y acciones concretas.' },
        { key: 'campaign', description: 'Diseñar una campaña ENTERA: objetivo, público, mensaje, varias piezas, calendario y presupuesto. No es el texto de una pieza.' },
        { key: 'concept', description: 'Definir el concepto visual de algo que se va a dibujar después: idea, paleta, estilo y qué evitar.' },
        { key: 'copy', description: 'Escribir EL TEXTO pedido, listo para publicar o enviar. Una sola pieza, no un plan.' },
        { key: 'cv', description: 'Redactar un currículum.' },
        { key: 'facestyle', description: 'Recomendar cortes, peinados y complementos que favorecen a un rostro concreto.' },
        { key: 'layout', description: 'Proponer una distribución mejor de un espacio: qué mueble va dónde y por qué.' },
        { key: 'lyrics', description: 'Escribir la idea de una canción con su letra: título, ánimo y estrofa con estribillo.' },
        { key: 'menu', description: 'Armar un menú de varias comidas o varios días.' },
        { key: 'metrics', description: 'Explicar qué métricas mirar y cómo leerlas. Nunca inventa cifras.' },
        { key: 'mixnotes', description: 'Anotar qué ajustes de mezcla y máster convendrían.' },
        { key: 'narration', description: 'Escribir un texto corto pensado para leerse en voz alta.' },
        { key: 'polish', description: 'Mejorar un texto QUE YA EXISTE conservando su intención y su tono. No escribe uno nuevo.' },
        { key: 'published', description: 'Dejar un texto que ya existe en su forma final para publicarlo, con lo que pide cada red.' },
        { key: 'recipe', description: 'Escribir UNA receta con ingredientes y pasos.' },
        { key: 'reply', description: 'Escribir la respuesta a un cliente, lista para enviar.' },
        { key: 'schedule', description: 'Armar un calendario de publicaciones con día, hora y red.' },
        { key: 'script', description: 'Escribir un guion por escenas, con lo que se ve y lo que se narra en cada una.' },
        { key: 'shopping', description: 'Escribir una lista de cambios y compras, agrupada y priorizada.' },
        { key: 'skincare', description: 'Armar una rutina de cuidado de la piel.' },
    ]),
    e('text.structure', 'text', ['text'], 'text', 'ROUTABLE'),
    e('text.search', 'text', ['text'], 'text', 'ROUTABLE', undefined, [
        { key: 'activities', description: 'Buscar qué merece la pena hacer y dónde comer en un sitio que ya está decidido.' },
        { key: 'analysis', description: 'Buscar y resumir el panorama de algo: mercado, competencia o tendencias.' },
        { key: 'destinations', description: 'Buscar A QUÉ SITIOS ir, cuando todavía no hay destino elegido.' },
        { key: 'ideas', description: 'Buscar ángulos distintos desde los que escribir sobre algo.' },
        { key: 'itinerary', description: 'Armar el plan día a día de un viaje, con los destinos y las actividades ya sabidos.' },
        { key: 'shopping', description: 'Buscar qué comprar y cuánto cuesta.' },
        { key: 'transport', description: 'Buscar cómo moverse entre sitios concretos: opciones, duración y precio.' },
    ]),
    e('script.write', 'text', ['text'], 'text', 'ROUTABLE'),
    e('scene.split', 'text', ['text'], 'text', 'ROUTABLE'),
    e('subtitle.generate', 'text', ['text'], 'text', 'ROUTABLE'),
    e('text.reason', 'text', ['text'], 'text', 'DECLARED', 'Razonar es distinto de generar: otra calidad y otro coste.'),
    e('text.analyze', 'text', ['text'], 'text', 'DECLARED'),
    e('text.transform', 'text', ['text'], 'text', 'DECLARED'),
    e('image.generate', 'image', ['text'], 'image', 'ROUTABLE', undefined, [
        { key: 'business', description: 'Crear la imagen que acompaña a una publicación o a una campaña.' },
        { key: 'cover', description: 'Crear la portada de un libro o de un disco, con sitio para el título.' },
        { key: 'dish', description: 'Crear la foto de un plato terminado.' },
        { key: 'logo', description: 'Crear un logotipo, con las palabras pedidas bien escritas.' },
        { key: 'photo', description: 'Crear una imagen fotorrealista de algo que no existe todavía.' },
        { key: 'space', description: 'Crear la imagen de un espacio interior como referencia, sin partir de una foto.' },
    ]),
    e('image.edit', 'image', ['image', 'text'], 'image', 'ROUTABLE', undefined, [
        { key: 'colorize', description: 'Poner color a una foto en blanco y negro.' },
        { key: 'dish_edit', description: 'Retocar la foto de un plato que ya existe, sin cambiar el plato.' },
        { key: 'enhance', description: 'Mejorar la calidad, la nitidez y la luz de una foto SIN cambiar lo que muestra.' },
        { key: 'restore', description: 'Reparar el daño de una foto antigua: roturas, manchas, detalle perdido y color desvaído.' },
        { key: 'transform', description: 'Cambiarle el estilo a una foto, dejando reconocible lo que sale en ella.' },
    ]),
    e('image.reference', 'image', ['image', 'text'], 'image', 'ROUTABLE'),
    e('image.background_remove', 'image', ['image'], 'image', 'ROUTABLE', undefined, [
        { key: 'background', description: 'Quitar o cambiar el fondo, dejando el sujeto exactamente como está.' },
    ]),
    e('image.object_remove', 'image', ['image', 'text'], 'image', 'ROUTABLE', undefined, [
        { key: 'remove', description: 'Quitar algo que sobra en la foto y rehacer lo que había detrás.' },
    ]),
    e('image.identity_edit', 'image', ['image', 'text'], 'image', 'ROUTABLE', 'Conservar el rostro es lo que la define.', [
        { key: 'look', description: 'Cambiarle el look a una persona —pelo, maquillaje, barba, ropa— sin cambiarle la cara.' },
        { key: 'retouch', description: 'Retocar un rostro de forma natural, dejando a la persona plenamente reconocible.' },
    ]),
    e('image.space_restyle', 'image', ['image', 'text'], 'image', 'ROUTABLE', undefined, [
        { key: 'space', description: 'Rediseñar el espacio de una foto conservando su arquitectura: paredes, puertas y ventanas.' },
    ]),
    e('image.try_on', 'image', ['image'], 'image', 'ROUTABLE', undefined, [
        { key: 'look', description: 'Probarle una prenda a una persona sobre su propia foto.' },
    ]),
    e('image.upscale', 'image', ['image'], 'image', 'ROUTABLE'),
    e('vision.describe', 'image', ['image'], 'text', 'ROUTABLE', undefined, [
        { key: 'describe', description: 'Mirar una imagen y contar qué se ve, en qué estado está y qué detalles sirven para trabajar con ella.' },
    ]),
    e('image.analyze', 'image', ['image'], 'text', 'DECLARED'),
    e('image.transform', 'image', ['image'], 'image', 'DECLARED'),
    e('video.generate', 'video', ['text'], 'video', 'ROUTABLE', undefined, [
        { key: 'clip', description: 'Crear un vídeo corto desde cero, a partir de lo que se describe.' },
    ]),
    e('video.image_to_video', 'video', ['image', 'text'], 'video', 'ROUTABLE', undefined, [
        { key: 'clip', description: 'Animar una imagen que ya existe para convertirla en un vídeo corto.' },
    ]),
    e('video.reference', 'video', ['image', 'video', 'text'], 'video', 'ROUTABLE'),
    e('video.compose', 'video', ['video'], 'video', 'DECLARED', 'El motor la declara con cadena vacía: nadie la sirve.'),
    e('video.montage', 'video', ['video'], 'video', 'DECLARED', 'Cadena vacía en el motor.'),
    e('video.vertical', 'video', ['video'], 'video', 'DECLARED', 'Cadena vacía en el motor.'),
    e('video.extend', 'video', ['video'], 'video', 'DECLARED'),
    e('video.analyze', 'video', ['video'], 'text', 'DECLARED'),
    e('voice.tts', 'audio', ['text'], 'voice', 'ROUTABLE', undefined, [
        { key: 'lyrics', description: 'Cantar o leer en voz alta la letra de una canción.' },
        { key: 'narration', description: 'Leer en voz alta un texto de narración.' },
    ]),
    e('audio.transcribe', 'audio', ['voice'], 'text', 'ROUTABLE'),
    e('audio.sfx', 'audio', ['text'], 'music', 'PENDING', 'Su único eslabón está desactivado mientras no haya matriz.'),
    e('audio.generate', 'audio', ['text'], 'music', 'DECLARED'),
    e('audio.edit', 'audio', ['music'], 'music', 'DECLARED'),
    e('audio.analyze', 'audio', ['music'], 'text', 'DECLARED'),
    e('music.generate', 'music', ['text'], 'music', 'PENDING', 'Sin matriz con API oficial y licencia comercial todavía.', [
        { key: 'lyrics', description: 'Componer la música de una canción a partir de su letra.' },
    ]),
    e('music.edit', 'music', ['music', 'text'], 'music', 'DECLARED'),
    e('music.extend', 'music', ['music'], 'music', 'DECLARED'),
    e('music.analyze', 'music', ['music'], 'text', 'DECLARED'),
    e('3d.generate', '3d', ['text', 'image'], 'image', 'DECLARED', 'Produce geometría; la modalidad visual es lo más cercano que hay hoy.'),
    e('3d.edit', '3d', ['image', 'text'], 'image', 'DECLARED'),
    e('3d.analyze', '3d', ['image'], 'text', 'DECLARED'),
    e('3d.texture', '3d', ['image', 'text'], 'image', 'DECLARED'),
    e('3d.retopology', '3d', ['image'], 'image', 'DECLARED'),
    e('3d.rig', '3d', ['image'], 'image', 'DECLARED'),
    e('3d.convert', '3d', ['image'], 'image', 'DECLARED', 'Cambiar de formato: glTF, USDZ, OBJ…'),
    e('3d.export', '3d', ['image'], 'doc', 'DECLARED'),
    e('architecture.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('architecture.render', 'design', ['image', 'text'], 'image', 'DECLARED'),
    e('product.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('industrial.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('vehicle.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('furniture.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('fashion.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('packaging.design', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('scene.generate', 'design', ['text', 'image'], 'image', 'DECLARED'),
    e('render.generate', 'render', ['image', 'text'], 'image', 'DECLARED'),
    e('render.product', 'render', ['image', 'text'], 'image', 'DECLARED'),
    e('render.architecture', 'render', ['image', 'text'], 'image', 'DECLARED'),
    e('render.interior', 'render', ['image', 'text'], 'image', 'DECLARED'),
    e('render.scene', 'render', ['image', 'text'], 'image', 'DECLARED'),
    e('doc.read', 'document', ['doc'], 'text', 'ROUTABLE'),
    e('doc.render', 'document', ['text'], 'doc', 'DECLARED', 'Cadena vacía en el motor.'),
    e('document.generate', 'document', ['text'], 'doc', 'DECLARED'),
    e('document.analyze', 'document', ['doc'], 'text', 'DECLARED'),
    e('document.transform', 'document', ['doc'], 'doc', 'DECLARED'),
    e('translation.text', 'translation', ['text'], 'text', 'DECLARED', 'Weë Translation. Sin matriz integrada: la elección de proveedor llega en la Fase 20.'),
    e('translation.detect', 'translation', ['text'], 'text', 'DECLARED', 'En qué idioma está esto. Lo consumirá el Language Intelligence Layer (Fase 10).'),
];
export const familiaDeCapacidad = (id: CoreCapabilityId): string => String(id).split('.')[0];
export const capacidadesEnrutables = (): readonly CatalogEntry[] => CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE');
