// GENERADO por scripts/espejo-filmmaker.mjs desde functions/src/core/language.ts: no se edita a mano, se regenera.
export type LanguageTag = string & {
    readonly __languageTag: unique symbol;
};
const FORMA_DE_ETIQUETA = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
export const normalizarEtiqueta = (crudo: unknown): LanguageTag | null => {
    const limpio = String(crudo ?? '').trim();
    if (!limpio || !FORMA_DE_ETIQUETA.test(limpio))
        return null;
    const [idioma, ...resto] = limpio.split('-');
    const partes = [
        idioma.toLowerCase(),
        ...resto.map((t) => {
            if (/^[A-Za-z]{4}$/.test(t))
                return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
            if (/^[A-Za-z]{2}$/.test(t) || /^\d{3}$/.test(t))
                return t.toUpperCase();
            return t;
        }),
    ];
    return partes.join('-') as LanguageTag;
};
export const idiomaDe = (tag: LanguageTag): string => String(tag).split('-')[0].toLowerCase();
export interface LanguageContext {
    appLanguage: LanguageTag;
    userLocale?: LanguageTag;
    inputLanguage?: LanguageTag;
    outputLanguage?: LanguageTag;
    contentLanguage?: LanguageTag;
}
export const idiomaDeSalida = (ctx: LanguageContext): LanguageTag => ctx.outputLanguage || ctx.contentLanguage || ctx.appLanguage;
export const idiomaDeEntrada = (ctx: LanguageContext): LanguageTag => ctx.inputLanguage || ctx.appLanguage;
export const localeDeFormato = (ctx: LanguageContext): LanguageTag => ctx.userLocale || ctx.appLanguage;
export interface ProviderLanguageSupport {
    only?: readonly string[];
    note: string;
}
export interface LanguagePlan {
    providerLanguage: LanguageTag;
    needsAdaptation: boolean;
    reason: string;
    billable: false;
}
export const planificarIdiomaDelProveedor = (textLanguage: LanguageTag, support: ProviderLanguageSupport | undefined): LanguagePlan => {
    const admitidos = support?.only;
    if (!admitidos || admitidos.length === 0) {
        return {
            providerLanguage: textLanguage,
            needsAdaptation: false,
            reason: 'el proveedor no declara restricción de idioma',
            billable: false,
        };
    }
    const lengua = idiomaDe(textLanguage);
    if (admitidos.some((a) => a.toLowerCase() === lengua)) {
        return {
            providerLanguage: textLanguage,
            needsAdaptation: false,
            reason: 'el proveedor ya admite este idioma',
            billable: false,
        };
    }
    const destino = normalizarEtiqueta(admitidos[0]);
    return {
        providerLanguage: destino || (('en' as string) as LanguageTag),
        needsAdaptation: true,
        reason: `el proveedor solo admite ${admitidos.join(', ')}`,
        billable: false,
    };
};
export type TranslationContentType = 'plain' | 'document' | 'subtitles' | 'speech';
export type TranslationMode = 'literal' | 'natural' | 'localized';
export interface TranslationTerminology {
    glossary?: Readonly<Record<string, string>>;
    doNotTranslate?: readonly string[];
    context?: string;
}
export interface TranslationRequest {
    sourceLanguage?: LanguageTag;
    targetLanguage: LanguageTag;
    detectedLanguage?: LanguageTag;
    locale?: LanguageTag;
    contentType: TranslationContentType;
    mode: TranslationMode;
    terminology?: TranslationTerminology;
}
export const admiteElPar = (soporte: {
    only?: readonly string[];
    inputLanguages?: readonly string[];
    outputLanguages?: readonly string[];
} | undefined, source: LanguageTag | undefined, target: LanguageTag): boolean => {
    if (!soporte)
        return true;
    const admite = (declarados: readonly string[] | undefined, etiqueta: LanguageTag | undefined): boolean => {
        if (!declarados || declarados.length === 0 || !etiqueta)
            return true;
        const lengua = idiomaDe(etiqueta);
        return declarados.some((d) => d.toLowerCase() === lengua);
    };
    const entrada = soporte.inputLanguages ?? soporte.only;
    const salida = soporte.outputLanguages ?? soporte.only;
    return admite(entrada, source) && admite(salida, target);
};
export const contextoDeIdioma = (crudo: Partial<Record<keyof LanguageContext, unknown>>, reserva: LanguageTag = ('en' as string) as LanguageTag): LanguageContext => {
    const tag = (v: unknown) => normalizarEtiqueta(v) ?? undefined;
    return {
        appLanguage: tag(crudo.appLanguage) ?? reserva,
        userLocale: tag(crudo.userLocale),
        inputLanguage: tag(crudo.inputLanguage),
        outputLanguage: tag(crudo.outputLanguage),
        contentLanguage: tag(crudo.contentLanguage),
    };
};
