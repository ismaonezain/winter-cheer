/**
 * Send Farcaster Notification API
 * Supports both targeted (specific FIDs) and broadcast (all active users) notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActiveNotificationTokens } from '@/lib/notification-tokens';

interface SendNotificationRequest {
  fids?: number[]; // Specific FIDs (optional)
  broadcast?: boolean; // Send to all active users
  notificationId: string; // Idempotency key
  title: string;
  body: string;
  targetUrl: string; // Required: must be on same domain as miniapp
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendNotificationRequest;
    const {
      fids,
      broadcast = false,
      notificationId,
      title,
      body: messageBody,
      targetUrl,
    } = body;

    // Validation
    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      );
    }

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'notificationId is required for idempotency',
        },
        { status: 400 }
      );
    }

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'targetUrl is required' },
        { status: 400 }
      );
    }

    if (title.length > 32) {
      return NextResponse.json(
        { success: false, error: 'Title must be max 32 characters' },
        { status: 400 }
      );
    }

    if (messageBody.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Body must be max 128 characters' },
        { status: 400 }
      );
    }

    if (targetUrl.length > 1024) {
      return NextResponse.json(
        { success: false, error: 'targetUrl must be max 1024 characters' },
        { status: 400 }
      );
    }

    // Determine recipients
    let tokensToSend: Array<{ token: string; notificationUrl: string }> = [];

    if (broadcast) {
      // Broadcast to all active users
      console.log('[Notification] Broadcasting to all active users');
      const result = await getActiveNotificationTokens();

      if (!result.success || !result.tokens) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to fetch active tokens',
          },
          { status: 500 }
        );
      }

      tokensToSend = result.tokens.map((t) => ({
        token: t.token,
        notificationUrl: t.notification_url,
      }));

      console.log(`[Notification] Found ${tokensToSend.length} active tokens`);
    } else if (fids && fids.length > 0) {
      // Send to specific FIDs - fetch tokens for each FID
      console.log(`[Notification] Sending to ${fids.length} specific FIDs`);
      const { getNotificationTokenByFid } = await import('@/lib/notification-tokens');
      
      const tokenPromises = fids.map(async (fid) => {
        const result = await getNotificationTokenByFid(fid);
        if (result.success && result.token) {
          return {
            token: result.token.token,
            notificationUrl: result.token.notification_url,
          };
        }
        return null;
      });
      
      const tokenResults = await Promise.all(tokenPromises);
      tokensToSend = tokenResults.filter((t): t is { token: string; notificationUrl: string } => t !== null);
      
      console.log(`[Notification] Found ${tokensToSend.length}/${fids.length} active tokens for specified FIDs`);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either broadcast must be true or fids array must be provided',
        },
        { status: 400 }
      );
    }

    if (tokensToSend.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No active notification tokens found',
      });
    }

    // Batch tokens (max 100 per request per Farcaster spec)
    const batchSize = 100;
    const batches: Array<typeof tokensToSend> = [];
    for (let i = 0; i < tokensToSend.length; i += batchSize) {
      batches.push(tokensToSend.slice(i, i + batchSize));
    }

    // Send notifications in batches
    const results = await Promise.allSettled(
      batches.map(async (batch) => {
        // Group tokens by notification URL
        const urlGroups = new Map<
          string,
          Array<{ token: string; notificationUrl: string }>
        >();

        for (const item of batch) {
          const existing = urlGroups.get(item.notificationUrl) || [];
          existing.push(item);
          urlGroups.set(item.notificationUrl, existing);
        }

        // Send to each notification URL
        const urlResults = await Promise.allSettled(
          Array.from(urlGroups.entries()).map(async ([notificationUrl, items]) => {
            const tokens = items.map((item) => item.token);

            const payload = {
              notificationId,
              title,
              body: messageBody,
              targetUrl,
              tokens,
            };

            console.log(`[Notification] Sending to ${tokens.length} tokens at ${notificationUrl}`);

            const response = await fetch(notificationUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `Failed to send notification batch: ${response.status} ${errorText}`
              );
            }

            const responseData = await response.json();
            return {
              successfulTokens: responseData.successfulTokens || [],
              invalidTokens: responseData.invalidTokens || [],
              rateLimitedTokens: responseData.rateLimitedTokens || [],
            };
          })
        );

        // Aggregate results
        let successfulCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const result of urlResults) {
          if (result.status === 'fulfilled') {
            successfulCount += result.value.successfulTokens.length;
            failedCount +=
              result.value.invalidTokens.length +
              result.value.rateLimitedTokens.length;
          } else {
            failedCount += batch.length;
            errors.push(result.reason.message);
          }
        }

        return { successfulCount, failedCount, errors };
      })
    );

    // Aggregate all results
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalSuccessful += result.value.successfulCount;
        totalFailed += result.value.failedCount;
        allErrors.push(...result.value.errors);
      } else {
        totalFailed += batchSize;
        allErrors.push(result.reason.message);
      }
    }

    console.log(
      `[Notification] Sent to ${totalSuccessful}/${tokensToSend.length} users`
    );
    if (totalFailed > 0) {
      console.error(`[Notification] Failed to send to ${totalFailed} users`);
    }

    return NextResponse.json({
      success: true,
      sent: totalSuccessful,
      failed: totalFailed,
      totalRecipients: tokensToSend.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error('[Notification] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check and stats
export async function GET() {
  try {
    const result = await getActiveNotificationTokens();

    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/send-notification',
      description: 'Send notifications to Farcaster users',
      activeTokens: result.success ? result.tokens?.length || 0 : 'unknown',
      features: {
        broadcast: 'Send to all active users',
        idempotency: 'Deduplicated by notificationId',
        batching: 'Automatic batching of 100 tokens per request',
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/send-notification',
      activeTokens: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
