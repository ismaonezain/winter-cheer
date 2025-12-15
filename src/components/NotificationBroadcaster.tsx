/**
 * Notification Broadcaster Component
 * Sends notifications to all users who have added the Winter Cheer NFT miniapp
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface BroadcastResult {
  success: boolean;
  sent: number;
  failed: number;
  totalRecipients: number;
  errors?: string[];
}

export function NotificationBroadcaster() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUrl, setTargetUrl] = useState('https://table-only-559.app.ohara.ai');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBroadcast = async () => {
    // Validation
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }

    if (title.length > 32) {
      setError('Title must be max 32 characters');
      return;
    }

    if (body.length > 128) {
      setError('Body must be max 128 characters');
      return;
    }

    setError(null);
    setResult(null);
    setIsSending(true);

    try {
      // Generate unique notification ID (idempotency key)
      const notificationId = `broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcast: true, // Broadcast to all active users
          notificationId,
          title: title.trim(),
          body: body.trim(),
          targetUrl: targetUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send broadcast notification');
      }

      setResult(data as BroadcastResult);
      
      // Clear form on success
      if (data.sent > 0) {
        setTitle('');
        setBody('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast notification');
      console.error('[Broadcast] Error:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl border-4 border-red-200 shadow-xl bg-gradient-to-br from-white to-red-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-green-500 rounded-full">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              🎄 Broadcast Notification
            </CardTitle>
            <CardDescription className="text-gray-600">
              Send notifications to all users who added Winter Cheer NFT
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-bold text-gray-700 uppercase">
            Title (Max 32 chars)
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="🎁 New Feature Available!"
            maxLength={32}
            className="border-2 border-gray-300 focus:border-red-500 rounded-lg"
            disabled={isSending}
          />
          <p className="text-xs text-gray-500">{title.length}/32 characters</p>
        </div>

        {/* Body Input */}
        <div className="space-y-2">
          <Label htmlFor="body" className="text-sm font-bold text-gray-700 uppercase">
            Message (Max 128 chars)
          </Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Check out the latest Christmas NFT collection! Mint now and spread holiday cheer!"
            maxLength={128}
            rows={3}
            className="border-2 border-gray-300 focus:border-red-500 rounded-lg resize-none"
            disabled={isSending}
          />
          <p className="text-xs text-gray-500">{body.length}/128 characters</p>
        </div>

        {/* Target URL Input */}
        <div className="space-y-2">
          <Label htmlFor="targetUrl" className="text-sm font-bold text-gray-700 uppercase">
            Target URL
          </Label>
          <Input
            id="targetUrl"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://table-only-559.app.ohara.ai"
            className="border-2 border-gray-300 focus:border-red-500 rounded-lg"
            disabled={isSending}
          />
          <p className="text-xs text-gray-500">
            URL to open when notification is clicked
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Result */}
        {result && result.success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Successfully sent to {result.sent} users!</strong>
              {result.totalRecipients > 0 && (
                <p className="text-sm mt-1">
                  Total recipients: {result.totalRecipients} | Failed: {result.failed}
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer">View errors</summary>
                  <ul className="mt-1 list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Send Button */}
        <Button
          onClick={handleBroadcast}
          disabled={isSending || !title.trim() || !body.trim()}
          className="w-full bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Broadcasting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Send Broadcast Notification
            </>
          )}
        </Button>

        <p className="text-xs text-center text-gray-500">
          This will send a notification to all users who have added the Winter Cheer NFT app
          and enabled notifications
        </p>
      </CardContent>
    </Card>
  );
}
