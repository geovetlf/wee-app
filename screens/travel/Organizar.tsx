import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Interruptor from '../../components/Interruptor';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Campo, Chip, EstadoVacio, Fila, HojaInferior, TituloDeSeccion, Tarjeta } from '../../components/travel/Piezas';
import { PerfilViajero, TarjetaDocumento, TarjetaPresupuesto } from '../../components/travel/Tarjetas';
import { DialogoConfirmacionIA } from '../../components/travel/Brain';
import { SelectorFecha, SelectorMoneda } from '../../components/travel/Selectores';
import { TRAVEL } from '../../components/travel/tema';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import {
  CATEGORIAS_DE_GASTO, CategoriaDeGasto, PERMISOS, Permiso, TIPOS_DE_DOCUMENTO, TIPOS_DE_RESERVA, TipoDeDocumento, TipoDeReserva, ViajeDemo,
} from '../../constants/travelDemo';
import { isoDeHoyMas, nuevoId } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 3 · MIS VIAJES — organizar: reservas externas (solo un registro: Weë no vende ni reserva nada), documentos (DEMO:
 * nada se sube a ningún servidor), gastos y viaje compartido (DEMO: no se envía ninguna invitación).
 */

const conViaje = (Pantalla: React.FC<{ viaje: ViajeDemo }>): React.FC<{ id?: string }> => function ConViaje({ id }) {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viajePorId } = useTravelDemo();
  const viaje = viajePorId(id);
  if (!viaje) return <MarcoDeTravel titulo={x.t('travel.modTrips')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.modTrips')} onCta={() => ir('viajes')} /></MarcoDeTravel>;
  return <Pantalla viaje={viaje} />;
};

/* ── Reservas externas ──────────────────────────────────────────────────── */

const Reservas: React.FC<{ viaje: ViajeDemo }> = ({ viaje }) => {
  const x = useTextosDeTravel();
  const { cambiarViaje } = useTravelDemo();
  const [abierta, setAbierta] = useState(false);
  const [tipo, setTipo] = useState<TipoDeReserva>('hotel');
  const [proveedor, setProveedor] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState(viaje.inicio || isoDeHoyMas(7));
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(viaje.moneda);
  const [confirmacion, setConfirmacion] = useState('');
  const [borrar, setBorrar] = useState<string | null>(null);
  const guardar = () => {
    cambiarViaje(viaje.id, (v) => ({ ...v, reservas: [...v.reservas, { id: nuevoId('r'), tipo, proveedor: proveedor.trim(), direccion: direccion.trim(), fecha, monto: Number(monto.replace(/[^\d.]/g, '')) || 0, moneda, confirmacion: confirmacion.trim(), documentos: 0 }] }));
    setAbierta(false); setProveedor(''); setDireccion(''); setMonto(''); setConfirmacion('');
  };
  return (
    <MarcoDeTravel titulo={x.t('travel.bookings')} subtitulo={x.nombreDeViaje(viaje)} icono="bookmarks-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.bookingsNote')} />
      {viaje.reservas.length === 0 && <EstadoVacio icono="bookmarks-outline" titulo={x.t('travel.noBookings')} texto={x.t('travel.noBookingsText')} />}
      {viaje.reservas.map((r) => {
        const t = TIPOS_DE_RESERVA.find((k) => k.id === r.tipo);
        return (
          <Tarjeta key={r.id}>
            <Fila icono={t?.icono ?? 'bookmark-outline'} titulo={r.proveedor || x.t(t?.titulo ?? '')} subtitulo={x.t(t?.titulo ?? '')} derecha={r.monto ? x.dinero(r.monto, r.moneda) : undefined} />
            <Text style={o.dato}>{x.t('travel.labelValue', { etiqueta: x.t('travel.bkDate'), valor: x.fecha(r.fecha, 0, { day: 'numeric', month: 'long', year: 'numeric' }) })}</Text>
            {!!r.direccion && <Text style={o.dato}>{x.t('travel.labelValue', { etiqueta: x.t('travel.bkAddress'), valor: r.direccion })}</Text>}
            {!!r.confirmacion && <Text style={o.dato}>{x.t('travel.labelValue', { etiqueta: x.t('travel.bkConfirmation'), valor: r.confirmacion })}</Text>}
            <Text style={o.dato}>{x.t('travel.documentsCount', { contador: r.documentos })}</Text>
            <Boton texto={x.t('travel.remove')} icono="trash-outline" variante="peligro" pequeno onPress={() => setBorrar(r.id)} />
          </Tarjeta>
        );
      })}
      <Boton texto={x.t('travel.addBooking')} icono="add" onPress={() => setAbierta(true)} />
      <HojaInferior visible={abierta} onCerrar={() => setAbierta(false)} titulo={x.t('travel.addBooking')}>
        <View style={o.chips}>{TIPOS_DE_RESERVA.map((k) => <Chip key={k.id} texto={x.t(k.titulo)} icono={k.icono} activo={tipo === k.id} onPress={() => setTipo(k.id)} />)}</View>
        <Campo etiqueta={x.t('travel.bkProvider')} valor={proveedor} onCambiar={setProveedor} />
        <Campo etiqueta={x.t('travel.bkAddress')} valor={direccion} onCambiar={setDireccion} />
        <Text style={o.etiqueta}>{x.t('travel.bkDate')}</Text>
        <SelectorFecha valor={fecha} onCambiar={setFecha} />
        <Campo etiqueta={x.t('travel.amount')} valor={monto} onCambiar={setMonto} teclado="decimal-pad" />
        <SelectorMoneda valor={moneda} onCambiar={setMoneda} />
        <Campo etiqueta={x.t('travel.bkConfirmation')} valor={confirmacion} onCambiar={setConfirmacion} />
        <Boton texto={x.t('travel.saveRecord')} icono="checkmark" desactivado={!proveedor.trim()} onPress={guardar} />
      </HojaInferior>
      <DialogoConfirmacionIA visible={!!borrar} peligro titulo={x.t('travel.removeBookingQ')} texto={x.t('travel.removeBookingText')} confirmar={x.t('travel.remove')} onCancelar={() => setBorrar(null)} onConfirmar={() => { cambiarViaje(viaje.id, (v) => ({ ...v, reservas: v.reservas.filter((r) => r.id !== borrar) })); setBorrar(null); }} />
    </MarcoDeTravel>
  );
};

