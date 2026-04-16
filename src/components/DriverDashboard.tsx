import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction } from '../types';
import { QrCode, ArrowDownLeft, TrendingUp, Users, Clock, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CURRENCY_SYMBOL, TOKEN_NAME } from '../constants';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, increment, setDoc, writeBatch } from 'firebase/firestore';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { toast } from 'sonner';

interface DriverDashboardProps {
  profile: UserProfile;
}

export default function DriverDashboard({ profile }: DriverDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    console.log("DriverDashboard balance update:", profile.balance);
  }, [profile.balance]);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('toId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsub();
  }, [profile.uid]);

  const handleWithdraw = async () => {
    if (profile.balance <= 0) {
      toast.error("No balance to withdraw");
      return;
    }

    setWithdrawing(true);
    try {
      // Simulate bank transfer delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const amount = profile.balance;
      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', profile.uid);
      batch.update(userRef, { balance: 0 });

      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        id: txRef.id,
        fromId: profile.uid,
        fromName: profile.displayName,
        toId: 'BANK',
        toName: 'Bank Account',
        amount: amount,
        type: 'transfer',
        timestamp: Date.now(),
        status: 'completed'
      });

      await batch.commit();
      toast.success(`Successfully withdrawn ${CURRENCY_SYMBOL}${(amount * 100).toLocaleString()} to your bank!`);
    } catch (err) {
      console.error("Withdraw error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'withdrawal-batch');
      toast.error("Withdrawal failed. Please check your connection.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Earnings Overview */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-neutral-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10 space-y-1">
          <p className="text-neutral-400 text-sm font-medium uppercase tracking-wider">Total Earnings</p>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <AnimatePresence mode="wait">
                <motion.h3 
                  key={profile.balance}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-4xl font-bold"
                >
                  {profile.balance}
                </motion.h3>
              </AnimatePresence>
              <span className="text-neutral-400 font-medium">{TOKEN_NAME}</span>
            </div>
            <div className="text-right">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={profile.balance}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl font-bold text-blue-400"
                >
                  {CURRENCY_SYMBOL}{(profile.balance * 100).toLocaleString()}
                </motion.p>
              </AnimatePresence>
              <p className="text-[10px] text-neutral-500 uppercase font-bold">Naira Equivalent</p>
            </div>
          </div>
          
          <button 
            onClick={handleWithdraw}
            disabled={withdrawing || profile.balance <= 0}
            className="mt-6 w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            {withdrawing ? "Processing..." : "Withdraw to Bank"}
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
      </motion.div>

      {/* QR Code Section */}
      <div className="bg-white p-8 rounded-3xl border border-neutral-100 flex flex-col items-center gap-6 shadow-sm">
        <div className="text-center space-y-1">
          <h4 className="font-bold text-lg">Your Payment QR</h4>
          <p className="text-sm text-neutral-400">Ask passenger to scan this code</p>
        </div>
        
        <div className="p-4 bg-white border-4 border-neutral-50 rounded-2xl shadow-inner">
          <QRCodeSVG 
            value={profile.qrCodeData || `citytransit://pay/${profile.uid}`} 
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Your Driver ID</p>
          <div className="flex items-center justify-center gap-2">
            <p className="font-mono font-bold text-neutral-900 bg-neutral-50 px-3 py-1 rounded-lg border border-neutral-100">{profile.uid}</p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(profile.uid);
                toast.success("ID copied to clipboard!");
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Copy ID"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button className="flex items-center gap-2 text-blue-600 font-semibold text-sm hover:bg-blue-50 px-4 py-2 rounded-full transition-colors">
          <Share2 className="w-4 h-4" />
          Share Payment Link
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-neutral-100 rounded-2xl space-y-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase">Riders Today</p>
            <p className="font-bold text-neutral-700">14</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-neutral-100 rounded-2xl space-y-2">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase">Active Hours</p>
            <p className="font-bold text-neutral-700">6.5h</p>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="space-y-4">
        <h4 className="font-bold text-neutral-900">Recent Payments</h4>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-neutral-200">
              <p className="text-neutral-400 text-sm">No payments received yet</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-neutral-900">From {tx.fromName}</p>
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Credit</span>
                    </div>
                    <p className="text-xs text-neutral-400">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <p className="font-bold text-green-600">+{tx.amount}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
