import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useSeccionDelDispositivo } from '../../hooks/useSeccionDelDispositivo';
import { SectionTitle } from './ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { formatearFecha, formatearNumero } from '../../i18n/formato';
import { confirmAction } from '../../utils/notify';
import type { EstadoDeProyecto, ProyectoDeLaSeccion, ArchivoDeLaSeccion, ErrorDeLaSeccion, AvisoDeLaSeccion } from '../../utils/seccionDelDispositivo';
import type { PlataformaDeUbicacion } from '../../utils/ubicacionWee';

/*
 * «En este dispositivo», dentro de «Mis proyectos». Qué pasa lo decide el controlador
 * (utils/seccionDelDispositivo.ts); aquí solo se pinta. Todo texto sale de `biblioteca.*`.
 * El permiso se explica ANTES de pedirlo, y un fallo no bloquea la app.
 */
const SeccionDelDispositivo: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const seccion = useSeccionDelDispositivo();
  const { vista, cargando, ocupado, error } = seccion;
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  const estado = vista?.estado ?? null;
  const tarjeta = [styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }];
  const textoSecundario = { color: theme.colors.textSecondary };

  const bytesLegibles = (bytes: number): string => {
    const opciones = { maximumFractionDigits: 1 };
    if (bytes < 1024) return t('biblioteca.tamanoBytes', { valor: formatearNumero(bytes, locale, opciones) });
    if (bytes < 1024 ** 2) return t('biblioteca.tamanoKb', { valor: formatearNumero(bytes / 1024, locale, opciones) });
    if (bytes < 1024 ** 3) return t('biblioteca.tamanoMb', { valor: formatearNumero(bytes / 1024 ** 2, locale, opciones) });
    return t('biblioteca.tamanoGb', { valor: formatearNumero(bytes / 1024 ** 3, locale, opciones) });
  };

  const textoDelPermiso = (plataforma: PlataformaDeUbicacion | null): string => {
    if (plataforma === 'android') return t('biblioteca.permisoAndroid');
    if (plataforma === 'ios') return t('biblioteca.permisoIos');
    if (plataforma === 'web-carpeta') return t('biblioteca.permisoWeb');
    if (plataforma === 'web-privado') return t('biblioteca.permisoPrivado');
    return t('biblioteca.ubicacionNoDisponible');
  };

  const textoDelError = (clave: ErrorDeLaSeccion): string => {
    switch (clave) {
      case 'errorSinEspacio':
        return t('biblioteca.errorSinEspacio');
      case 'errorNoEncontrado':
        return t('biblioteca.errorNoEncontrado');
      case 'errorCorrupto':
        return t('biblioteca.errorCorrupto');
      case 'errorNoDisponible':
        return t('biblioteca.errorNoDisponible');
      case 'errorNombreNoValido':
        return t('biblioteca.errorNombreNoValido');
      case 'errorSoloLectura':
        return t('biblioteca.errorSoloLectura');
      case 'errorArchivoNoDisponible':
        return t('biblioteca.errorArchivoNoDisponible');
      default:
        return t('biblioteca.errorDesconocido');
    }
  };

  const textoDelAviso = (aviso: AvisoDeLaSeccion): string =>
    aviso === 'indice_en_cuarentena' ? t('biblioteca.avisoCuarentena') : t('biblioteca.avisoReconstruido');

  const textoDelEstadoDelProyecto = (estadoDelProyecto: EstadoDeProyecto): string => {
    switch (estadoDelProyecto) {
      case 'disponible':
        return t('biblioteca.estadoDisponible');
      case 'sin_archivos':
        return t('biblioteca.sinArchivos');
      case 'archivo_ausente':
        return t('biblioteca.estadoNoEncontrado');
      case 'archivo_corrupto':
        return t('biblioteca.estadoArchivoCorrupto');
      default:
        return t('biblioteca.estadoErrorRecuperable');
    }
  };

  const colorDelEstado = (estadoDelProyecto: EstadoDeProyecto): string => {
    if (estadoDelProyecto === 'disponible') return theme.colors.success;
    if (estadoDelProyecto === 'sin_archivos') return theme.colors.textSecondary;
    return theme.colors.error;
  };

  const textoDelArchivo = (archivo: ArchivoDeLaSeccion): string => {
    if (archivo.estado === 'local') return t('biblioteca.estadoDisponible');
    if (archivo.estado === 'ausente') return t('biblioteca.estadoArchivoAusente');
    if (archivo.estado === 'corrupto') return t('biblioteca.estadoArchivoCorrupto');
    return t('biblioteca.errorDesconocido');
  };

  const crear = async () => {
    const limpio = nombre.trim();
    if (!limpio || ocupado) return;
    if (await seccion.crearProyecto(limpio)) {
      setNombre('');
      setCreando(false);
    }
  };

  const alternarAbierto = async (proyecto: ProyectoDeLaSeccion) => {
    if (abierto === proyecto.projectId) {
      setAbierto(null);
      return;
    }
    setAbierto(proyecto.projectId);
    // Abrir lee de verdad cada archivo; la sección se recarga con el resultado.
    await seccion.abrirProyecto(proyecto.projectId);
  };

  const duplicar = (proyecto: ProyectoDeLaSeccion) =>
    seccion.duplicarProyecto(proyecto.projectId, t('biblioteca.copiaDe', { nombre: proyecto.name }));

  const eliminar = async (proyecto: ProyectoDeLaSeccion) => {
    const confirmado = await confirmAction(
      t('biblioteca.eliminar'),
      t('biblioteca.confirmarEliminar', { nombre: proyecto.name }),
      t('common.delete'),
      true,
      t,
    );
    if (!confirmado) return;
    if (abierto === proyecto.projectId) setAbierto(null);
    await seccion.eliminarProyecto(proyecto.projectId);
  };

  const boton = (etiqueta: string, alPulsar: () => void, principal = false) => (
    <TouchableOpacity
      key={etiqueta}
      onPress={alPulsar}
      disabled={ocupado}
      activeOpacity={0.8}
      accessibilityLabel={etiqueta}
      style={[styles.boton, principal ? { backgroundColor: theme.colors.accent } : { borderColor: theme.colors.border }]}
    >
      <Text style={[styles.botonTexto, { color: principal ? '#1F2937' : theme.colors.text }]}>{etiqueta}</Text>
    </TouchableOpacity>
  );

  const bloqueDeUbicacion = (): React.ReactNode => {
    if (!estado) return null;
    switch (estado.ubicacion) {
      case 'disponible':
        return null;
      case 'pidiendo_permiso':
      case 'creando':
      case 'verificando':
        return (
          <View style={tarjeta}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.texto, textoSecundario]}>{t('biblioteca.estadoPreparando')}</Text>
          </View>
        );
      case 'sin_configurar':
        return (
          <View style={tarjeta}>
            <Text style={[styles.texto, { color: theme.colors.text }]}>{textoDelPermiso(estado.plataforma)}</Text>
            {estado.plataforma ? boton(t('biblioteca.permisoContinuar'), seccion.activar, true) : null}
          </View>
        );
      case 'permiso_denegado':
        return (
          <View style={tarjeta}>
            <Text style={[styles.texto, { color: theme.colors.text }]}>{t('biblioteca.permisoDenegado')}</Text>
            <View style={styles.fila}>
              {boton(t('biblioteca.permisoReintentar'), seccion.activar, true)}
              {boton(t('biblioteca.permisoElegirOtra'), seccion.activar)}
            </View>
          </View>
        );
      case 'permiso_perdido':
        return (
          <View style={tarjeta}>
            <Text style={[styles.estado, { color: theme.colors.warning }]}>{t('biblioteca.estadoPermisoPerdido')}</Text>
            <Text style={[styles.texto, { color: theme.colors.text }]}>{t('biblioteca.permisoPerdido')}</Text>
            {boton(t('biblioteca.permisoVolverAPermitir'), seccion.volverAPermitir, true)}
          </View>
        );
      case 'sin_espacio':
        return (
          <View style={tarjeta}>
            <Text style={[styles.texto, { color: theme.colors.text }]}>{t('biblioteca.ubicacionSinEspacio')}</Text>
            {boton(t('biblioteca.permisoReintentar'), seccion.activar, true)}
          </View>
        );
      case 'error_recuperable':
        return (
          <View style={tarjeta}>
            <Text style={[styles.texto, { color: theme.colors.text }]}>{t('biblioteca.ubicacionError')}</Text>
            {boton(t('biblioteca.permisoReintentar'), seccion.activar, true)}
          </View>
        );
      case 'no_disponible':
        // Con registro, la carpeta guardada ya no está: se ofrece elegir otra. Sin registro, el aparato no puede.
        if (!estado.registro) {
          return (
            <View style={tarjeta}>
              <Text style={[styles.texto, { color: theme.colors.text }]}>{t('biblioteca.ubicacionNoDisponible')}</Text>
            </View>
          );
        }
        return (
          <View style={tarjeta}>
            <Text style={[styles.texto, { color: theme.colors.text }]}>{t('biblioteca.permisoPerdido')}</Text>
            {boton(t('biblioteca.permisoElegirOtra'), seccion.activar, true)}
          </View>
        );
      default:
        return null;
    }
  };

  const listaDeProyectos = (proyectos: ProyectoDeLaSeccion[]): React.ReactNode => (
    <View style={styles.lista}>
      <View style={styles.fila}>
        {boton(creando ? t('common.close') : t('biblioteca.nuevo'), () => setCreando((v) => !v), !creando)}
      </View>
      {creando && (
        <View style={[styles.nuevo, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
          <TextInput
            style={[styles.entrada, { color: theme.colors.text, borderColor: theme.colors.border }]}
            value={nombre}
            onChangeText={setNombre}
            placeholder={t('biblioteca.nombreDelProyecto')}
            placeholderTextColor={theme.colors.textSecondary}
            onSubmitEditing={crear}
            autoFocus
            accessibilityLabel={t('biblioteca.nombreDelProyecto')}
          />
          {boton(t('biblioteca.crear'), crear, true)}
        </View>
      )}
      {proyectos.length === 0 ? (
        <Text style={[styles.texto, textoSecundario]}>{t('biblioteca.vacio')}</Text>
      ) : (
        proyectos.map((proyecto) => {
          const expandido = abierto === proyecto.projectId;
          return (
            <View key={proyecto.projectId} style={tarjeta}>
              <View style={styles.cabecera}>
                <View style={[styles.caratula, { backgroundColor: theme.colors.accent + '33' }]}>
                  <Text style={styles.caratulaTexto}>{proyecto.emoji}</Text>
                </View>
                <View style={styles.cabeceraTexto}>
                  <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={2}>{proyecto.name}</Text>
                  <Text style={[styles.meta, textoSecundario]}>{t('biblioteca.ubicacion')}</Text>
                </View>
                <Text style={[styles.estado, { color: colorDelEstado(proyecto.estado) }]}>{textoDelEstadoDelProyecto(proyecto.estado)}</Text>
              </View>
              <Text style={[styles.meta, textoSecundario]}>
                {t('biblioteca.archivos', { contador: proyecto.archivos.length })}
                {' · '}
                {t('biblioteca.modificado', { fecha: formatearFecha(proyecto.modificadoEn, locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
              </Text>
              <View style={styles.fila}>
                {boton(t('projects.open'), () => alternarAbierto(proyecto), true)}
                {boton(t('biblioteca.duplicar'), () => duplicar(proyecto))}
                {boton(t('biblioteca.exportar'), () => seccion.exportarProyecto(proyecto.projectId))}
                {boton(t('biblioteca.eliminar'), () => eliminar(proyecto))}
              </View>
              {expandido && (
                <View style={styles.archivos}>
                  {proyecto.archivos.length === 0 ? (
                    <Text style={[styles.meta, textoSecundario]}>{t('biblioteca.sinArchivos')}</Text>
                  ) : (
                    proyecto.archivos.map((archivo) => (
                      <View key={archivo.recursoId} style={styles.archivo}>
                        <Text style={[styles.texto, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>{archivo.nombre}</Text>
                        <Text style={[styles.meta, textoSecundario]}>{bytesLegibles(archivo.tamano)}</Text>
                        <Text style={[styles.meta, { color: archivo.estado === 'local' ? theme.colors.success : theme.colors.error }]}>
                          {textoDelArchivo(archivo)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.bloque}>
      <SectionTitle title={t('biblioteca.titulo')} />
      <Text style={[styles.texto, textoSecundario]}>{t('biblioteca.descripcion')}</Text>
      <Text style={[styles.meta, textoSecundario]}>{t('biblioteca.persistenciaNoGarantizada')}</Text>
      <Text style={[styles.meta, textoSecundario]}>
        {estado?.espacioLibre != null ? t('biblioteca.espacioLibre', { espacio: bytesLegibles(estado.espacioLibre) }) : t('biblioteca.espacioDesconocido')}
        {' · '}
        {t('biblioteca.respaldoNinguno')}
        {' · '}
        {t('biblioteca.sincronizacionNoHabilitada')}
      </Text>

      {estado?.soloLectura && <Text style={[styles.aviso, { color: theme.colors.warning }]}>{t('biblioteca.avisoSoloLectura')}</Text>}
      {estado?.avisos.map((aviso) => (
        <Text key={aviso} style={[styles.aviso, { color: theme.colors.warning }]}>{textoDelAviso(aviso)}</Text>
      ))}
      {error ? <Text style={[styles.aviso, { color: theme.colors.error }]}>{textoDelError(error)}</Text> : null}

      {cargando && !vista ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : estado?.ubicacion === 'disponible' ? (
        listaDeProyectos(estado.proyectos)
      ) : (
        bloqueDeUbicacion()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: {
    gap: SPACING.md,
  },
  tarjeta: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  texto: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  meta: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(16),
  },
  estado: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  aviso: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  boton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: scale(6),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  botonTexto: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  lista: {
    gap: SPACING.md,
  },
  nuevo: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  entrada: {
    height: scale(42),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    fontSize: FONT_SIZE.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  caratula: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  caratulaTexto: {
    fontSize: scale(22),
  },
  cabeceraTexto: {
    flex: 1,
  },
  nombre: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  archivos: {
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  archivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});

export default SeccionDelDispositivo;
