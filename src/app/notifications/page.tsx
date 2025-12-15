/**
 * Notifications Admin Page
 * Page for sending notifications to Farcaster users
 * ONLY ACCESSIBLE BY FID 235940
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sdk } from '@farcaster/miniapp-sdk';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { NotificationSender } from '@/components/NotificationSender';

interface AuthState {
  isAuthorized: boolean;
  isLoading: boolean;
  currentFid: number | null;
}

const ADMIN_FID = 235940; // Only this FID can access

export default function NotificationsPage() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthorized: false,
    isLoading: true,
    currentFid: null,
  });

  // Check admin access on mount
  useEffect(() => {
    async function checkAdminAccess() {
      try {
        const context = await sdk.context;
        const userFid = context?.user?.fid;

        if (!userFid) {
          setAuth({
            isAuthorized: false,
            isLoading: false,
            currentFid: null,
          });
          return;
        }

        const isAdmin = userFid === ADMIN_FID;
        setAuth({
          isAuthorized: isAdmin,
          isLoading: false,
          currentFid: userFid,
        });
      } catch (error) {
        console.error('Admin auth error:', error);
        setAuth({
          isAuthorized: false,
          isLoading: false,
          currentFid: null,
        });
      }
    }

    checkAdminAccess();
  }, []);

  // Show loading state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authorized
  if (!auth.isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 via-red-800 to-white flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm p-12 rounded-3xl border-4 border-red-500 shadow-2xl text-center">
            <ShieldAlert className="w-24 h-24 text-red-600 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-red-700 mb-4">
              🚫 Access Denied
            </h1>
            <p className="text-xl text-gray-800 mb-6">
              You do not have permission to access the notification center.
            </p>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8">
              <p className="text-lg font-semibold text-red-800 mb-2">
                Admin Access Required
              </p>
              <p className="text-gray-700">
                This area is restricted to authorized administrators only.
                {auth.currentFid && (
                  <span className="block mt-2 text-sm text-gray-600">
                    Your FID: <span className="font-mono font-bold">{auth.currentFid}</span>
                  </span>
                )}
              </p>
            </div>
            <Link href="/">
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all">
                ← Back to Main App
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show notifications page if authorized
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Admin Authorization Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold inline-block">
            ✅ Authorized Admin (FID: {auth.currentFid})
          </div>
          <Link href="/admin">
            <button className="bg-white/90 hover:bg-white text-purple-700 font-bold py-2 px-6 rounded-full border-2 border-purple-300 hover:border-purple-400 transition-all shadow-lg">
              ← Admin Dashboard
            </button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 sparkle-text">
            Notification Center 🔔
          </h1>
          <p className="text-xl text-white/80">
            Send updates and announcements to your Winter Cheer community
          </p>
        </div>

        <NotificationSender />
      </div>
    </div>
  );
}
