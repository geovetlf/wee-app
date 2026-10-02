import { StyleSheet, Platform } from 'react-native';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { noOutline } from '../utils/platform';

/*
 * LOS ESTILOS DE WEETALK, APARTE DE SU PANTALLA.
 *
 * Vivían al final de `ConversationScreen.tsx`, que con el arreglo de la grabación de voz pasó de las mil líneas. Se
 * mudaron aquí tal cual —mismas claves, mismos valores, el mismo `StyleSheet.create`—: la pantalla los importa con
 * el mismo nombre, `styles`, y nada de lo que se pinta cambia.
 */
export const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerName: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },

  list: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },

  dateRow: { alignItems: 'center', marginVertical: SPACING.md },
  datePill: { paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  dateText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  row: { marginVertical: 2 },
  rowR: { alignItems: 'flex-end' },
  rowL: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  msgText: { fontSize: FONT_SIZE.base, lineHeight: 20 },
  img: { width: 220, aspectRatio: 3 / 4, borderRadius: BORDER_RADIUS.md, marginBottom: 4 },
  imgStandalone: { width: 220, aspectRatio: 3 / 4, borderRadius: BORDER_RADIUS.lg },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  time: { fontSize: 11 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.base },
  skeletonWrap: { flex: 1, justifyContent: 'flex-end', gap: 10, paddingBottom: SPACING.md },
  skeletonRow: { paddingHorizontal: SPACING.xs },
  skeletonBubble: { height: 38, borderRadius: BORDER_RADIUS.lg, opacity: 0.4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cameraBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingLeft: SPACING.md,
    paddingRight: 4,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    ...noOutline, /* el de utils/platform: sin borde de foco en la web, nada en nativo */
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', paddingBottom: 4 },
  inputActionBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  recordingBar: { justifyContent: 'center' },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  recordingTime: { color: '#EF4444', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontVariant: ['tabular-nums'], marginHorizontal: 8 },
  recordingWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  recordingWaveBar: { width: 3, borderRadius: 2 },
  recordingStopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  ephemeralBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  ephemeralBubble: { opacity: 0.85 },
  ephemeralIcon: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  ephemeralBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  ephemeralBannerText: { color: '#22C55E', fontSize: 11, fontWeight: FONT_WEIGHT.medium },

  // Theme picker
  colorPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  colorPickerDismiss: { flex: 1 },
  colorPickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  colorPickerTitle: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, marginBottom: 12, marginLeft: 4 },
  themeScrollView: { marginHorizontal: -20, paddingHorizontal: 20 },
  themeGrid: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  themeOption: { width: 85, height: 70, borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'flex-end', borderWidth: 2, borderColor: 'transparent' },
  themeOptionActive: { borderWidth: 2 },
  themePreviewBubble: { position: 'absolute', top: 8, right: 10, width: 26, height: 14, borderRadius: 7 },
  themePreviewBubbleOther: { position: 'absolute', top: 24, left: 10, width: 20, height: 12, borderRadius: 6 },
  themeOptionLabel: { fontSize: 10, fontWeight: FONT_WEIGHT.medium, marginTop: 4 },
  wallpaperScrollView: { marginHorizontal: -20, paddingHorizontal: 20 },
  wallpaperGrid: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  wallpaperOption: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  wallpaperOptionActive: { borderColor: '#F5B731' },
  wallpaperPreview: { width: '100%', height: '100%' },
  doneButton: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneButtonText: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  chatBackground: { flex: 1 },

  // View once styles
  viewOnceOpened: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewOnceSender: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  viewOnceTap: { alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20 },
  viewOnceText: { fontSize: FONT_SIZE.sm },

  // Photo preview modal
  previewModal: { flex: 1, backgroundColor: '#000' },
  previewHeader: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  previewImage: { flex: 1 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, paddingBottom: 40 },
  previewToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  previewToggleActive: { backgroundColor: 'rgba(34,197,94,0.6)' },
  previewToggleText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  previewSendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  // View once fullscreen viewer
  viewOnceModal: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20 },
  viewOnceImageWrap: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden' },
  viewOnceFullImage: { width: '100%', height: '100%' },
  viewOnceHint: { color: 'rgba(255,255,255,0.35)', fontSize: FONT_SIZE.sm, marginTop: SPACING.lg },
});
