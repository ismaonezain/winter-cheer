/**
 * Winter Cheer NFT Admin Dashboard
 * Comprehensive admin interface for managing notifications, viewing stats, and withdrawing funds
 * ONLY ACCESSIBLE BY FID 235940
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sdk } from '@farcaster/miniapp-sdk';
import { ShieldAlert, Loader2, Wallet, ArrowDownToLine, DollarSign } from 'lucide-react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getActiveTokenCount } from '@/lib/notification-tokens';
import { WINTER_CHEER_CONTRACT_ADDRESS, WINTER_CHEER_ABI } from '@/lib/nft-contract';
import { base } from 'viem/chains';

interface Stats {
  activeUsers: number;
  loading: boolean;
  error: string | null;
}

interface AuthState {
  isAuthorized: boolean;
  isLoading: boolean;
  currentFid: number | null;
}

const ADMIN_FID = 235940; // Only this FID can access admin

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const [auth, setAuth] = useState<AuthState>({
    isAuthorized: false,
    isLoading: true,
    currentFid: null,
  });

  const [stats, setStats] = useState<Stats>({
    activeUsers: 0,
    loading: true,
    error: null,
  });

  // Withdraw states
  const [contractBalance, setContractBalance] = useState<string>('0');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Wagmi hooks for contract interaction
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Load contract balance
  useEffect(() => {
    async function loadContractBalance() {
      if (!publicClient) return;

      try {
        const balance = await publicClient.getBalance({
          address: WINTER_CHEER_CONTRACT_ADDRESS,
        });
        setContractBalance(formatEther(balance));
      } catch (error) {
        console.error('Failed to load contract balance:', error);
      }
    }

    loadContractBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(loadContractBalance, 10000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Handle transaction success
  useEffect(() => {
    if (isConfirmed && hash) {
      setWithdrawSuccess(`Successfully withdrawn! TX: ${hash.slice(0, 10)}...${hash.slice(-8)}`);
      setIsWithdrawing(false);
      setWithdrawAmount('');
      setWithdrawError(null);
      
      // Reload contract balance after successful withdrawal
      if (publicClient) {
        publicClient.getBalance({
          address: WINTER_CHEER_CONTRACT_ADDRESS,
        }).then((balance) => {
          setContractBalance(formatEther(balance));
        });
      }
    }
  }, [isConfirmed, hash, publicClient]);

  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      setWithdrawError(writeError.message || 'Withdrawal failed');
      setIsWithdrawing(false);
    }
  }, [writeError]);

  // Withdraw all balance
  const handleWithdrawAll = async () => {
    if (!isConnected || !address) {
      setWithdrawError('Please connect your wallet first');
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    try {
      writeContract({
        address: WINTER_CHEER_CONTRACT_ADDRESS,
        abi: WINTER_CHEER_ABI,
        functionName: 'withdraw',
        chainId: base.id,
      });
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : 'Withdrawal failed');
      setIsWithdrawing(false);
    }
  };

  // Withdraw specific amount
  const handleWithdrawAmount = async () => {
    if (!isConnected || !address) {
      setWithdrawError('Please connect your wallet first');
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }

    const amountInWei = parseEther(withdrawAmount);
    const balanceInWei = parseEther(contractBalance);

    if (amountInWei > balanceInWei) {
      setWithdrawError('Amount exceeds contract balance');
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    try {
      writeContract({
        address: WINTER_CHEER_CONTRACT_ADDRESS,
        abi: WINTER_CHEER_ABI,
        functionName: 'withdrawAmount',
        args: [amountInWei],
        chainId: base.id,
      });
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : 'Withdrawal failed');
      setIsWithdrawing(false);
    }
  };

  // Check admin access on mount
  useEffect(() => {
    async function checkAdminAccess() {
      try {
        // Get user FID from Farcaster context
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

        // Check if user is admin
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

  useEffect(() => {
    async function loadStats() {
      try {
        const result = await getActiveTokenCount();
        if (result.success) {
          setStats({
            activeUsers: result.count || 0,
            loading: false,
            error: null,
          });
        } else {
          setStats({
            activeUsers: 0,
            loading: false,
            error: result.error || 'Failed to load stats',
          });
        }
      } catch (error) {
        setStats({
          activeUsers: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    loadStats();
  }, []);

  // Show loading state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-white flex items-center justify-center">
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
              You do not have permission to access the admin dashboard.
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

  // Show admin dashboard if authorized
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Admin Authorization Badge */}
        <div className="bg-green-500 text-white px-4 py-2 rounded-full text-center mb-4 font-bold inline-block">
          ✅ Authorized Admin (FID: {auth.currentFid})
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 sparkle-text">
            🎅 Winter Cheer NFT Admin
          </h1>
          <p className="text-xl text-blue-100">
            Manage your Christmas NFT collection and community notifications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {/* Active Users */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-green-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Active Users</h3>
              <span className="text-3xl">👥</span>
            </div>
            {stats.loading ? (
              <p className="text-3xl font-bold text-green-600">Loading...</p>
            ) : stats.error ? (
              <p className="text-sm text-red-600">{stats.error}</p>
            ) : (
              <p className="text-4xl font-bold text-green-600">{stats.activeUsers}</p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              Users with notifications enabled
            </p>
          </div>

          {/* NFT Collection */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-red-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">NFT Supply</h3>
              <span className="text-3xl">🎁</span>
            </div>
            <p className="text-4xl font-bold text-red-600">10,000</p>
            <p className="text-sm text-gray-600 mt-2">
              Unique Christmas anime NFTs
            </p>
          </div>

          {/* Mint Fee */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-yellow-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Mint Fee</h3>
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-4xl font-bold text-yellow-600">0.00001 ETH</p>
            <p className="text-sm text-gray-600 mt-2">
              Affordable holiday collection
            </p>
          </div>

          {/* Contract Balance */}
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-purple-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-700">Contract Balance</h3>
              <span className="text-3xl">💰</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">
              {parseFloat(contractBalance).toFixed(6)} ETH
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Available to withdraw
            </p>
          </div>
        </div>

        {/* Withdraw Section */}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-green-300 shadow-lg mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Wallet className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-3xl font-bold text-green-700">
                💸 Withdraw Funds
              </h2>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
          </div>

          {/* Wallet Status */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm font-semibold text-blue-800">
              {isConnected ? (
                <>
                  ✅ Wallet Connected: <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </>
              ) : (
                <>
                  ⚠️ Please connect your wallet to withdraw funds
                </>
              )}
            </p>
          </div>

          {/* Success Message */}
          {withdrawSuccess && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
              <p className="text-green-700 font-semibold">✅ {withdrawSuccess}</p>
              <a 
                href={`https://basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                View on BaseScan →
              </a>
            </div>
          )}

          {/* Error Message */}
          {withdrawError && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <p className="text-red-700 font-semibold">❌ {withdrawError}</p>
            </div>
          )}

          {/* Transaction Status */}
          {(isPending || isConfirming) && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600 mr-3" />
              <p className="text-yellow-700 font-semibold">
                {isPending ? 'Waiting for wallet confirmation...' : 'Transaction confirming on blockchain...'}
              </p>
            </div>
          )}

          {/* Withdraw All Button */}
          <div className="mb-6">
            <button
              onClick={handleWithdrawAll}
              disabled={!isConnected || isWithdrawing || isPending || isConfirming || parseFloat(contractBalance) === 0}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ArrowDownToLine className="w-5 h-5 mr-2" />
              {isWithdrawing || isPending || isConfirming ? 'Withdrawing...' : `Withdraw All (${parseFloat(contractBalance).toFixed(6)} ETH)`}
            </button>
          </div>

          {/* Withdraw Specific Amount */}
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Or withdraw specific amount:
            </h3>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.000001"
                min="0"
                max={contractBalance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount in ETH"
                disabled={!isConnected || isWithdrawing || isPending || isConfirming}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleWithdrawAmount}
                disabled={!isConnected || isWithdrawing || isPending || isConfirming || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                {isWithdrawing || isPending || isConfirming ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>

          {/* Contract Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Contract Address:</p>
            <a 
              href={`https://basescan.org/address/${WINTER_CHEER_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-blue-600 hover:underline break-all"
            >
              {WINTER_CHEER_CONTRACT_ADDRESS}
            </a>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Broadcast Notifications */}
          <Link href="/broadcast">
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-blue-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-700 group-hover:text-blue-800">
                  📢 Broadcast Notifications
                </h2>
                <span className="text-4xl group-hover:rotate-12 transition-transform">
                  🎄
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                Send holiday updates to all Winter Cheer NFT collectors at once. Perfect for announcements, special events, and community updates!
              </p>
              <div className="flex items-center text-blue-600 font-semibold">
                <span>Go to Broadcaster</span>
                <span className="ml-2 group-hover:ml-4 transition-all">→</span>
              </div>
            </div>
          </Link>

          {/* Targeted Notifications */}
          <Link href="/notifications">
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-purple-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-purple-700 group-hover:text-purple-800">
                  🎯 Targeted Notifications
                </h2>
                <span className="text-4xl group-hover:rotate-12 transition-transform">
                  ❄️
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                Send personalized messages to specific users by FID. Great for VIP collectors, special mint notifications, or individual outreach.
              </p>
              <div className="flex items-center text-purple-600 font-semibold">
                <span>Go to Sender</span>
                <span className="ml-2 group-hover:ml-4 transition-all">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Back to App */}
        <div className="mt-8 text-center">
          <Link href="/">
            <button className="bg-white/90 hover:bg-white text-blue-700 font-bold py-3 px-8 rounded-full border-2 border-blue-300 hover:border-blue-400 transition-all shadow-lg hover:shadow-xl">
              ← Back to Winter Cheer NFT
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
