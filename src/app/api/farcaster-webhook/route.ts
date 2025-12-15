/**
 * Farcaster Webhook Handler
 * Receives and VERIFIES notifications from Farcaster when users interact with the mini app
 * Tracks notification tokens for push notifications
 * 
 * Security: All events are verified with JSON Farcaster Signature per spec
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
  type ParseWebhookEvent,
} from '@farcaster/miniapp-node';
import {
  saveNotificationToken,
  deactivateNotificationToken,
} from '@/lib/notification-tokens';

export const runtime = 'edge';

interface FarcasterNotificationDetails {
  url: string;
  token: string;
}

interface FarcasterWebhookPayload {
  event: string;
  notificationDetails?: FarcasterNotificationDetails;
  fid?: number;
  // Additional fields for various event types
  [key: string]: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse raw request body
    const requestBody = await request.text();
    let requestJson: FarcasterWebhookPayload;
    
    try {
      requestJson = JSON.parse(requestBody);
    } catch (e) {
      console.error('[Webhook] Invalid JSON:', e);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.log('========================================');
    console.log('Farcaster webhook received:', {
      event: requestJson.event,
      hasNotificationDetails: Boolean(requestJson.notificationDetails),
      timestamp: new Date().toISOString(),
    });
    console.log('Full payload:', JSON.stringify(requestJson, null, 2));

    // CRITICAL: Verify webhook signature per Farcaster spec
    // This ensures the event is from a legitimate Farcaster client
    let verifiedData: FarcasterWebhookPayload;
    
    try {
      // Check if NEYNAR_API_KEY is set
      if (!process.env.NEYNAR_API_KEY) {
        console.warn(
          '[Webhook] NEYNAR_API_KEY not set - skipping signature verification. ' +
          'This is INSECURE for production! Set NEYNAR_API_KEY environment variable.'
        );
        verifiedData = requestJson;
      } else {
        // Verify signature using Neynar
        verifiedData = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
        console.log('[Webhook] Signature verified successfully');
      }
    } catch (e: unknown) {
      const error = e as ParseWebhookEvent.ErrorType;

      switch (error.name) {
        case 'VerifyJsonFarcasterSignature.InvalidDataError':
        case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
          console.error('[Webhook] Invalid request data:', error.message);
          return NextResponse.json(
            { success: false, error: 'Invalid request data' },
            { status: 400 }
          );

        case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
          console.error('[Webhook] Invalid app key:', error.message);
          return NextResponse.json(
            { success: false, error: 'Invalid app key' },
            { status: 401 }
          );

        case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
          console.error('[Webhook] Error verifying app key:', error.message);
          return NextResponse.json(
            { success: false, error: 'Verification error' },
            { status: 500 }
          );

        default:
          console.error('[Webhook] Unknown verification error:', error);
          return NextResponse.json(
            { success: false, error: 'Verification failed' },
            { status: 500 }
          );
      }
    }

    // Extract FID from verified payload
    const fid = extractFidFromPayload(verifiedData);
    
    console.log('[Webhook] Extracted FID:', fid);
    
    if (!fid) {
      console.warn('[Webhook] ⚠️ No FID found in payload, cannot process event');
      console.log('[Webhook] Available payload keys:', Object.keys(verifiedData));
    }

    // Handle different webhook events
    switch (verifiedData.event) {
      case 'miniapp_added': {
        console.log(`[Webhook] 🎉 User FID ${fid} added the mini app`);
        console.log('[Webhook] Has notificationDetails?', Boolean(verifiedData.notificationDetails));
        console.log('[Webhook] Has FID?', Boolean(fid));
        
        // Save notification token if provided
        if (verifiedData.notificationDetails && fid) {
          const { url, token } = verifiedData.notificationDetails;
          console.log('[Webhook] Notification details:', { url: url.substring(0, 50) + '...', tokenLength: token.length });
          
          const result = await saveNotificationToken({
            fid,
            token,
            notificationUrl: url,
          });

          if (result.success) {
            console.log(`[Webhook] ✅ Notification token SAVED successfully for FID ${fid}`);
          } else {
            console.error(
              `[Webhook] ❌ Failed to save token for FID ${fid}:`,
              result.error
            );
          }
        } else {
          console.log('[Webhook] ⚠️ miniapp_added without notification details or FID');
          console.log('[Webhook] Possible reasons:');
          console.log('  - User disabled notifications');
          console.log('  - FID extraction failed');
          console.log('  - Notification details not in payload');
        }
        break;
      }

      case 'miniapp_removed': {
        console.log(`[Webhook] User FID ${fid} removed the mini app`);
        
        // Deactivate notification token
        if (fid) {
          const result = await deactivateNotificationToken(fid);
          if (result.success) {
            console.log(`[Webhook] ✅ Notification token deactivated for FID ${fid}`);
          } else {
            console.error(
              `[Webhook] ❌ Failed to deactivate token for FID ${fid}:`,
              result.error
            );
          }
        }
        break;
      }

      case 'notifications_enabled': {
        console.log(`[Webhook] User FID ${fid} enabled notifications`);
        
        // Save/update notification token
        if (verifiedData.notificationDetails && fid) {
          const { url, token } = verifiedData.notificationDetails;
          const result = await saveNotificationToken({
            fid,
            token,
            notificationUrl: url,
          });

          if (result.success) {
            console.log(`[Webhook] ✅ Notification token enabled for FID ${fid}`);
          } else {
            console.error(
              `[Webhook] ❌ Failed to enable token for FID ${fid}:`,
              result.error
            );
          }
        }
        break;
      }

      case 'notifications_disabled': {
        console.log(`[Webhook] User FID ${fid} disabled notifications`);
        
        // Deactivate notification token
        if (fid) {
          const result = await deactivateNotificationToken(fid);
          if (result.success) {
            console.log(`[Webhook] ✅ Notification token disabled for FID ${fid}`);
          } else {
            console.error(
              `[Webhook] ❌ Failed to disable token for FID ${fid}:`,
              result.error
            );
          }
        }
        break;
      }

      default: {
        console.log(`[Webhook] Unknown event type: ${verifiedData.event}`);
      }
    }

    return NextResponse.json({
      success: true,
      received: true,
      event: verifiedData.event,
      verified: Boolean(process.env.NEYNAR_API_KEY),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract FID from webhook payload
 * Farcaster may send FID in different locations depending on the event
 */
