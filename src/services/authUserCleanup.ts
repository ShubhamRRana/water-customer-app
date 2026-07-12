import { supabase } from '../lib/supabaseClient';

/**
 * Removes the Auth user after app profile data has been deleted.
 * Invokes delete-auth-user-on-account-deletion (self-delete or admin-authorized).
 */
export async function deleteAuthUserAfterAccountDeletion(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-auth-user-on-account-deletion', {
    body: { user_id: userId },
  });
  if (error) {
    throw new Error(error.message || 'Failed to remove authentication user');
  }
}
