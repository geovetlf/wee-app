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
  'de-CH': { titulo: 'Da ist etwas schiefgelaufen', mensaje: 'In Weë ist ein unerwarteter Fehler aufgetreten. Versuch es noch einmal; wenn es weiter passiert, sag uns über die Hilfe Bescheid.', boton: 'Noch einmal versuchen' },
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
  sv: { titulo: 'Något gick fel', mensaje: 'Ett oväntat fel uppstod i Weë. Försök igen – om det händer igen kan du berätta det för oss via Hjälp.', boton: 'Försök igen' },
  da: { titulo: 'Noget gik galt', mensaje: 'Der opstod en uventet fejl i Weë. Prøv igen – hvis det sker igen, kan du fortælle os det via Hjælp.', boton: 'Prøv igen' },
  hi: { titulo: 'कोई गड़बड़ी हुई', mensaje: 'Weë में कोई अनचाही गड़बड़ी हुई. फिर से कोशिश करें. अगर ऐसा बार-बार हो, तो मदद में जाकर हमें बताएँ.', boton: 'फिर से कोशिश करें' },
  ar: { titulo: 'حدث خطأ ما', mensaje: 'واجه Weë خطأً غير متوقع. حاول مرة أخرى؛ وإذا استمرت المشكلة، أخبرنا من قسم المساعدة.', boton: 'إعادة المحاولة' },
  he: { titulo: 'משהו השתבש', mensaje: 'אירעה שגיאה לא צפויה ב-Weë. כדאי לנסות שוב; אם זה חוזר, אפשר לספר לנו דרך העזרה.', boton: 'ניסיון נוסף' },
  fa: { titulo: 'مشکلی پیش آمد', mensaje: 'خطای غیرمنتظره‌ای در Weë رخ داد. دوباره تلاش کنید؛ اگر تکرار شد، از بخش راهنما به ما اطلاع دهید.', boton: 'تلاش دوباره' },
  id: { titulo: 'Terjadi kesalahan', mensaje: 'Terjadi kesalahan tak terduga di Weë. Coba lagi; jika terulang, beri tahu kami lewat Bantuan.', boton: 'Coba lagi' },
  ms: { titulo: 'Sesuatu tidak kena', mensaje: 'Berlaku ralat yang tidak dijangka dalam Weë. Cuba lagi; jika ia berulang, beritahu kami melalui Bantuan.', boton: 'Cuba lagi' },
  hr: { titulo: 'Nešto je pošlo po zlu', mensaje: 'U aplikaciji Weë dogodila se neočekivana pogreška. Pokušaj ponovno; ako se ponovi, javi nam putem Pomoći.', boton: 'Pokušaj ponovno' },
  bs: { titulo: 'Nešto je pošlo po zlu', mensaje: 'U aplikaciji Weë desila se neočekivana greška. Pokušaj ponovo; ako se ponovi, javi nam putem Pomoći.', boton: 'Pokušaj ponovo' },
  sr: { titulo: 'Нешто је пошло наопако', mensaje: 'У апликацији Weë догодила се неочекивана грешка. Покушај поново; ако се понови, јави нам преко Помоћи.', boton: 'Покушај поново' },
  'sr-Latn': { titulo: 'Nešto je pošlo naopako', mensaje: 'U aplikaciji Weë dogodila se neočekivana greška. Pokušaj ponovo; ako se ponovi, javi nam preko Pomoći.', boton: 'Pokušaj ponovo' },
  cnr: { titulo: 'Nešto je pošlo naopako', mensaje: 'U aplikaciji Weë dogodila se neočekivana greška. Pokušaj ponovo; ako se ponovi, javi nam preko Pomoći.', boton: 'Pokušaj ponovo' },
  pl: { titulo: 'Coś poszło nie tak', mensaje: 'W aplikacji Weë wystąpił nieoczekiwany błąd. Spróbuj ponownie; jeśli się powtórzy, daj nam znać przez Pomoc.', boton: 'Spróbuj ponownie' },
  ca: { titulo: 'Alguna cosa ha fallat', mensaje: 'Weë ha trobat un error inesperat. Torna-ho a provar; si continua passant, explica\'ns-ho des de l\'Ajuda.', boton: 'Torna-ho a provar' },
  el: { titulo: 'Κάτι πήγε στραβά', mensaje: 'Το Weë αντιμετώπισε ένα απρόσμενο σφάλμα. Δοκίμασε ξανά· αν συνεχίσει να συμβαίνει, πες μας το από τη Βοήθεια.', boton: 'Δοκίμασε ξανά' },
  nl: { titulo: 'Er ging iets mis', mensaje: 'Weë kwam een onverwachte fout tegen. Probeer het opnieuw; blijft het gebeuren, laat het ons dan weten via Help.', boton: 'Opnieuw proberen' },
  vi: { titulo: 'Đã xảy ra lỗi', mensaje: 'Weë gặp lỗi không mong muốn. Hãy thử lại; nếu vẫn tiếp diễn, hãy báo cho chúng tôi qua mục Trợ giúp.', boton: 'Thử lại' },
  hu: { titulo: 'Hiba történt', mensaje: 'A Weë váratlan hibába ütközött. Próbáld újra; ha továbbra is előfordul, jelezd nekünk a Súgóban.', boton: 'Újrapróbálás' },
  fi: { titulo: 'Jokin meni pieleen', mensaje: 'Weë kohtasi odottamattoman virheen. Yritä uudelleen; jos ongelma jatkuu, kerro siitä meille Ohjeen kautta.', boton: 'Yritä uudelleen' },
  mn: { titulo: 'Алдаа гарлаа', mensaje: 'Weë-д гэнэтийн алдаа гарлаа. Дахин оролдоно уу. Хэрэв дахин давтагдвал Тусламж хэсгээр бидэнд мэдэгдээрэй.', boton: 'Дахин оролдох' },
  nb: { titulo: 'Noe gikk galt', mensaje: 'Det oppstod en uventet feil i Weë. Prøv igjen – hvis det skjer igjen, kan du si fra via Hjelp.', boton: 'Prøv igjen' },
  is: { titulo: 'Eitthvað fór úrskeiðis', mensaje: 'Óvænt villa kom upp í Weë. Reyndu aftur; ef þetta gerist aftur, láttu okkur vita í Hjálp.', boton: 'Reyna aftur' },
  kl: { titulo: 'Arlaatigut kukkusoqarpoq', mensaje: 'Weë kukkunermik ilimagisimanngisamik naammattoorpoq. Misileqqiguk; suli pisoqartuarpat Ikiuineq atorlugu oqaluttuarisigut.', boton: 'Misileqqiguk' },
  fil: { titulo: 'Nagkaproblema', mensaje: 'Nagkaroon ng hindi inaasahang error sa Weë. Subukan ulit; kung patuloy itong mangyari, sabihin mo sa amin sa Tulong.', boton: 'Subukan ulit' },
  ga: { titulo: 'Chuaigh rud éigin amú', mensaje: 'Tharla earráid gan choinne in Weë. Bain triail eile as; má tharlaíonn sé arís, inis dúinn tríd an gCabhair.', boton: 'Bain triail eile as' },
  km: { titulo: 'មាន​អ្វី​មួយ​ខុស​ប្រក្រតី', mensaje: 'Weë ជួប​កំហុស​ដែល​មិន​បាន​រំពឹង​ទុក។ សូម​ព្យាយាម​ម្តងទៀត ហើយ​បើ​វា​កើត​ឡើង​ទៀត សូម​ប្រាប់​យើង​តាម​ផ្នែក​ជំនួយ។', boton: 'ព្យាយាម​ម្តងទៀត' },
  ro: { titulo: 'Ceva nu a mers bine', mensaje: 'A apărut o eroare neașteptată în Weë. Încearcă din nou; dacă se repetă, spune-ne prin Ajutor.', boton: 'Încearcă din nou' },
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
