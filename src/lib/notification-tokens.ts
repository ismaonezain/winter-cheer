/**
 * Notification Token Management
 * Handles storing and retrieving notification tokens for users who have enabled notifications
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface NotificationToken {
  id?: number;
  fid: number;
  username?: string;
  token: string;
  notification_url: string;
  is_active: boolean;
  added_at?: string;
  updated_at?: string;
}

/**
 * Save or update a notification token for a user
 */
export async function saveNotificationToken(data: {
  fid: number;
  username?: string;
  token: string;
  notificationUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, skipping token save');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('notification_tokens')
      .upsert(
        {
          fid: data.fid,
          username: data.username,
          token: data.token,
          notification_url: data.notificationUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'fid',
        }
      );

    if (error) {
      console.error('Error saving notification token:', error);
      return { success: false, error: error.message };
    }

    console.log(`[NotificationTokens] Saved token for FID ${data.fid}`);
    return { success: true };
  } catch (error) {
    console.error('Exception saving notification token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Deactivate notification token for a user
 */
export async function deactivateNotificationToken(
  fid: number
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, skipping token deactivation');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('notification_tokens')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('fid', fid);

    if (error) {
      console.error('Error deactivating notification token:', error);
      return { success: false, error: error.message };
    }

    console.log(`[NotificationTokens] Deactivated token for FID ${fid}`);
    return { success: true };
  } catch (error) {
    console.error('Exception deactivating notification token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all active notification tokens
 */
export async function getActiveNotificationTokens(): Promise<{
  success: boolean;
  tokens?: NotificationToken[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, returning empty token list');
    return { success: false, tokens: [], error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('is_active', true)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching notification tokens:', error);
      return { success: false, error: error.message };
    }

    console.log(`[NotificationTokens] Found ${data?.length || 0} active tokens`);
    return { success: true, tokens: data || [] };
  } catch (error) {
    console.error('Exception fetching notification tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get notification token for a specific user
 */
export async function getNotificationTokenByFid(fid: number): Promise<{
  success: boolean;
  token?: NotificationToken;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('fid', fid)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return { success: true, token: undefined };
      }
      console.error('Error fetching notification token:', error);
      return { success: false, error: error.message };
    }

    return { success: true, token: data };
  } catch (error) {
    console.error('Exception fetching notification token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get count of active notification tokens
 */
export async function getActiveTokenCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, count: 0, error: 'Supabase not configured' };
  }

  try {
    const { count, error } = await supabase
      .from('notification_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      console.error('Error counting notification tokens:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Exception counting notification tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
