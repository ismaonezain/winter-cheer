/**
 * Notification Sender Component
 * Admin UI for sending notifications to Farcaster users
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bell, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type NotificationStatus = 'idle' | 'sending' | 'success' | 'error';

export function NotificationSender() {
  const [fids, setFids] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  
  const [status, setStatus] = useState<NotificationStatus>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number; errors?: string[] } | null>(null);

  const handleSend = async () => {
    try {
      setStatus('sending');
      setResult(null);

      // Parse FIDs (comma or newline separated)
      const fidArray = fids
        .split(/[,\n]/)
        .map((fid) => fid.trim())
        .filter((fid) => fid.length > 0)
        .map((fid) => parseInt(fid, 10))
        .filter((fid) => !isNaN(fid));

      if (fidArray.length === 0) {
        throw new Error('Please enter at least one valid FID');
      }

      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fids: fidArray,
          title,
          body,
          targetUrl: targetUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send notifications');
      }

      setResult({
        sent: data.sent,
        failed: data.failed,
        errors: data.errors,
      });
      setStatus('success');

      // Clear form on success
      if (data.failed === 0) {
        setFids('');
        setTitle('');
        setBody('');
        setTargetUrl('');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      setStatus('error');
      setResult({
        sent: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  };

  const isFormValid = fids.trim().length > 0 && title.trim().length > 0 && body.trim().length > 0;

  return (
    <Card className="nft-card max-w-3xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8" />
          <div>
            <CardTitle className="text-2xl">Send Farcaster Notifications 🔔</CardTitle>
            <CardDescription className="text-white/90 text-base mt-1">
              Broadcast messages to Winter Cheer NFT holders
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* FIDs Input */}
        <div className="space-y-2">
          <Label htmlFor="fids" className="text-lg font-bold text-gray-800">
            Recipient FIDs
          </Label>
          <Textarea
            id="fids"
            placeholder="Enter Farcaster IDs (comma or newline separated)&#10;Example: 235940, 123456, 789012"
            value={fids}
            onChange={(e) => setFids(e.target.value)}
            className="h-24 font-mono text-sm"
          />
          <p className="text-sm text-gray-500">
            {fids.split(/[,\n]/).filter((f) => f.trim().length > 0).length} FIDs entered
          </p>
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-lg font-bold text-gray-800">
            Notification Title
          </Label>
          <Input
            id="title"
            placeholder="e.g., New Winter Cheer NFT Drop! 🎄"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            className="text-base"
          />
          <p className="text-sm text-gray-500">{title.length}/50 characters</p>
        </div>

        {/* Body Input */}
        <div className="space-y-2">
          <Label htmlFor="body" className="text-lg font-bold text-gray-800">
            Notification Body
          </Label>
          <Textarea
            id="body"
            placeholder="Enter notification message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={200}
            className="h-32"
          />
          <p className="text-sm text-gray-500">{body.length}/200 characters</p>
        </div>

        {/* Target URL Input (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="targetUrl" className="text-lg font-bold text-gray-800">
            Target URL (Optional)
          </Label>
          <Input
            id="targetUrl"
            placeholder="https://table-only-559.app.ohara.ai"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="text-base font-mono text-sm"
          />
          <p className="text-sm text-gray-500">URL to open when notification is clicked</p>
        </div>

        {/* Result Display */}
        {result && (
          <div
            className={`p-4 rounded-xl border-2 ${
              status === 'success'
                ? 'bg-green-100 border-green-300'
                : 'bg-red-100 border-red-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {status === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-bold text-lg mb-2">
                  {status === 'success' ? '✅ Notifications Sent!' : '⚠️ Some Notifications Failed'}
                </p>
                <div className="flex gap-3">
                  <Badge className="bg-green-500 text-white">✓ Sent: {result.sent}</Badge>
                  {result.failed > 0 && (
                    <Badge className="bg-red-500 text-white">✗ Failed: {result.failed}</Badge>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3 text-sm text-red-700">
                    <p className="font-semibold mb-1">Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!isFormValid || status === 'sending'}
          className="w-full h-14 text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              Sending Notifications...
            </>
          ) : (
            <>
              <Send className="w-6 h-6 mr-3" />
              Send Notifications
            </>
          )}
        </Button>

        {/* Tips */}
        <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-bold">💡 Tip:</span> You can send notifications to users who have
            minted NFTs, added your Mini App, or interacted with your app. Make sure you have a
            Farcaster API key configured in your environment variables.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
