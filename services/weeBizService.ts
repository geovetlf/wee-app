import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Business {
  id?: string;
  ownerId: string;
  name: string;
  description: string;
  categoryId: string;
  subcategory: string; // libre, escrita por el usuario
  logo?: string;
  coverImage?: string;
  location?: string;
  externalLink?: string;
  auraScore: number;
  reviewCount: number;
  followersCount: number;
  verified: boolean;
  featured: boolean;
  status: 'active' | 'pending' | 'suspended';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const BUSINESSES_COL = 'businesses';
const PAGE_SIZE = 20;

// --- Queries ---

export const getBusinessesByCategory = async (
  categoryId: string,
  lastDoc?: DocumentSnapshot | null,
): Promise<{ businesses: Business[]; lastVisible: DocumentSnapshot | null }> => {
  const constraints: any[] = [
    where('categoryId', '==', categoryId),
    where('status', '==', 'active'),
    orderBy('auraScore', 'desc'),
    limit(PAGE_SIZE),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const q = query(collection(db, BUSINESSES_COL), ...constraints);
  const snap = await getDocs(q);
  const businesses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { businesses, lastVisible };
};

export const getFeaturedBusinesses = async (
  limitCount = 10,
): Promise<Business[]> => {
  const q = query(
    collection(db, BUSINESSES_COL),
    where('status', '==', 'active'),
    where('featured', '==', true),
    orderBy('auraScore', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
};

export const getRecentBusinesses = async (
  limitCount = 10,
): Promise<Business[]> => {
  const q = query(
    collection(db, BUSINESSES_COL),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
};

export const searchBusinesses = async (
  searchText: string,
  limitCount = 20,
): Promise<Business[]> => {
  // Firestore no soporta full-text search nativo, usamos prefijo en name
  const lower = searchText.toLowerCase();
  const q = query(
    collection(db, BUSINESSES_COL),
    where('status', '==', 'active'),
    where('nameLower', '>=', lower),
    where('nameLower', '<=', lower + '\uf8ff'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
};

export const getBusinessById = async (id: string): Promise<Business | null> => {
  const snap = await getDoc(doc(db, BUSINESSES_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Business;
};

export const getBusinessByOwner = async (ownerId: string): Promise<Business | null> => {
  const q = query(
    collection(db, BUSINESSES_COL),
    where('ownerId', '==', ownerId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Business;
};

// --- Realtime ---

export const subscribeToBusiness = (
  businessId: string,
  callback: (biz: Business | null) => void,
) => {
  return onSnapshot(doc(db, BUSINESSES_COL, businessId), (snap) => {
    if (!snap.exists()) return callback(null);
    callback({ id: snap.id, ...snap.data() } as Business);
  });
};

// --- Write ---

export const createBusiness = async (
  data: Omit<Business, 'id' | 'auraScore' | 'reviewCount' | 'followersCount' | 'verified' | 'featured' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, BUSINESSES_COL), {
    ...data,
    nameLower: data.name.toLowerCase(),
    auraScore: 0,
    reviewCount: 0,
    followersCount: 0,
    verified: false,
    featured: false,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateBusiness = async (
  id: string,
  data: Partial<Pick<Business, 'name' | 'description' | 'subcategory' | 'categoryId' | 'logo' | 'coverImage' | 'location' | 'externalLink'>>,
): Promise<void> => {
  const update: any = { ...data, updatedAt: Timestamp.now() };
  if (data.name) update.nameLower = data.name.toLowerCase();
  await updateDoc(doc(db, BUSINESSES_COL, id), update);
};

// --- Products ---

export interface Product {
  id?: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  available: boolean;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const productsCol = (businessId: string) =>
  collection(db, BUSINESSES_COL, businessId, 'products');

export const getProducts = async (businessId: string): Promise<Product[]> => {
  const q = query(productsCol(businessId), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
};

export const getProductById = async (businessId: string, productId: string): Promise<Product | null> => {
  const snap = await getDoc(doc(db, BUSINESSES_COL, businessId, 'products', productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
};

export const createProduct = async (
  businessId: string,
  data: Omit<Product, 'id' | 'businessId' | 'available' | 'createdAt' | 'updatedAt'>,
): Promise<string> => {
  const now = Timestamp.now();
  const docRef = await addDoc(productsCol(businessId), {
    ...data,
    businessId,
    available: true,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateProduct = async (
  businessId: string,
  productId: string,
  data: Partial<Pick<Product, 'name' | 'description' | 'price' | 'currency' | 'images' | 'available' | 'order'>>,
): Promise<void> => {
  await updateDoc(doc(db, BUSINESSES_COL, businessId, 'products', productId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteProduct = async (businessId: string, productId: string): Promise<void> => {
  await deleteDoc(doc(db, BUSINESSES_COL, businessId, 'products', productId));
};

// --- Reviews ---

export interface Review {
  id?: string;
  businessId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  text: string;
  createdAt: Timestamp;
}

const reviewsCol = (businessId: string) =>
  collection(db, BUSINESSES_COL, businessId, 'reviews');

export const getReviews = async (businessId: string, limitCount = 50): Promise<Review[]> => {
  const q = query(reviewsCol(businessId), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
};

export const getUserReview = async (businessId: string, userId: string): Promise<Review | null> => {
  const q = query(reviewsCol(businessId), where('userId', '==', userId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Review;
};

/*
 * UNA RESEÑA POR PERSONA (cierre post-auditoría 2026-10-01, trust/resena-por-persona). La reseña vive en
 * `reviews/{uid}`, con el id de la cuenta que la escribe, y las reglas lo exigen a las nuevas. Así una segunda
 * reseña de la misma persona no se suma a la media: ACTUALIZA la suya. Las antiguas, con id automático, se
 * siguen leyendo y siguen contando en el recálculo.
 */
export const createReview = async (
  businessId: string,
  data: Omit<Review, 'id' | 'businessId' | 'createdAt'>,
): Promise<string> => {
  const reviewRef = doc(reviewsCol(businessId), data.userId);
  await setDoc(reviewRef, {
    ...data,
    businessId,
    createdAt: Timestamp.now(),
  });
  // Recalculate aura score
  await recalculateAura(businessId);
  return reviewRef.id;
};

export const deleteReview = async (businessId: string, reviewId: string): Promise<void> => {
  await deleteDoc(doc(db, BUSINESSES_COL, businessId, 'reviews', reviewId));
  await recalculateAura(businessId);
};

const recalculateAura = async (businessId: string): Promise<void> => {
  const allReviews = await getReviews(businessId, 1000);
  const count = allReviews.length;
  if (count === 0) {
    await updateDoc(doc(db, BUSINESSES_COL, businessId), { auraScore: 0, reviewCount: 0 });
    return;
  }
  const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = parseFloat((sum / count).toFixed(2));
  await updateDoc(doc(db, BUSINESSES_COL, businessId), { auraScore: avg, reviewCount: count });
};

export const weeBizService = {
  getBusinessesByCategory,
  getFeaturedBusinesses,
  getRecentBusinesses,
  searchBusinesses,
  getBusinessById,
  getBusinessByOwner,
  subscribeToBusiness,
  createBusiness,
  updateBusiness,
  // Products
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  // Reviews
  getReviews,
  getUserReview,
  createReview,
  deleteReview,
};
