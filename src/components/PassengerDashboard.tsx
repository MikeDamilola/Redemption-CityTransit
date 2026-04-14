import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction } from '../types';
import { Wallet, QrCode, Plus, ArrowUpRight, ArrowDownLeft, Clock, X, Bus, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CURRENCY_SYMBOL, TOKEN_NAME, TOKEN_PACKAGES } from '../constants';
import { cn } from '../lib/utils';
import QRScanner from './QRScanner';
import TokenPurchaseModal from './TokenPurchaseModal';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, increment, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface PassengerDashboardProps {
  profile: UserProfile;
}

export default function PassengerDashboard({ profile }: PassengerDashboardProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [confirmPayment, setConfirmPayment] = useState<{ 
    driverId: string, 
    driverName: string,
    photoURL?: string,
    vehicleNumber?: string
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('fromId', '==', profile.uid),
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

  const handleScanSuccess = async (driverId: string) => {
    setShowScanner(false);
    
    try {
      const driverDoc = await getDoc(doc(db, 'users', driverId));
      if (!driverDoc.exists()) {
        toast.error("Invalid driver QR code");
        return;
      }
      const driverData = driverDoc.data() as UserProfile;
      setConfirmPayment({ 
        driverId, 
        driverName: driverData.displayName,
        photoURL: driverData.photoURL,
        vehicleNumber: driverData.vehicleNumber
      });
    } catch (err) {
      console.error("Fetch driver error:", err);
      toast.error("Failed to verify driver");
    }
  };

  const executePayment = async () => {
    if (!confirmPayment) return;
    
    const amount = 1; // Default 1 unit
    if (profile.balance < amount) {
      toast.error("Insufficient balance!");
      setConfirmPayment(null);
      return;
    }

    setProcessing(true);
    try {
      const batch = writeBatch(db);
      
      const passengerRef = doc(db, 'users', profile.uid);
      batch.update(passengerRef, { balance: increment(-amount) });
      
      const driverRef = doc(db, 'users', confirmPayment.driverId);
      batch.update(driverRef, { balance: increment(amount) });
      
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        id: txRef.id,
        fromId: profile.uid,
        fromName: profile.displayName,
        toId: confirmPayment.driverId,
        toName: confirmPayment.driverName,
        amount,
        type: 'payment',
        timestamp: Date.now(),
        status: 'completed'
      });

      await batch.commit();
      toast.success(`Paid ${amount} unit to ${confirmPayment.driverName}`);
      setConfirmPayment(null);
    } catch (err) {
      console.error("Payment error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'batch-payment');
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Balance Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden"
      >
        <div className="relative z-10 space-y-1">
          <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Available Balance</p>
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
            <span className="text-blue-100 font-medium">{TOKEN_NAME}</span>
          </div>
        </div>
        
        <div className="mt-8 flex gap-3 relative z-10">
          <button 
            onClick={() => setShowPurchase(true)}
            className="flex-1 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Top Up
          </button>
          <button 
            onClick={() => setShowScanner(true)}
            className="flex-1 h-12 bg-white text-blue-600 rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-transform"
          >
            <QrCode className="w-5 h-5" />
            Pay Driver
          </button>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase">Spent today</p>
            <p className="font-bold text-neutral-700">0 {TOKEN_NAME}</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-neutral-100 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase">Last ride</p>
            <p className="font-bold text-neutral-700">2h ago</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-neutral-900">Recent Activity</h4>
          <button className="text-sm font-medium text-blue-600">See all</button>
        </div>
        
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-neutral-200">
              <p className="text-neutral-400 text-sm">No transactions yet</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    tx.type === 'purchase' ? "bg-green-50" : "bg-blue-50"
                  )}>
                    {tx.type === 'purchase' ? <Plus className="w-5 h-5 text-green-600" /> : <ArrowUpRight className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{tx.type === 'purchase' ? 'Token Purchase' : `Payment to ${tx.toName}`}</p>
                    <p className="text-xs text-neutral-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className={cn(
                  "font-bold",
                  tx.type === 'purchase' ? "text-green-600" : "text-neutral-900"
                )}>
                  {tx.type === 'purchase' ? '+' : '-'}{tx.amount}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            <div className="p-4 flex items-center justify-between text-white">
              <h3 className="font-bold">Scan Driver QR</h3>
              <button onClick={() => setShowScanner(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 relative">
              <QRScanner onScanSuccess={handleScanSuccess} />
            </div>
          </motion.div>
        )}

        {showPurchase && (
          <TokenPurchaseModal 
            onClose={() => setShowPurchase(false)} 
            onSuccess={(units) => {
              toast.success(`Successfully purchased ${units} units!`);
              setShowPurchase(false);
            }}
            profile={profile}
          />
        )}

        {confirmPayment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-20 h-20">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-100">
                    {confirmPayment.photoURL ? (
                      <img src={confirmPayment.photoURL} alt={confirmPayment.driverName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Bus className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-neutral-900">{confirmPayment.driverName}</h3>
                  {confirmPayment.vehicleNumber && (
                    <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                      Vehicle: {confirmPayment.vehicleNumber}
                    </p>
                  )}
                  <p className="text-neutral-500 text-sm pt-2">
                    Confirm payment of <span className="font-bold text-neutral-900">1 unit</span> to this driver
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={executePayment}
                  disabled={processing}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Pay"}
                </button>
                <button
                  onClick={() => setConfirmPayment(null)}
                  disabled={processing}
                  className="w-full h-14 bg-neutral-100 text-neutral-600 rounded-2xl font-bold text-lg"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
