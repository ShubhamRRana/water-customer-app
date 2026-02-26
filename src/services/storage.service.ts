/**
 * Storage Service
 * 
 * Handles file uploads to Supabase Storage, specifically for QR code images.
 * Uses Supabase Storage buckets for file management.
 */

import { supabase } from '../lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { handleAsyncOperationWithRethrow, handleError } from '../utils/errorHandler';

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageService {
  /**
   * Request permissions for image picker
   */
  static async requestImagePickerPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        return cameraStatus.status === 'granted';
      }
      return true;
    } catch (error) {
      handleError(error, {
        context: { operation: 'requestImagePickerPermissions' },
        userFacing: false,
      });
      return false;
    }
  }

  /**
   * Pick an image from the device (gallery or camera)
   * @param aspectRatio - Optional aspect ratio [width, height]. Defaults to [1, 1] for square images
   */
  static async pickImage(aspectRatio?: [number, number]): Promise<string | null> {
    try {
      const hasPermission = await this.requestImagePickerPermissions();
      if (!hasPermission) {
        throw new Error('Permission to access camera roll or camera is required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: aspectRatio || [1, 1], // Default to square for QR codes, can be overridden for receipts
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      handleError(error, {
        context: { operation: 'pickImage' },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Upload QR code image to Supabase Storage
   * @param imageUri - Local URI of the image to upload
   * @param adminId - ID of the admin user (for organizing files)
   * @param accountId - Optional account ID (for updates, to replace existing file)
   * @returns Public URL of the uploaded image
   */
  static async uploadQRCodeImage(
    imageUri: string,
    adminId: string,
    accountId?: string
  ): Promise<UploadResult> {
    try {
      // Generate unique file name
      const timestamp = Date.now();
      const fileName = accountId 
        ? `qr-code-${accountId}-${timestamp}.jpg`
        : `qr-code-${adminId}-${timestamp}.jpg`;
      const filePath = `qr-codes/${adminId}/${fileName}`;

      // Read file as ArrayBuffer using fetch (as per Supabase React Native example)
      // This is the recommended approach from Supabase documentation
      const arrayBuffer = await fetch(imageUri).then((res) => res.arrayBuffer());

      // Upload to Supabase Storage
      // Supabase accepts ArrayBuffer directly in React Native
      const { data, error } = await supabase.storage
        .from('bank-qr-codes')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true, // Replace if exists
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bank-qr-codes')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'uploadQRCodeImage', adminId, accountId },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Delete QR code image from Supabase Storage
   * @param filePath - Path of the file to delete
   */
  static async deleteQRCodeImage(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('bank-qr-codes')
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'deleteQRCodeImage', filePath },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Upload expense receipt image to Supabase Storage
   * @param imageUri - Local URI of the image to upload
   * @param adminId - ID of the admin user (for organizing files)
   * @param expenseId - Optional expense ID (for updates, to replace existing file)
   * @returns Public URL of the uploaded image
   */
  static async uploadExpenseReceiptImage(
    imageUri: string,
    adminId: string,
    expenseId?: string
  ): Promise<UploadResult> {
    try {
      // Generate unique file name
      const timestamp = Date.now();
      const fileName = expenseId 
        ? `receipt-${expenseId}-${timestamp}.jpg`
        : `receipt-${adminId}-${timestamp}.jpg`;
      const filePath = `expense-receipts/${adminId}/${fileName}`;

      // Read file as ArrayBuffer using fetch (as per Supabase React Native example)
      const arrayBuffer = await fetch(imageUri).then((res) => res.arrayBuffer());

      // Upload to Supabase Storage
      // Using the same bucket as QR codes, but with a different path
      const { data, error } = await supabase.storage
        .from('bank-qr-codes')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true, // Replace if exists
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bank-qr-codes')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      handleError(error, {
        context: { operation: 'uploadExpenseReceiptImage', adminId, expenseId },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Delete expense receipt image from Supabase Storage
   * @param filePath - Path of the file to delete
   */
  static async deleteExpenseReceiptImage(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('bank-qr-codes')
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
      }
    } catch (error) {
      handleError(error, {
        context: { operation: 'deleteExpenseReceiptImage', filePath },
        userFacing: false,
      });
      throw error;
    }
  }

  /**
   * Extract file path from a Supabase Storage URL
   * @param url - Full public URL of the image
   * @returns File path relative to the bucket
   */
  static extractFilePathFromUrl(url: string): string | null {
    try {
      // Supabase Storage URLs typically look like:
      // https://[project].supabase.co/storage/v1/object/public/bank-qr-codes/qr-codes/[adminId]/[filename]
      // or
      // https://[project].supabase.co/storage/v1/object/public/bank-qr-codes/expense-receipts/[adminId]/[filename]
      const match = url.match(/\/bank-qr-codes\/(.+)$/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
}

