import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export interface SavedListing {
  id?: string;
  userId: string;
  listingId: string;
  listingType: 'housing' | 'market';
  createdAt: any;
}

export const saveListing = async (listingId: string, listingType: 'housing' | 'market') => {
  if (!auth.currentUser) throw new Error('Must be signed in');
  
  const path = 'saved_listings';
  try {
    const savedRef = collection(db, path);
    await addDoc(savedRef, {
      userId: auth.currentUser.uid,
      listingId,
      listingType,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const unsaveListing = async (savedId: string) => {
  const path = `saved_listings/${savedId}`;
  try {
    const savedDoc = doc(db, 'saved_listings', savedId);
    await deleteDoc(savedDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getSavedListings = async () => {
  if (!auth.currentUser) return [];
  
  const path = 'saved_listings';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedListing));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const checkIsSaved = async (listingId: string) => {
  if (!auth.currentUser) return { saved: false, saveId: null };
  
  const path = 'saved_listings';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      where('listingId', '==', listingId)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { saved: false, saveId: null };
    return { saved: true, saveId: snapshot.docs[0].id };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return { saved: false, saveId: null };
  }
};
