import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface MarketListing {
  id: string;
  title: string;
  category: 'Furniture' | 'Electronics' | 'Books' | 'Essentials' | 'Other';
  price: number;
  isNegotiable?: boolean;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  reasonForSelling?: string;
  photos: string[];
  postedBy: string;
  status: 'available' | 'reserved' | 'sold';
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  description?: string;
  createdAt: any;
}

const COLLECTION_NAME = 'marketplace_listings';

export async function getMarketListings(category?: string) {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    if (category && category !== 'All') {
      q = query(q, where('category', '==', category));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MarketListing[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function createMarketListing(listing: Omit<MarketListing, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...listing,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
}