/* ── Documentos ─────────────────────────────────────────────────────────── */

const Documentos: React.FC<{ viaje: ViajeDemo }> = ({ viaje }) => {
  const x = useTextosDeTravel();
  const { cambiarViaje } = useTravelDemo();
  const [nuevo, setNuevo] = useState(false);
  const [tipo, setTipo] = useState<TipoDeDocumento>('visado');
  const [protegido, setProtegido] = useState(true);
  const [viendo, setViendo] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);
  const doc = viaje.documentos.find((d) => d.id === viendo);
  const crear = () => {
    const t = TIPOS_DE_DOCUMENTO.find((k) => k.id === tipo);
    cambiarViaje(viaje.id, (v) => ({ ...v, documentos: [...v.documentos, { id: nuevoId('doc'), tipo, titulo: t?.titulo ?? 'travel.docConfirmation', protegido, fecha: isoDeHoyMas(0) }] }));
    setNuevo(false);
  };
  return (
    <MarcoDeTravel titulo={x.t('travel.documents')} subtitulo={x.nombreDeViaje(viaje)} icono="folder-open-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.documentsNote')} />
      {viaje.documentos.length === 0 && <EstadoVacio icono="folder-open-outline" titulo={x.t('travel.noDocuments')} texto={x.t('travel.noDocumentsText')} />}
      {viaje.documentos.map((d) => <TarjetaDocumento key={d.id} documento={d} onVer={() => setViendo(d.id)} />)}
      <Boton texto={x.t('travel.addDocument')} icono="add" onPress={() => setNuevo(true)} />
      <HojaInferior visible={nuevo} onCerrar={() => setNuevo(false)} titulo={x.t('travel.addDocument')}>
        <View style={o.chips}>{TIPOS_DE_DOCUMENTO.map((k) => <Chip key={k.id} texto={x.t(k.titulo)} icono={k.icono} activo={tipo === k.id} onPress={() => setTipo(k.id)} />)}</View>
        <View style={o.filaEntre}>
          <Text style={o.etiqueta}>{x.t('travel.docProtect')}</Text>
          <Interruptor value={protegido} onValueChange={setProtegido} trackColor={{ true: TRAVEL.morado, false: TRAVEL.borde }} accessibilityLabel={x.t('travel.docProtect')} />
        </View>
        <AvisoDemo texto={x.t('travel.docUploadDemo')} />
        <Boton texto={x.t('travel.addDemoDocument')} icono="checkmark" onPress={crear} />
      </HojaInferior>
      <HojaInferior visible={!!doc} onCerrar={() => setViendo(null)} titulo={doc ? x.t(doc.titulo) : ''}>
        {!!doc && (
          <>
            <View style={o.previa}><Text style={o.previaTexto}>{x.t(doc.protegido ? 'travel.docProtectedPreview' : 'travel.docPreviewDemo')}</Text></View>
            <Fila icono={doc.protegido ? 'lock-closed-outline' : 'eye-off-outline'} titulo={x.t(doc.protegido ? 'travel.docProtected' : 'travel.docPrivate')} subtitulo={x.t(doc.protegido ? 'travel.docProtectedText' : 'travel.docPrivateText')} />
            <Boton texto={x.t(doc.protegido ? 'travel.docUnprotect' : 'travel.docProtect')} icono={doc.protegido ? 'lock-open-outline' : 'lock-closed-outline'} variante="suave" onPress={() => cambiarViaje(viaje.id, (v) => ({ ...v, documentos: v.documentos.map((d) => (d.id === doc.id ? { ...d, protegido: !d.protegido } : d)) }))} />
            <Boton texto={x.t('travel.delete')} icono="trash-outline" variante="peligro" onPress={() => { setBorrar(doc.id); setViendo(null); }} />
          </>
        )}
      </HojaInferior>
      <DialogoConfirmacionIA visible={!!borrar} peligro titulo={x.t('travel.deleteDocumentQ')} texto={x.t('travel.deleteDocumentText')} confirmar={x.t('travel.delete')} onCancelar={() => setBorrar(null)} onConfirmar={() => { cambiarViaje(viaje.id, (v) => ({ ...v, documentos: v.documentos.filter((d) => d.id !== borrar) })); setBorrar(null); }} />
    </MarcoDeTravel>
  );
};

