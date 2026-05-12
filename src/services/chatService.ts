import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  serverTimestamp, 
  orderBy, 
  onSnapshot, 
  updateDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export interface Conversation {
  id: string;
  participants: string[];
  listingId: string;
  listingTitle: string;
  listingType: string;
  listingPhoto?: string;
  listingPrice?: number;
  listingStatus?: string;
  listingLocation?: string;
  lastMessage?: string;
  updatedAt: any;
  unreadCount?: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: any;
}

export const startConversation = async (
  ownerId: string, 
  listingId: string, 
  listingTitle: string, 
  listingType: string,
  listingMetadata?: Pick<
    Conversation,
    "listingPhoto" | "listingPrice" | "listingStatus" | "listingLocation"
  >
) => {
  if (!auth.currentUser) throw new Error('Must be signed in');
  if (auth.currentUser.uid === ownerId) throw new Error('Cannot start chat with yourself');

  const path = 'conversations';
  try {
    // Check if conversation already exists
    const q = query(
      collection(db, path),
      where('participants', 'array-contains', auth.currentUser.uid),
      where('listingId', '==', listingId)
    );
    
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(doc => doc.data().participants.includes(ownerId));
    
    if (existing) return existing.id;

    // Create new conversation
    const convRef = collection(db, path);
    const docRef = await addDoc(convRef, {
      participants: [auth.currentUser.uid, ownerId],
      listingId,
      listingTitle,
      listingType,
      ...listingMetadata,
      updatedAt: serverTimestamp(),
      lastMessage: 'Chat started'
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const sendMessage = async (conversationId: string, content: string) => {
  if (!auth.currentUser) throw new Error('Must be signed in');

  const path = `conversations/${conversationId}/messages`;
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    await addDoc(messagesRef, {
      senderId: auth.currentUser.uid,
      content,
      createdAt: serverTimestamp()
    });

    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: content,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToConversations = (callback: (conversations: Conversation[]) => void) => {
  if (!auth.currentUser) return () => {};

  const path = 'conversations';
  const q = query(
    collection(db, path),
    where('participants', 'array-contains', auth.currentUser.uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const subscribeToMessages = (conversationId: string, callback: (messages: Message[]) => void) => {
  const path = `conversations/${conversationId}/messages`;
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, 
    (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};
