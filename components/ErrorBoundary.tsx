import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { localeDeEmergencia } from '../i18n/emergencia';

/*
 * LAS TRES FRASES DE LA PANTALLA DE ERROR, ESCRITAS AQUÍ A PROPÓSITO.
 *
 * Esta pantalla aparece justo cuando algo ha dejado de funcionar, y no puede
 * depender del sistema de traducción: si el fallo viniera de ahí, se caería con
 * él. `ErrorBoundary` además vive por fuera de `IdiomaProvider`, así que no hay
 * contexto que consultar. Por eso están aquí y no en `i18n/textos/`.
 *
 * Antes estaban solo en español, y alguien con la aplicación en chino o en
 * coreano se encontraba de golpe con un idioma que no eligió, en el peor
 * momento posible.
 */
const TEXTOS: Record<string, { titulo: string; mensaje: string; boton: string }> = {
  es: { titulo: 'Algo salió mal', mensaje: 'Weë encontró un error inesperado. Intenta de nuevo; si sigue pasando, cuéntanoslo desde Ayuda.', boton: 'Intentar de nuevo' },
  en: { titulo: 'Something went wrong', mensaje: 'Weë ran into an unexpected error. Try again; if it keeps happening, tell us from Help.', boton: 'Try again' },
  de: { titulo: 'Da ist etwas schiefgelaufen', mensaje: 'In Weë ist ein unerwarteter Fehler aufgetreten. Versuch es noch einmal; wenn es weiter passiert, sag uns über die Hilfe Bescheid.', boton: 'Noch einmal versuchen' },
  fr: { titulo: 'Quelque chose s’est mal passé', mensaje: 'Weë a rencontré une erreur inattendue. Réessaie ; si cela continue, dis-le-nous depuis l’Aide.', boton: 'Réessayer' },
  it: { titulo: 'Qualcosa è andato storto', mensaje: 'Weë ha incontrato un errore imprevisto. Riprova; se continua a succedere, scrivicelo dalla Guida.', boton: 'Riprova' },
  pt: { titulo: 'Algo deu errado', mensaje: 'O Weë encontrou um erro inesperado. Tente de novo; se continuar acontecendo, conte para a gente pela Ajuda.', boton: 'Tentar de novo' },
  'pt-PT': { titulo: 'Algo correu mal', mensaje: 'O Weë encontrou um erro inesperado. Tenta novamente; se continuar a acontecer, conta-nos através da Ajuda.', boton: 'Tentar novamente' },
  ru: { titulo: 'Что-то пошло не так', mensaje: 'В Weë произошла непредвиденная ошибка. Попробуйте ещё раз, а если это повторится — напишите нам из раздела «Помощь».', boton: 'Повторить' },
  ko: { titulo: '문제가 발생했어요', mensaje: 'Weë에서 예기치 못한 오류가 났어요. 다시 시도해 보세요. 계속 이러면 도움말에서 알려 주세요.', boton: '다시 시도' },
  zh: { titulo: '出错了', mensaje: 'Weë 遇到了意外错误。请重试；如果一直这样，可以在帮助里告诉我们。', boton: '重试' },
  'zh-TW': { titulo: '發生錯誤', mensaje: 'Weë 遇到非預期的錯誤。請重試；如果一直發生，可以從說明告訴我們。', boton: '重試' },
  ja: { titulo: '問題が発生しました', mensaje: 'Weëで予期しないエラーが発生しました。もう一度お試しください。何度も起きる場合は、ヘルプからお知らせください。', boton: '再試行' },
  tr: { titulo: 'Bir sorun oluştu', mensaje: 'Weë\'de beklenmedik bir hata oluştu. Yeniden dene; sorun devam ederse Yardım bölümünden bize bildir.', boton: 'Yeniden dene' },
};

/*
 * Lo que llega es la lengua del texto con su variante —'zh-TW', 'pt-PT', 'ja'—,
 * la misma de la interfaz (`etiquetaDelTexto`). La variante primero, luego el
 * idioma (`pt-BR` → `pt`), y si no, inglés.
 *
 * Una fila por diccionario registrado: `i18n.test.mjs` falla si entra un idioma
 * o una variante y esta pantalla sigue sin saber decirlo.
 */
const textosDeEmergencia = () => {
  const locale = localeDeEmergencia();
  return TEXTOS[locale] || TEXTOS[locale.split('-')[0]] || TEXTOS.en;
};

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/** Pantalla de error con la identidad de Weë (fondo blanco, botón amarillo con texto oscuro). */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error inesperado en Weë:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const textos = textosDeEmergencia();
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵‍💫</Text>
          <Text style={styles.title}>{textos.titulo}</Text>
          <Text style={styles.message}>{textos.mensaje}</Text>
          {__DEV__ && this.state.error && <Text style={styles.errorDetails}>{this.state.error.toString()}</Text>}
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false, error: undefined })} accessibilityLabel={textos.boton}>
            <Text style={styles.buttonText}>{textos.boton}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
  errorDetails: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'monospace',
    maxWidth: 480,
  },
  button: {
    backgroundColor: '#F5B731',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