/* ── Gastos ─────────────────────────────────────────────────────────────── */

const Gastos: React.FC<{ viaje: ViajeDemo }> = ({ viaje }) => {
  const x = useTextosDeTravel();
  const { cambiarViaje } = useTravelDemo();
  const [abierta, setAbierta] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDeGasto>('comida');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(viaje.moneda);
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(isoDeHoyMas(0));
  const enMoneda = viaje.gastos.filter((g) => g.moneda === viaje.moneda);
  const total = enMoneda.reduce((s, g) => s + g.monto, 0);
  const otras = viaje.gastos.length - enMoneda.length;
  const guardar = () => {
    cambiarViaje(viaje.id, (v) => ({ ...v, gastos: [{ id: nuevoId('g'), categoria, monto: Number(monto.replace(/[^\d.]/g, '')) || 0, moneda, fecha, descripcion: descripcion.trim() }, ...v.gastos] }));
    setAbierta(false); setMonto(''); setDescripcion('');
  };
  return (
    <MarcoDeTravel titulo={x.t('travel.expenses')} subtitulo={x.nombreDeViaje(viaje)} icono="receipt-outline" demo contextoBrain={x.t('travel.brainCtxBudget', { viaje: x.nombreDeViaje(viaje), total: x.dinero(viaje.presupuesto, viaje.moneda) })}>
      <TarjetaPresupuesto gastado={total} total={viaje.presupuesto} moneda={viaje.moneda} titulo={x.t('travel.spentVsBudget')} />
      {otras > 0 && <AvisoDemo texto={x.t('travel.otherCurrencies', { contador: otras })} />}
      <View style={o.bloque}>
        <TituloDeSeccion titulo={x.t('travel.byCategory')} />
        {CATEGORIAS_DE_GASTO.map((c) => {
          const suma = enMoneda.filter((g) => g.categoria === c.id).reduce((s, g) => s + g.monto, 0);
          return suma > 0 ? <Fila key={c.id} icono={c.icono} titulo={x.t(c.titulo)} derecha={x.dinero(suma, viaje.moneda)} /> : null;
        })}
      </View>
      <Boton texto={x.t('travel.addExpense')} icono="add" onPress={() => setAbierta(true)} />
      <View style={o.bloque}>
        <TituloDeSeccion titulo={x.t('travel.history')} />
        {viaje.gastos.length === 0 && <EstadoVacio icono="receipt-outline" titulo={x.t('travel.noExpenses')} texto={x.t('travel.noExpensesText')} />}
        {viaje.gastos.map((g) => {
          const c = CATEGORIAS_DE_GASTO.find((k) => k.id === g.categoria);
          return <Fila key={g.id} icono={c?.icono ?? 'receipt-outline'} titulo={g.descripcion || x.t(c?.titulo ?? '')} subtitulo={`${x.t(c?.titulo ?? '')} · ${x.fecha(g.fecha)}`} derecha={x.dinero(g.monto, g.moneda)} />;
        })}
      </View>
      <HojaInferior visible={abierta} onCerrar={() => setAbierta(false)} titulo={x.t('travel.addExpense')}>
        <View style={o.chips}>{CATEGORIAS_DE_GASTO.map((c) => <Chip key={c.id} texto={x.t(c.titulo)} icono={c.icono} activo={categoria === c.id} onPress={() => setCategoria(c.id)} />)}</View>
        <Campo etiqueta={x.t('travel.amount')} valor={monto} onCambiar={setMonto} teclado="decimal-pad" />
        <SelectorMoneda valor={moneda} onCambiar={setMoneda} />
        <Campo etiqueta={x.t('travel.description')} valor={descripcion} onCambiar={setDescripcion} />
        <Text style={o.etiqueta}>{x.t('travel.date')}</Text>
        <SelectorFecha valor={fecha} onCambiar={setFecha} />
        <Boton texto={x.t('travel.saveExpense')} icono="checkmark" desactivado={!(Number(monto.replace(/[^\d.]/g, '')) > 0)} onPress={guardar} />
      </HojaInferior>
    </MarcoDeTravel>
  );
};