function extractFidFromPayload(payload: FarcasterWebhookPayload): number | null {
  // Direct FID property (most common)
  if (typeof payload.fid === 'number') {
    return payload.fid;
  }

  // Try user object
  if (typeof payload.user === 'object' && payload.user !== null) {
    const user = payload.user as Record<string, unknown>;
    if (typeof user.fid === 'number') {
      return user.fid;
    }
  }

  // Try data object
  if (typeof payload.data === 'object' && payload.data !== null) {
    const data = payload.data as Record<string, unknown>;
    if (typeof data.fid === 'number') {
      return data.fid;
    }
  }

  // Try untrustedData (common in frame responses)
  if (typeof payload.untrustedData === 'object' && payload.untrustedData !== null) {
    const untrustedData = payload.untrustedData as Record<string, unknown>;
    if (typeof untrustedData.fid === 'number') {
      return untrustedData.fid;
    }
  }

  console.warn('[Webhook] Could not extract FID from payload. Keys:', Object.keys(payload));
  return null;
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  const hasNeynarKey = Boolean(process.env.NEYNAR_API_KEY);
  
  return NextResponse.json({
    status: 'healthy',
    service: 'farcaster-webhook',
    timestamp: Date.now(),
    security: {
      signatureVerification: hasNeynarKey ? 'enabled' : 'DISABLED - Set NEYNAR_API_KEY',
      neynarApiKey: hasNeynarKey ? 'configured' : 'missing',
    },
    events_supported: [
      'miniapp_added',
      'miniapp_removed',
      'notifications_enabled',
      'notifications_disabled',
    ],
    spec: 'https://docs.farcaster.xyz/developers/frames/v2/spec#receiving-webhooks',
  });
}
