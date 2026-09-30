import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, enTemaClaro } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { formatearNumero, formatearPorcentaje } from '../i18n/formato';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { SpecialistAction } from '../constants/specialists';
import { useEspecialista } from '../hooks/useEspecialista';
import {
  BUSINESS_NETWORKS,
  BUSINESS_MESSAGES,
  BUSINESS_STATS,
  getBusinessCalendar,
  BusinessNetwork,
  CustomerMessage,
} from '../constants/businessMock';
import {
  MODULOS_DE_BUSINESS,
  ACCIONES_POR_MODULO,
  TIPOS_DE_CONTENIDO,
  FORMATOS,
  BRAND_KIT,
  FAMILIAS_DE_GASTO,
  SECCIONES_DEL_PERFIL,
  AccionDeBusiness,
  ModuloDeBusiness,
} from '../constants/businessModules';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import StudioPromptComposer from '../components/studio/StudioPromptComposer';
import BusinessModulos from '../components/business/BusinessModulos';
import BusinessPricing from '../components/business/BusinessPricing';
import {
  CabeceraDelModulo,
  Bloque,
  Vacio,
  ListaDeAcciones,
  Pastilla,
  BotonPrincipal,
} from '../components/business/BusinessPanel';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../constants/design';
import { notify } from '../utils/notify';
import { scale } from '../utils/scale';

const NETWORK_ICON: Record<string, string> = {
  instagram: 'logo-instagram',
  facebook: 'logo-facebook',
  tiktok: 'logo-tiktok',
  youtube: 'logo-youtube',
  whatsapp: 'logo-whatsapp',
};

/**
 * WEË BUSINESS — CREAR, ADMINISTRAR, PROMOCIONAR Y CRECER.
 *
 * ── Qué es esta pantalla ─────────────────────────────────────────────────────
 *
 * Ocho módulos y nada más en la portada: My Business, Products & Catalog,
 * Create, Social, Analyze, Grow, Business Profile y Promote. Las funciones de
 * cada uno viven DENTRO de él. Sacarlas todas a la primera pantalla convertiría
 * Weë Business en un panel de control, y esto es lo contrario: un sitio donde
 * alguien con un negocio pequeño dice qué necesita y Weë se encarga.
 *
 * ── Los módulos no son pantallas ─────────────────────────────────────────────
 *
 * Abrir uno no navega: cambia lo que enseña ESTA pantalla, como las puertas de
 * Weë Studio y los paneles de Weë Chef. Volver es instantáneo, no se acumula una
 * pila de rutas y lo escrito se queda donde estaba.
 *
 * ── Qué hay de verdad detrás ─────────────────────────────────────────────────
 *
 * Todo lo que CREA pasa por el camino de siempre —`CreatorFlow` con
 * `experienceId: 'business'` y los mismos `optionId` que ya tenía la plantilla
 * del servidor—, así que el plan y su coste en Credits se ven antes de gastar
 * nada. No hay proveedores nuevos, ni lógica de Credits nueva, ni precios
 * escritos a mano.
 *
 * Lo que todavía no tiene dónde guardarse —productos, gastos, el negocio, su
 * página, la marca— vive en el estado de la pantalla: se puede crear y se ve,
 * pero se pierde al salir, y los estados vacíos lo dicen en vez de fingir datos.
 * El día que haya almacenamiento entra por aquí sin tocar el dibujo.
 */
const BusinessScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { isMobile, isDesktop } = useResponsive();
  const spec = useEspecialista('business');

  /** En qué módulo estás. Vacío es la portada. */
  const [abierto, setAbierto] = useState<ModuloDeBusiness | null>(null);
  const [prompt, setPrompt] = useState('');
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [productos, setProductos] = useState<string[]>([]);
  const [gastos, setGastos] = useState<string[]>([]);
  const [formato, setFormato] = useState<string | null>(null);
  /*
   * LA FUNCIÓN QUE SE ESTÁ CONTANDO, SI SE ENTRÓ HABLANDO.
   *
   * Business Coach, Business Plan, "ayúdame a crecer", Customer Insights y
   * Business Ideas no se resuelven de un toque: abren la misma caja de Weë AI
   * dentro del módulo para que la persona cuente lo suyo. Vacío es que no hay
   * ninguna a medias.
   */
  const [conversa, setConversa] = useState<AccionDeBusiness | null>(null);
  /* El producto con el que se entró a Create, si se entró desde su ficha. */
  const [producto, setProducto] = useState<string | null>(null);
  const [networks, setNetworks] = useState<BusinessNetwork[]>(BUSINESS_NETWORKS.map((n) => ({ ...n })));
  const [adding, setAdding] = useState(false);
  const [messages, setMessages] = useState<CustomerMessage[]>(BUSINESS_MESSAGES);
  /* El calendario se rehace al cambiar de idioma: los días llevan su nombre. */
  const calendar = useMemo(() => getBusinessCalendar(locale), [locale]);

  if (!spec) return null;

  const modulo = MODULOS_DE_BUSINESS.find((m) => m.id === abierto);

  /*
   * Dos por fila en el teléfono y tres en cuanto hay sitio: con cuatro, un
   * nombre largo —"Products & Catalog"— se queda sin ancho.
   */
  const porFila = isDesktop ? 3 : 2;

  /*
   * LA CAJA DE ESCRITURA, EXACTAMENTE DEL TAMAÑO QUE TIENE EN WEË STUDIO.
   *
   * La caja es la misma pieza en las dos secciones, pero vivía en sitios de
   * distinto ancho, y por eso medía distinto. Dos diferencias, medidas en el
   * navegador, no supuestas:
   *
   * 1. En el teléfono, `CreatorShell` da a su contenido `padding: SPACING.lg` y
   *    `StudioPromptComposer` ya trae el suyo. Sumados, la caja de Business
   *    salía 29 puntos más estrecha que la de Studio —que no vive dentro del
   *    marco—, el texto se partía en dos renglones y parecía más alta. A 390:
   *    Studio 361 de ancho, Business 332. Se devuelve ese aire con un margen
   *    negativo del mismo tamaño.
   *
   * 2. De 768 para arriba, Studio no estira su contenido: lo limita a
   *    `scale(720)` y lo centra (`anchoMaximo` en `StudioScreen`). Business sí
   *    lo estiraba, y la caja salía hasta 414 puntos más ancha. A 1280: Studio
   *    619, Business 1033. Se le pone aquí el mismo tope y el mismo centrado.
   *
   * Todo el arreglo es de Business: ni el marco ni la caja, que son de todas
   * las secciones, cambian.
   */
  const cajaComoEnStudio = useMemo(
    () =>
      isMobile
        ? { marginHorizontal: -SPACING.lg }
        : { width: scale(720), alignSelf: 'center' as const },
    [isMobile],
  );

  const startFlow = (goal?: string, preset?: SpecialistAction['preset']) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('CreatorFlow', { experienceId: 'business', goal, preset });
  };

  /*
   * LO ESCRITO ABRE LA CONVERSACIÓN DE SIEMPRE.
   *
   * Y lleva el contexto que haya: si se entró desde la ficha de un producto, el
   * producto viaja con la idea —por interpolación, nunca juntando cadenas— para
   * que Weë no vuelva a preguntar lo que ya se sabe. Si se está contestando a
   * una función —el Business Coach, el plan—, va con SU opción y, si no se
   * escribió nada, con su pregunta.
   */
  const alEnviar = () => {
    const escrito = prompt.trim();
    const base = escrito || (conversa ? t(conversa.claveObjetivo) : '');
    if (!base) return;
    const objetivo = producto ? t('business.goalWithProduct', { idea: base, producto }) : base;
    startFlow(objetivo, { questionId: 'what', optionId: conversa ? conversa.optionId : 'content' });
  };

  /* Sin selector de archivos todavía: se añade uno de muestra, para ver la forma. */
  const alAdjuntar = () => setAdjuntos((antes) => [...antes, `adjunto-${antes.length + 1}.jpg`]);

  /*
   * LA ENTRADA GENERAL, DESDE LA PORTADA.
   *
   * Sin `preset` a propósito: quien escribe aquí no ha elegido módulo, así que
   * tampoco se elige por él. La conversación guiada de Business pregunta qué
   * quiere hacer —sus opciones son las de siempre— y de ahí sale el plan con su
   * coste. Es el camino que ya existía; no hay router nuevo.
   */
  const alEnviarDesdeLaPortada = () => {
    const idea = prompt.trim();
    if (idea) startFlow(idea);
  };

  /*
   * Sin ficha de producto todavía, el nombre de muestra lo pone Weë en el idioma
   * de la pantalla. Una vez puesto es el nombre del producto: ya no se traduce.
   */
  const anadirProducto = () => setProductos((antes) => [...antes, t('business.sampleProductName', { numero: antes.length + 1 })]);

  /*
   * Elegir qué crear es decirle a Weë qué pieza quieres de lo que ya escribiste.
   * Si no hay nada escrito, la conversación lo pregunta: no se inventa la idea.
   */
  const crearContenido = (claveTipo: string) => {
    const idea = t('business.typeGoal', { que: t(claveTipo), idea: prompt.trim() || t('business.createInvite') });
    /* Y con el producto, si se entró desde su ficha: no se pregunta dos veces. */
    startFlow(
      producto ? t('business.goalWithProduct', { idea, producto }) : idea,
      { questionId: 'what', optionId: 'content' }
    );
  };

  /*
   * COMPARTIR ES EL DE SIEMPRE, EL DEL TELÉFONO.
   * No se construye una hoja propia: el sistema ya tiene la suya, con las apps
   * que la persona tiene instaladas. "Créalo una vez, compártelo en todas
   * partes" es justo eso.
   */
  const compartir = async () => {
    try {
      await Share.share({ message: t('business.shareText') });
    } catch (error) {
      console.warn('No se pudo compartir:', error);
    }
  };

  const toggleNetwork = (id: string) =>
    setNetworks((prev) => prev.map((n) => (n.id === id ? { ...n, connected: !n.connected } : n)));

  const connectNetwork = (id: string) => {
    setNetworks((prev) => prev.map((n) => (n.id === id ? { ...n, connected: true } : n)));
    setAdding(false);
  };

  const replyTo = (message: CustomerMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, replied: true } : m)));
    startFlow(t('business.replyGoal', { nombre: message.name, red: message.network, mensaje: message.text }), { questionId: 'what', optionId: 'reply' });
  };

  const connected = networks.filter((n) => n.connected);
  const available = networks.filter((n) => !n.connected);

  /* ── Dentro de un módulo: la portada se aparta y manda el módulo ───────── */
  const panel = (contenido: React.ReactNode) => (
    <CreatorShell activeId="business" overline="🤖 Weë AI" title="💼 Weë Business" breadcrumb="Weë AI" sinFranjaSuperior>
      <CabeceraDelModulo
        nombre={modulo ? modulo.nombre : ''}
        pista={modulo ? t(modulo.claveHint) : ''}
        onVolver={() => setAbierto(null)}
      />
      {contenido}
    </CreatorShell>
  );

  const acciones = abierto ? ACCIONES_POR_MODULO[abierto] : [];
  /*
   * Las que se entran hablando abren la caja aquí mismo; las demás van directas
   * a la conversación guiada, que es donde se ve el plan y su coste.
   */
  const abrirAccion = (accion: AccionDeBusiness) => {
    if (accion.conversacional) {
      setPrompt('');
      setConversa(accion);
      return;
    }
    startFlow(t(accion.claveObjetivo), { questionId: 'what', optionId: accion.optionId });
  };

  /*
   * LA CAJA DE WEË AI, CONTESTANDO A UNA FUNCIÓN.
   *
   * Es la MISMA de Weë Studio y Weë Design —crece con lo escrito, no pierde sus
   * botones, se acomoda al teclado—: lo único propio es a qué pregunta contesta.
   */
  if (conversa) {
    return (
      <CreatorShell activeId="business" overline="🤖 Weë AI" title="💼 Weë Business" breadcrumb="Weë AI" sinFranjaSuperior>
        <CabeceraDelModulo
          nombre={t(conversa.claveTitulo)}
          pista={t(conversa.claveObjetivo)}
          onVolver={() => setConversa(null)}
        />
        <View style={[styles.compositor, cajaComoEnStudio]}>
          <Text style={[styles.invitacion, { color: theme.colors.textSecondary }]}>{t('business.askInvite')}</Text>
          <StudioPromptComposer
            placeholder={t('business.askPlaceholder')}
            valor={prompt}
            onCambiar={setPrompt}
            onReferencia={alAdjuntar}
            onAjustes={() => notify(t('common.comingSoon'))}
            onVoz={() => notify(t('common.comingSoon'))}
            onCrear={alEnviar}
          />
          {adjuntos.length > 0 && (
            <View style={styles.fichas}>
              {adjuntos.map((a, i) => (
                <View key={`${a}-${i}`} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="document-attach-outline" size={scale(14)} color={theme.colors.text} />
                  <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{a}</Text>
                </View>
              ))}
            </View>
          )}
          {/* Sin escribir nada también se puede preguntar: va la pregunta sola. */}
          <BotonPrincipal etiqueta={t('business.askSend')} icono="sparkles-outline" onPress={alEnviar} />
        </View>
      </CreatorShell>
    );
  }

  if (abierto === 'myBusiness') {
    return panel(
      <>
        <Bloque titulo={t('business.overview')}>
          <Vacio texto={t('business.overviewEmpty')} pista={t('business.overviewEmptyHint')} />
        </Bloque>
        <ListaDeAcciones acciones={acciones} onElegir={abrirAccion} />
      </>
    );
  }

  if (abierto === 'products') {
    return panel(
      <>
        <Bloque titulo="Products & Catalog">
          {productos.length === 0 ? (
            <Vacio texto={t('business.productsEmpty')} pista={t('business.productsEmptyHint')} />
          ) : (
            /*
              Tocar un producto lleva a Create con ÉL puesto: desde ahí, "hazme
              una promoción" ya sabe de qué. Es la conexión que pide el
              documento —Product → Create Content— y no vuelve a preguntar lo
              que ya está delante.
            */
            <View style={styles.fichas}>
              {productos.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => { setProducto(p); setPrompt(''); setAbierto('create'); }}
                  activeOpacity={0.75}
                  style={[styles.ficha, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('business.productCreate')}
                >
                  <Ionicons name="pricetag-outline" size={scale(15)} color={theme.colors.text} />
                  <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{p}</Text>
                  <Ionicons name="chevron-forward" size={scale(14)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <BotonPrincipal etiqueta={t('business.addProduct')} icono="add" onPress={anadirProducto} />
        </Bloque>

        <ListaDeAcciones acciones={acciones} onElegir={abrirAccion} />

        <Bloque titulo={t('business.pricing')} pista={t('business.pricingHint')}>
          <BusinessPricing />
        </Bloque>

        <Bloque titulo={t('business.brandKit')} pista={t('business.brandKitHint')}>
          <View style={styles.pastillas}>
            {BRAND_KIT.map((pieza) => (
              <Pastilla
                key={pieza.id}
                etiqueta={t(pieza.clave)}
                icono={pieza.icono}
                onPress={() => startFlow(t('business.brandGoal', { que: t(pieza.clave) }), { questionId: 'what', optionId: 'content' })}
              />
            ))}
          </View>
        </Bloque>
      </>
    );
  }

  if (abierto === 'create') {
    return panel(
      <>
        {/*
          La misma caja de Weë AI: crece con lo escrito y no pierde sus botones.
          Aquí es donde se dice qué se quiere promocionar; el tipo y el formato
          son dos toques más, no un formulario.
        */}
        <View style={[styles.compositor, cajaComoEnStudio]}>
          <Text style={[styles.invitacion, { color: theme.colors.textSecondary }]}>{t('business.createInvite')}</Text>

          {/*
            El producto con el que se entró, a la vista y no escondido: viaja con
            la petición y se quita de un toque. El nombre lo escribió la persona,
            así que no pasa por el traductor.
          */}
          {!!producto && (
            <View style={styles.fichas}>
              <TouchableOpacity
                onPress={() => setProducto(null)}
                activeOpacity={0.7}
                style={[styles.ficha, { backgroundColor: theme.colors.glow, borderColor: theme.colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel={producto}
              >
                <Ionicons name="pricetag-outline" size={scale(14)} color={theme.colors.accentDark} />
                <Text style={[styles.fichaTexto, { color: theme.colors.accentDark }]} numberOfLines={1}>{producto}</Text>
                <Ionicons name="close" size={scale(14)} color={theme.colors.accentDark} />
              </TouchableOpacity>
            </View>
          )}

          <StudioPromptComposer
            placeholder={t('business.createPlaceholder')}
            valor={prompt}
            onCambiar={setPrompt}
            onReferencia={alAdjuntar}
            onAjustes={() => notify(t('common.comingSoon'))}
            onVoz={() => notify(t('common.comingSoon'))}
            onCrear={alEnviar}
          />
          {adjuntos.length > 0 && (
            <View style={styles.fichas}>
              {adjuntos.map((a, i) => (
                <View key={`${a}-${i}`} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="document-attach-outline" size={scale(14)} color={theme.colors.text} />
                  <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Bloque titulo={t('business.createTypes')}>
          <View style={styles.rejilla}>
            {TIPOS_DE_CONTENIDO.map((tipo) => (
              <View key={tipo.id} style={{ width: `${100 / porFila}%` as any, padding: SPACING.xs }}>
                <TouchableOpacity
                  style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => crearContenido(tipo.clave)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={t(tipo.clave)}
                >
                  <View style={styles.tarjetaArriba}>
                    <Ionicons name={tipo.icono as any} size={scale(22)} color={theme.colors.text} />
                    <Text style={[styles.tarjetaTitulo, { color: theme.colors.text }]} numberOfLines={2}>{t(tipo.clave)}</Text>
                  </View>
                  <Text style={[styles.tarjetaPista, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(tipo.claveHint)}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Bloque>

        {/*
          El formato se elige por dónde va a publicarse —TikTok, una story—, no
          por su proporción: quien promociona su pastelería no tiene por qué
          saber qué es un 9:16. Weë se encarga del tamaño.
        */}
        <Bloque titulo={t('business.formats')} pista={t('business.formatsHint')}>
          <View style={styles.pastillas}>
            {FORMATOS.map((f) => (
              <Pastilla
                key={f.id}
                etiqueta={t(f.clave)}
                icono={f.icono}
                puesta={formato === f.id}
                onPress={() => setFormato((antes) => (antes === f.id ? null : f.id))}
              />
            ))}
          </View>
        </Bloque>
      </>
    );
  }

  if (abierto === 'social') {
    return panel(
      <>
        <Bloque titulo={t('business.socialIdea')} pista={t('business.shareHint')}>
          <BotonPrincipal etiqueta={t('business.share')} icono="share-social-outline" onPress={compartir} />
        </Bloque>

        <Bloque titulo={t('business.mySocialAccounts')} pista={t('business.simulatedConnection')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.redes}>
            {connected.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => toggleNetwork(n.id)}
                activeOpacity={0.8}
                style={[styles.red, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                accessibilityLabel={t('business.networkConnected', { red: n.name })}
              >
                <Ionicons name={n.icon as any} size={scale(18)} color={n.color} />
                <View style={styles.redTextos}>
                  <Text style={[styles.redNombre, { color: theme.colors.text }]} numberOfLines={1}>{n.name}</Text>
                  <Text style={[styles.redCuenta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{n.handle}</Text>
                </View>
                <View style={styles.punto} />
              </TouchableOpacity>
            ))}
            {available.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => connectNetwork(n.id)}
                activeOpacity={0.8}
                style={[styles.red, styles.redAnadir, { borderColor: theme.colors.border }]}
                accessibilityLabel={t('business.connectAnother')}
              >
                <Ionicons name="add" size={scale(18)} color={theme.colors.text} />
                <Text style={[styles.redNombre, { color: theme.colors.text }]} numberOfLines={1}>{n.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Bloque>

        <Bloque
          titulo={t('business.postCalendar')}
          derecha={
            <TouchableOpacity onPress={() => startFlow(t('business.calendarGoal'), { questionId: 'what', optionId: 'schedule' })} activeOpacity={0.7} accessibilityRole="button">
              <Text style={[styles.enlace, { color: theme.colors.textSecondary }]}>{t('business.seeFullCalendar')} →</Text>
            </TouchableOpacity>
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendar}>
            {calendar.map((day) => (
              <TouchableOpacity
                key={day.key}
                onPress={() => startFlow(t('business.scheduleGoal', { dia: day.weekday, fecha: day.label, publicacion: day.post.title }), { questionId: 'what', optionId: 'schedule' })}
                activeOpacity={0.8}
                style={styles.day}
                accessibilityLabel={t('business.dayLabel', { dia: day.weekday, fecha: day.label })}
              >
                <Text style={[styles.dayName, { color: theme.colors.text }]}>{day.weekday}</Text>
                <Text style={[styles.dayDate, { color: theme.colors.textSecondary }]}>{day.label}</Text>
                <View style={[styles.dayPost, { backgroundColor: day.post.highlight ? theme.colors.accent : theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={styles.dayEmoji}>{day.post.emoji}</Text>
                  <Text style={[styles.dayTitle, { color: theme.colors.text }]} numberOfLines={2}>{day.post.title}</Text>
                </View>
                <View style={styles.dayMeta}>
                  <Ionicons name={NETWORK_ICON[day.post.network] as any} size={scale(12)} color={theme.colors.textSecondary} />
                  <Text style={[styles.dayTime, { color: theme.colors.textSecondary }]}>{day.post.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Bloque>

        <Bloque
          titulo={t('business.customerMessages')}
          derecha={
            <TouchableOpacity onPress={() => startFlow(t('business.messagesGoal'), { questionId: 'what', optionId: 'reply' })} activeOpacity={0.7} accessibilityRole="button">
              <Text style={[styles.enlace, { color: theme.colors.textSecondary }]}>{t('business.seeAllMessages')} →</Text>
            </TouchableOpacity>
          }
        >
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {messages.map((m) => (
              <View key={m.id} style={[styles.message, { borderTopColor: theme.colors.border }]}>
                <Ionicons name={NETWORK_ICON[m.network] as any} size={scale(16)} color={theme.colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <View style={styles.messageHead}>
                    <Text style={[styles.messageName, { color: theme.colors.text }]} numberOfLines={1}>{m.name}</Text>
                    <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>{m.claveHora ? t(m.claveHora) : m.time}</Text>
                  </View>
                  <Text style={[styles.messageText, { color: theme.colors.textSecondary }]} numberOfLines={2}>{m.text}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => replyTo(m)}
                  activeOpacity={0.8}
                  style={[styles.replyPill, m.replied ? { backgroundColor: '#E8F5EE' } : { backgroundColor: theme.colors.accent }]}
                  accessibilityLabel={t(m.replied ? 'business.repliedTo' : 'business.replyTo', { nombre: m.name })}
                >
                  <Text style={[styles.replyText, { color: m.replied ? '#2F7D4F' : '#1F2937' }]}>{t(m.replied ? 'business.replied' : 'business.reply')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Bloque>
      </>
    );
  }

  if (abierto === 'analyze') {
    return panel(
      <>
        <Bloque titulo={t('business.resultsThisWeek')}>
          <View style={styles.stats}>
            {BUSINESS_STATS.map((stat) => (
              <View key={stat.id} style={[styles.stat, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {/* Las cifras las escribe Intl con el locale: «125,4 B» y «%40» en turco, «125.4K» y «40%» en inglés. */}
                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                  {formatearNumero(stat.valor, locale, { notation: 'compact', maximumFractionDigits: 1 })}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t(stat.clave)}</Text>
                <Text style={styles.statDelta}>{`↑ ${formatearPorcentaje(stat.subida, locale)}`}</Text>
              </View>
            ))}
          </View>
        </Bloque>

        <ListaDeAcciones acciones={acciones} onElegir={abrirAccion} />

        <Bloque titulo={t('business.expenses')} pista={t('business.expensesHint')}>
          {gastos.length === 0 ? (
            <Vacio texto={t('business.expensesEmpty')} />
          ) : (
            <View style={styles.fichas}>
              {gastos.map((g, i) => (
                <View key={`${g}-${i}`} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{t(g)}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.pastillas}>
            {FAMILIAS_DE_GASTO.map((f) => (
              <Pastilla key={f.id} etiqueta={t(f.clave)} icono={f.icono} onPress={() => setGastos((antes) => [...antes, f.clave])} />
            ))}
          </View>
          <BotonPrincipal
            etiqueta={t('business.expensesAsk')}
            icono="help-circle-outline"
            onPress={() => startFlow(t('business.expensesAskGoal'), { questionId: 'what', optionId: 'analyze' })}
          />
        </Bloque>
      </>
    );
  }

  if (abierto === 'grow') {
    return panel(
      <>
        <Bloque titulo={t('business.helpMeGrow')} pista={t('business.helpMeGrowHint')}>
          <BotonPrincipal
            etiqueta={t('business.helpMeGrow')}
            icono="trending-up-outline"
            onPress={() => startFlow(t('business.helpMeGrowGoal'), { questionId: 'what', optionId: 'idea' })}
          />
        </Bloque>

        <Bloque titulo={t('business.opportunities')}>
          <Vacio texto={t('business.opportunitiesEmpty')} />
        </Bloque>

        <ListaDeAcciones acciones={acciones} onElegir={abrirAccion} />
      </>
    );
  }

  if (abierto === 'profile') {
    return panel(
      <>
        <Bloque titulo="Business Profile">
          <Vacio texto={t('business.profileEmpty')} pista={t('business.profileEmptyHint')} />
          <View style={styles.pastillas}>
            {SECCIONES_DEL_PERFIL.map((s) => (
              <Pastilla key={s.id} etiqueta={t(s.clave)} icono={s.icono} onPress={() => setAbierto('myBusiness')} />
            ))}
          </View>
        </Bloque>

        <ListaDeAcciones acciones={acciones} onElegir={abrirAccion} />
      </>
    );
  }

  if (abierto === 'promote') {
    return panel(
      <>
        <Bloque titulo={t('business.promoteTitle')} pista={t('business.promoteHint')}>
          <Vacio texto={t('business.promoteSoon')} />
          <BotonPrincipal
            etiqueta={t('business.promoteCredits')}
            icono="wallet-outline"
            onPress={() => navigation.navigate(user ? 'CreditStore' : 'Login')}
          />
        </Bloque>
      </>
    );
  }

  /* ── La portada: la cabecera y los ocho módulos ────────────────────────── */
  return (
    <CreatorShell
      activeId="business"
      overline="🤖 Weë AI"
      title="💼 Weë Business"
      breadcrumb="Weë AI"
      /* En el teléfono, arriba solo va la cabecera de la sección (2026-09-15). */
      sinFranjaSuperior
    >
      {/*
        La cabecera aprobada, intacta: la W oficial, el nombre y su frase. Lo
        único que cambia es el lema, que ahora es el de Weë Business
        —"Crea, administra, promociona y haz crecer tu negocio."—.
      */}
      <CabeceraDeSeccion nombre="Business" lema={t('business.slogan')} descripcion={spec.intro} />

      {/*
        Y JUSTO DEBAJO, LA CAJA: LO PRIMERO QUE SE VE (decisión del usuario,
        2026-09-16).

        Antes de las ocho puertas, porque lo primero no es elegir dónde entrar
        sino decir qué necesitas —"quiero promocionar mi restaurante"—. Los
        módulos son para quien ya sabe a cuál va; la caja es para todos los
        demás, y por eso entra en la primera pantalla sin desplazar.

        Es la MISMA caja de Weë AI que Weë Studio, sin preset: la conversación
        guiada pregunta qué quiere hacer y decide por dónde sigue, que es el
        camino que ya existía. El margen negativo la acerca a la cabecera, como
        en Weë Studio, Weë Design y Weë Chef.
      */}
      <View style={[styles.compositorDeLaPortada, cajaComoEnStudio]}>
        {/*
          Sin rótulo encima (decisión del usuario, 2026-09-16): la cabecera ya
          dice dónde estás y para qué sirve esto, y una línea más entre la
          descripción y la caja solo la empuja hacia abajo.

          Y con la frase CORTA dentro: la larga —"Ejemplo: Quiero vender más este
          mes en mi cafetería…"— ocupaba dos renglones y hacía la caja más alta
          que la de Weë Studio. Esta es la misma caja; lo que cambiaba era el
          texto que llevaba dentro. La larga sigue viva dentro del módulo Create,
          donde sí hay sitio y ayuda a arrancar.
        */}
        <StudioPromptComposer
          placeholder={t('business.askPlaceholder')}
          valor={prompt}
          onCambiar={setPrompt}
          onReferencia={alAdjuntar}
          onAjustes={() => notify(t('common.comingSoon'))}
          onVoz={() => notify(t('common.comingSoon'))}
          onCrear={alEnviarDesdeLaPortada}
        />
        {adjuntos.length > 0 && (
          <View style={styles.fichas}>
            {adjuntos.map((a, i) => (
              <View key={`${a}-${i}`} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="document-attach-outline" size={scale(14)} color={theme.colors.text} />
                <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{a}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/*
        Y debajo, la navegación: los ocho módulos y nada más. Las funciones de
        cada uno viven DENTRO de él; sacarlas todas a la portada convertiría Weë
        Business en un panel de control, que es justo lo que no es.
      */}
      <BusinessModulos porFila={porFila} onAbrir={(m) => setAbierto(m.id)} />
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  /* La caja de la portada, acercada a la cabecera como en el resto de Weë AI. */
  compositorDeLaPortada: { marginTop: -scale(26), gap: SPACING.sm },
  compositor: { gap: SPACING.sm },
  invitacion: { fontSize: FONT_SIZE.base, lineHeight: scale(21), paddingHorizontal: SPACING.xs },
  /* Lo que se ha añadido y se puede leer de un vistazo: adjuntos, productos, gastos. */
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + scale(2),
    borderRadius: scale(999),
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: scale(220),
  },
  fichaTexto: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', margin: -SPACING.xs },
  tarjeta: {
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg,
    gap: SPACING.sm,
    minHeight: scale(112),
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: scale(10),
    shadowOffset: { width: 0, height: scale(3) },
    elevation: 1,
  },
  tarjetaArriba: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  tarjetaTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, lineHeight: scale(20), flexShrink: 1 },
  tarjetaPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
  enlace: { fontSize: FONT_SIZE.sm },
  redes: { gap: SPACING.sm, paddingRight: SPACING.lg },
  red: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: scale(168),
  },
  redAnadir: { borderStyle: 'dashed', justifyContent: 'center' },
  redTextos: { flexShrink: 1 },
  redNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  redCuenta: { fontSize: FONT_SIZE.xs },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2FB784' },
  card: {
    padding: SPACING.lg,
    borderRadius: scale(20),
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  calendar: { gap: SPACING.sm, paddingRight: SPACING.md },
  day: { width: scale(96), gap: scale(4) },
  dayName: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  dayDate: { fontSize: scale(10) },
  dayPost: {
    aspectRatio: 1,
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.sm,
    justifyContent: 'space-between',
  },
  dayEmoji: { fontSize: scale(22) },
  dayTitle: { fontSize: scale(11), fontWeight: FONT_WEIGHT.semibold },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  dayTime: { fontSize: scale(10) },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  messageHead: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  messageName: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, flex: 1 },
  messageTime: { fontSize: scale(10) },
  messageText: { fontSize: FONT_SIZE.xs },
  replyPill: {
    paddingHorizontal: SPACING.sm,
    minHeight: scale(28),
    borderRadius: scale(999),
    justifyContent: 'center',
  },
  replyText: { fontSize: scale(11), fontWeight: FONT_WEIGHT.bold },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  stat: {
    flexGrow: 1,
    minWidth: scale(140),
    padding: SPACING.md,
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    gap: scale(2),
  },
  statValue: { fontSize: scale(22), fontWeight: FONT_WEIGHT.bold },
  statLabel: { fontSize: FONT_SIZE.xs },
  statDelta: { color: '#2F7D4F', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
});

/*
 * Weë AI es de la cuenta, no de un perfil: el taller se ve claro con el Perfil
 * Real y con el Perfil Weë. Lo de fuera —el cajón incluido— no se toca.
 */
export default enTemaClaro(BusinessScreen);