/* ── Compartir el viaje ─────────────────────────────────────────────────── */

const Compartir: React.FC<{ viaje: ViajeDemo }> = ({ viaje }) => {
  const x = useTextosDeTravel();
  const { cambiarViaje } = useTravelDemo();
  const [invitar, setInvitar] = useState(false);
  const [quien, setQuien] = useState('');
  const [permiso, setPermiso] = useState<Permiso>('sugerir');
  const pendientes = viaje.propuestas.filter((p) => p.estado === 'pendiente');
  const decidir = (pid: string, estado: 'aprobada' | 'rechazada') => cambiarViaje(viaje.id, (v) => ({ ...v, propuestas: v.propuestas.map((p) => (p.id === pid ? { ...p, estado } : p)) }));
  return (
    <MarcoDeTravel titulo={x.t('travel.shareTrip')} subtitulo={x.nombreDeViaje(viaje)} icono="people-outline" demo sinBrain>
      <View style={o.filaEntre}>
        <Text style={o.etiqueta}>{x.t('travel.sharedView')}</Text>
        <Interruptor value={viaje.compartido} onValueChange={(c) => cambiarViaje(viaje.id, (v) => ({ ...v, compartido: c }))} trackColor={{ true: TRAVEL.morado, false: TRAVEL.borde }} accessibilityLabel={x.t('travel.sharedView')} />
      </View>
      <AvisoDemo texto={x.t('travel.shareDemoNote')} />
      <View style={o.bloque}>
        <TituloDeSeccion titulo={x.t('travel.companions')} />
        <PerfilViajero nombre={x.t('travel.you')} detalle={x.t('travel.owner')} />
        {viaje.participantes.map((p) => (
          <PerfilViajero key={p.id} nombre={p.nombre} detalle={p.pendiente ? x.t('travel.invitePending') : x.t(PERMISOS[p.permiso])} pendiente={p.pendiente}>
            <Chip texto={x.t(PERMISOS[p.permiso])} onPress={() => cambiarViaje(viaje.id, (v) => ({ ...v, participantes: v.participantes.map((k) => (k.id === p.id ? { ...k, permiso: k.permiso === 'ver' ? 'sugerir' : k.permiso === 'sugerir' ? 'editar' : 'ver' } : k)) }))} />
          </PerfilViajero>
        ))}
        <Boton texto={x.t('travel.inviteCompanion')} icono="person-add-outline" variante="suave" onPress={() => setInvitar(true)} />
      </View>
      <View style={o.bloque}>
        <TituloDeSeccion titulo={x.t('travel.pendingApprovals')} subtitulo={x.t('travel.pendingApprovalsSub')} />
        {pendientes.length === 0 && <Text style={o.dato}>{x.t('travel.nothingPending')}</Text>}
        {pendientes.map((p) => (
          <Tarjeta key={p.id}>
            <Fila icono="bulb-outline" titulo={x.t(p.clave)} subtitulo={x.t('travel.proposedBy', { nombre: p.autor, n: p.dia })} />
            <View style={o.chips}>
              <Boton texto={x.t('travel.approve')} icono="checkmark" pequeno onPress={() => decidir(p.id, 'aprobada')} />
              <Boton texto={x.t('travel.reject')} icono="close" variante="linea" pequeno onPress={() => decidir(p.id, 'rechazada')} />
            </View>
          </Tarjeta>
        ))}
        {viaje.propuestas.filter((p) => p.estado !== 'pendiente').map((p) => <Fila key={p.id} icono={p.estado === 'aprobada' ? 'checkmark-circle-outline' : 'close-circle-outline'} titulo={x.t(p.clave)} subtitulo={x.t(p.estado === 'aprobada' ? 'travel.approved' : 'travel.rejected')} />)}
      </View>
      <Tarjeta>
        <Campo etiqueta={x.t('travel.collabNotes')} valor={viaje.notas} onCambiar={(t) => cambiarViaje(viaje.id, (v) => ({ ...v, notas: t }))} multilinea placeholder={x.t('travel.notesPh')} />
      </Tarjeta>
      <HojaInferior visible={invitar} onCerrar={() => setInvitar(false)} titulo={x.t('travel.inviteCompanion')}>
        <Campo etiqueta={x.t('travel.inviteWho')} valor={quien} onCambiar={setQuien} placeholder={x.t('travel.inviteWhoPh')} />
        <View style={o.chips}>{(['ver', 'sugerir', 'editar'] as Permiso[]).map((k) => <Chip key={k} texto={x.t(PERMISOS[k])} activo={permiso === k} onPress={() => setPermiso(k)} />)}</View>
        <AvisoDemo texto={x.t('travel.inviteDemoNote')} />
        <Boton texto={x.t('travel.addInvite')} icono="checkmark" desactivado={!quien.trim()} onPress={() => { cambiarViaje(viaje.id, (v) => ({ ...v, participantes: [...v.participantes, { id: nuevoId('p'), nombre: quien.trim(), permiso, pendiente: true }] })); setQuien(''); setInvitar(false); }} />
      </HojaInferior>
    </MarcoDeTravel>
  );
};

export const ReservasScreen = conViaje(Reservas);
export const DocumentosScreen = conViaje(Documentos);
export const GastosScreen = conViaje(Gastos);
export const CompartirScreen = conViaje(Compartir);

const o = StyleSheet.create({
  bloque: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  etiqueta: { fontSize: 14, fontWeight: '800', color: TRAVEL.tinta, flexShrink: 1 },
  dato: { fontSize: 13, color: TRAVEL.texto },
  previa: { height: 160, borderRadius: 18, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center', padding: 20 },
  previaTexto: { fontSize: 13, color: TRAVEL.morado, fontWeight: '700', textAlign: 'center' },
});
