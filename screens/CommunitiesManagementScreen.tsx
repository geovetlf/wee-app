import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { paraBuscar } from '../i18n/caja';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { communityService, Community } from '../services/communityService';
import { comunidadesService, motivoDelError, nuevaPeticion, PapelEnComunidad } from '../services/comunidadesService';
import { POPULAR_COMMUNITIES } from '../constants/communityCategories';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import TextoEnMayusculas from '../components/TextoEnMayusculas';
import { descripcionDeComunidad, nombreDeComunidad } from '../utils/comunidadesDeWee';
import { confirmAction, notify } from '../utils/notify';
import { MARCA } from '../constants/marca';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

const CommunitiesManagementScreen: React.FC = () => {
  const { t, locale } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Comunidades populares de ejemplo (simulan comunidades creadas por usuarios)
  const EXAMPLE_COMMUNITIES: Community[] = POPULAR_COMMUNITIES.map((c) => ({
    id: 'ex-' + c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon.replace('-outline', ''),
    rules: [],
    memberCount: c.members,
    postCount: 0,
    createdAt: {} as any,
    updatedAt: {} as any,
    isOfficial: false,
    moderators: [],
    status: 'active' as const,
  }));

  // Desde el Home: buscar una comunidad o crear la tuya
  const homeParams = (useRoute<any>().params || {}) as { query?: string; create?: boolean };
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(homeParams.query || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (homeParams.create) setShowCreateModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comunidades a las que el usuario pertenece
  const joinedCommunityIds = userProfile?.joinedCommunities || [];
  /*
   * LA CARA CON LA QUE SE ACTÚA. Unirse, salir y crear van con el uid del perfil ACTIVO (Real o Weë), nunca con el de la
   * cuenta: el servidor (functions/src/social/comunidades.ts) comprueba que esa cara es de la sesión y escribe en ella.
   */
  const identidad = userProfile?.uid;
  /* El papel de ESTA cara en cada comunidad (lo da el servidor y solo de esta cara): «Mis comunidades» = donde es dueña. */
  const [papeles, setPapeles] = useState<Record<string, PapelEnComunidad>>({});
  /* Una petición por intento de creación: un doble toque o un reintento no crean dos comunidades. */
  const peticionDeCreacion = useRef<string | null>(null);

  const loadCommunities = useCallback(async () => {
    try {
      // Cargar comunidades reales creadas por usuarios (los papeles de la cara activa llegan aparte, sin bloquear la lista)
      const realCommunities = await communityService.getUserCommunities();

      // Combinar reales + ejemplo (reales primero)
      const exampleIds = new Set(EXAMPLE_COMMUNITIES.map(c => c.slug));
      const filteredExamples = EXAMPLE_COMMUNITIES.filter(
        ex => !realCommunities.some(r => r.slug === ex.slug)
      );
      setCommunities([...realCommunities, ...filteredExamples]);
    } catch (error) {
      console.error('Error loading communities:', error);
      // Si falla la carga, mostrar al menos las de ejemplo
      setCommunities(EXAMPLE_COMMUNITIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [joinedCommunityIds]);

  /*
   * LOS PAPELES DE LA CARA ACTIVA. Al cambiar de cara se vacían enseguida (nunca se pintan los de la otra) y se piden
   * de nuevo; una respuesta que llegue tarde de la cara anterior se descarta.
   */
  useEffect(() => {
    let vigente = true;
    setPapeles({});
    if (identidad) {
      comunidadesService.misComunidades(identidad)
        .then((mias) => { if (vigente) setPapeles(Object.fromEntries(mias.memberships.map((m) => [m.communityId, m.role]))); })
        .catch((error) => console.error('Error loading community roles:', error));
    }
    return () => { vigente = false; };
  }, [identidad]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommunities();
  };

  const navigateToRegister = () => {
    const tabNav = navigation.getParent();
    const mainNav = tabNav?.getParent();
    if (mainNav) {
      (mainNav as any).navigate('Register');
    }
  };

  /*
   * UNIRSE Y SALIR. Salir se confirma con `confirmAction` y no con un `Alert.alert` propio: en la web `Alert.alert`
   * no pinta nada ni llama a ningún botón, así que no se podía salir de una comunidad y el indicador, que se encendía
   * antes del diálogo y solo se apagaba en sus botones, se quedaba girando para siempre. En el teléfono el diálogo es
   * el mismo —Cancelar y Salir, destructivo—, y el indicador se apaga en el `finally`, pase lo que pase.
   */
  const handleToggleCommunity = async (community: Community) => {
    if (!user) { navigateToRegister(); return; }
    if (!community.id || !identidad) return;

    const isJoined = joinedCommunityIds.includes(community.id) || Boolean(papeles[community.id]);
    setJoiningCommunity(community.id);

    try {
      if (isJoined) {
        // Confirmar antes de salir
        const confirmado = await confirmAction(
          t('communities.leaveTitle'),
          t('communities.leaveConfirm', { nombre: nombreDeComunidad(community, t, locale) }),
          t('communities.leave'),
          true,
          t,
        );
        if (!confirmado) return;
        try {
          /* Sale SOLO la cara activa. Si es la dueña, el servidor lo impide hasta que transfiera la comunidad. */
          const r = await comunidadesService.salir(identidad, community.id!);
          // Actualizar estado local
          const newJoinedCommunities = joinedCommunityIds.filter(id => id !== community.id);
          updateLocalProfile({ joinedCommunities: newJoinedCommunities });
          setPapeles(prev => { const { [community.id!]: _fuera, ...resto } = prev; return resto; });
          // La cifra que dejó el servidor
          setCommunities(prev => prev.map(c =>
            c.id === community.id
              ? { ...c, memberCount: r.memberCount }
              : c
          ));
        } catch (error) {
          console.error('Error leaving community:', motivoDelError(error), error);
          notify(t('common.error'), t('communities.leaveFailed'));
        }
      } else {
        // Unirse directamente, con la cara activa
        const r = await comunidadesService.unirse(identidad, community.id);
        // Actualizar estado local
        const newJoinedCommunities = joinedCommunityIds.includes(community.id) ? joinedCommunityIds : [...joinedCommunityIds, community.id];
        updateLocalProfile({ joinedCommunities: newJoinedCommunities });
        setPapeles(prev => ({ ...prev, [community.id!]: r.role }));
        // La cifra que dejó el servidor
        setCommunities(prev => prev.map(c =>
          c.id === community.id
            ? { ...c, memberCount: r.memberCount }
            : c
        ));
      }
    } catch (error) {
      console.error('Error toggling community:', error);
      notify(t('common.error'), t('communities.actionFailed'));
    } finally {
      setJoiningCommunity(null);
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => {
    const isJoined = item.id ? joinedCommunityIds.includes(item.id) || Boolean(papeles[item.id]) : false;
    const isToggling = joiningCommunity === item.id;

    return (
      <TouchableOpacity
        style={[styles.communityItem, { backgroundColor: theme.colors.card }]}
        onPress={() => (navigation as any).navigate('Feed', { communitySlug: item.slug })}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageThumbnailUrl || item.imageUrl }}
            style={styles.communityImage}
          />
        ) : (
          <View style={[styles.communityIcon, { backgroundColor: theme.colors.surface }]}>
            <Ionicons
              name={item.icon as any || 'people'}
              size={24}
              color={theme.colors.text}
            />
          </View>
        )}

        <View style={styles.communityInfo}>
          <View style={styles.communityHeader}>
            <Text style={[styles.communityName, { color: theme.colors.text }]}>
              {nombreDeComunidad(item, t, locale)}
            </Text>
            {item.isOfficial && (
              <View style={[styles.officialBadge, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.text} />
                <Text style={[styles.officialText, { color: theme.colors.text }]}>{t('communities.official')}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.communityDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {descripcionDeComunidad(item, t, locale)}
          </Text>
          <View style={styles.communityStats}>
            <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
              {t('communities.members', { contador: item.memberCount })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            isJoined
              ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }
              : { backgroundColor: theme.colors.text }
          ]}
          onPress={() => handleToggleCommunity(item)}
          disabled={isToggling}
          activeOpacity={0.7}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={isJoined ? theme.colors.text : theme.colors.background} />
          ) : (
            <>
              <Ionicons
                name={isJoined ? 'checkmark' : 'add'}
                size={16}
                color={isJoined ? theme.colors.text : theme.colors.background}
              />
              <Text style={[
                styles.joinButtonText,
                { color: isJoined ? theme.colors.text : theme.colors.background }
              ]}>
                {t(isJoined ? 'communities.memberOf' : 'communities.join')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </TextoEnMayusculas>
      <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {count}
        </Text>
      </View>
    </View>
  );

  // Filtrar por búsqueda
  const normalizedQuery = paraBuscar(searchQuery).trim();
  const filtered = normalizedQuery
    ? communities.filter(c =>
        paraBuscar(c.name).includes(normalizedQuery) ||
        paraBuscar(c.description).includes(normalizedQuery)
      )
    : communities;

  // Separar comunidades: mis creaciones, unidas, descubrir — siempre de la cara ACTIVA.
  // «Mías» = donde esta cara es dueña (lo dice el servidor) o, en una heredada, la que esta cara creó según su
  // `createdBy` de siempre (no se reinterpreta: una heredada creada «por la cuenta» sigue saliendo donde salía).
  const myUid = userProfile?.uid || user?.uid;
  const esMia = (c: Community) => Boolean(c.id && (papeles[c.id] === 'owner' || (c as any).createdBy === myUid));
  const estoyDentro = (c: Community) => Boolean(c.id && (joinedCommunityIds.includes(c.id) || papeles[c.id]));
  const myCommunities = filtered.filter(c => esMia(c));
  const joinedCommunities = filtered.filter(c => estoyDentro(c) && !esMia(c));
  const availableCommunities = filtered.filter(c => c.id && !estoyDentro(c) && !esMia(c));

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('communities.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + SPACING.sm,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <IconoDireccional name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('menu.communities')}
        </Text>
        <TouchableOpacity
          style={[styles.createCommunityBtn, { backgroundColor: theme.colors.text }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('communities.create')}
        >
          <Ionicons name="add" size={20} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={scale(18)} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('communities.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={scale(18)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        keyboardShouldPersistTaps="handled"
        data={[
          ...(myCommunities.length > 0 ? [{ type: 'header-mine', count: myCommunities.length }] : []),
          ...myCommunities.map(c => ({ type: 'community', data: c })),
          ...(joinedCommunities.length > 0 ? [{ type: 'header-joined', count: joinedCommunities.length }] : []),
          ...joinedCommunities.map(c => ({ type: 'community', data: c })),
          { type: 'header-available', count: availableCommunities.length },
          ...availableCommunities.map(c => ({ type: 'community', data: c })),
        ]}
        renderItem={({ item }) => {
          if (item.type === 'header-mine') {
            return renderSectionHeader(t('settings.myCommunities'), (item as any).count as number);
          }
          if (item.type === 'header-joined') {
            return renderSectionHeader(t('communities.joinedSection'), (item as any).count as number);
          }
          if (item.type === 'header-available') {
            return renderSectionHeader(t('communities.discoverSection'), (item as any).count as number);
          }
          return renderCommunityItem({ item: (item as any).data });
        }}
        keyExtractor={(item, index) => {
          if (item.type?.startsWith('header')) return item.type;
          return (item as any).data?.id || `community-${index}`;
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.text}
            colors={[theme.colors.text]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('communities.empty')}
            </Text>
          </View>
        }
      />

      {/* Create community — fullscreen modal */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <EspacioDeEscritura
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + SPACING.sm, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={26} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: theme.colors.text }]}>{t('communities.newCommunity')}</Text>
            <TouchableOpacity
              style={[styles.modalHeaderBtn, { backgroundColor: MARCA.primario, opacity: newName.trim() ? 1 : 0.4 }]}
              onPress={async () => {
                if (!newName.trim() || !user || !identidad || creating) return;
                setCreating(true);
                try {
                  /*
                   * CREAR ES DE LA CARA ACTIVA, Y UNA SOLA VEZ (docs/COMUNIDADES-IDENTIDAD.md).
                   *
                   * El servidor crea la comunidad con esta cara de dueña y como su ÚNICO miembro (antes: memberCount 1 +
                   * la unión del servicio + la de aquí = 3), la apunta en la lista de ESTA cara (antes las creadas desde
                   * el Perfil Weë no salían en «Mis comunidades») y no escribe la cuenta en lo público.
                   */
                  peticionDeCreacion.current = peticionDeCreacion.current || nuevaPeticion();
                  const { communityId } = await comunidadesService.crear(identidad, peticionDeCreacion.current, {
                    name: newName.trim(),
                    description: newDesc.trim() || t('communities.defaultDescription', { nombre: newName.trim() }),
                    icon: 'people',
                    rules: [],
                  });
                  peticionDeCreacion.current = null;
                  if (communityId) {
                    const newJoined = [...joinedCommunityIds, communityId];
                    updateLocalProfile({ joinedCommunities: newJoined });
                    setPapeles(prev => ({ ...prev, [communityId]: 'owner' }));
                  }
                  setNewName('');
                  setNewDesc('');
                  setShowCreateModal(false);
                  handleRefresh();
                } catch (e: any) {
                  /* El error técnico va al registro; la persona ve una frase de Weë. */
                  console.error('Error creando la comunidad:', e);
                  notify(t('common.error'), t('communities.createFailed'));
                }
                setCreating(false);
              }}
              disabled={!newName.trim() || creating}
            >
              <RellenoDeMarca radio={BORDER_RADIUS.full} />
              {creating ? (
                <ActivityIndicator size="small" color={MARCA.sobrePrimario} />
              ) : (
                <Text style={styles.modalHeaderBtnText}>{t('nav.create')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.modalForm}>
            <View style={[styles.modalField, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>{t('communities.name')}</Text>
              <TextInput
                style={[styles.modalFieldInput, { color: theme.colors.text }]}
                placeholder={t('communities.namePlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
                maxLength={40}
                autoFocus
              />
            </View>

            <View style={[styles.modalField, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>{t('communities.description')}</Text>
              <TextInput
                style={[styles.modalFieldInput, styles.modalFieldMulti, { color: theme.colors.text }]}
                placeholder={t('communities.descriptionPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                maxLength={200}
              />
            </View>
          </View>
        </EspacioDeEscritura>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  createCommunityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalHeaderBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  modalHeaderBtnText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalForm: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalField: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  modalLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.xs,
  },
  modalFieldInput: {
    fontSize: FONT_SIZE.base,
    padding: 0,
  },
  modalFieldMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    paddingVertical: 0,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  listContent: {
    paddingBottom: 85,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  countText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  communityIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityImage: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
  },
  communityInfo: {
    flex: 1,
    gap: 4,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  communityName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 2,
  },
  officialText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
  },
  communityDescription: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberCount: {
    fontSize: FONT_SIZE.xs,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
    minWidth: scale(80),
  },
  joinButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
});

export default CommunitiesManagementScreen;
