import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { storage, auth } from '../lib/firebase';

/**
 * Upload image to Firebase Storage
 * @param file - Image file to upload
 * @param folder - Folder name (e.g., 'housing', 'marketplace')
 * @returns Download URL of uploaded image
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Must be signed in to upload images');
  }

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }

  try {
    // Create unique filename
    const timestamp = Date.now();
    const filename = `${auth.currentUser.uid}_${timestamp}_${file.name}`;
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${filename}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload multiple images to Firebase Storage
 * @param files - Array of image files
 * @param folder - Folder name (e.g., 'housing', 'marketplace')
 * @returns Array of download URLs
 */
export async function uploadMultipleImages(files: File[], folder: string): Promise<string[]> {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Multiple image upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Firebase Storage
 * @param imageURL - Download URL of the image
 */
export async function deleteImage(imageURL: string): Promise<void> {
  try {
    // Extract path from URL
    const pathStart = imageURL.indexOf('/o/') + 3;
    const pathEnd = imageURL.indexOf('?');
    const path = decodeURIComponent(imageURL.substring(pathStart, pathEnd));
    
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Image deletion error:', error);
    throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
