import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, Check, CreditCard, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CURRENCY_SYMBOL, TOKEN_NAME, TOKEN_PACKAGES } from '../constants';
import { db } from '../firebase';
import { doc, updateDoc, increment, setDoc, collection } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface TokenPurchaseModalProps {
  onClose: () => void;
  onSuccess: (units: number) => void;
  profile: UserProfile;
}

export default function TokenPurchaseModal({ onClose, onSuccess, profile }: TokenPurchaseModalProps) {
  const [selectedPkg, setSelectedPkg] = useState(TOKEN_PACKAGES[0]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'paying' | 'success'>('select');

  const handlePurchase = async () => {
    setLoading(true);
    setStep('paying');
    
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Update balance
      const userRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(userRef, {
          balance: increment(selectedPkg.units)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
      }

      // Log transaction
      const txRef = doc(collection(db, 'transactions'));
      try {
        await setDoc(txRef, {
          id: txRef.id,
          fromId: profile.uid,
          fromName: profile.displayName,
          toId: 'SYSTEM',
          toName: 'CityTransit',
          amount: selectedPkg.units,
          type: 'purchase',
          timestamp: Date.now(),
          status: 'completed'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `transactions/${txRef.id}`);
      }

      setStep('success');
      setTimeout(() => {
        onSuccess(selectedPkg.units);
      }, 1500);
    } catch (err) {
      console.error("Purchase error:", err);
      // If it's our JSON error, we might want to show a better message
      alert("Purchase failed. Please check your connection or permissions.");
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-neutral-900">Buy Tokens</h3>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {step === 'select' && (
            <div className="space-y-6">
              <div className="grid gap-3">
                {TOKEN_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                      selectedPkg.id === pkg.id 
                        ? "border-blue-600 bg-blue-50" 
                        : "border-neutral-100 hover:border-neutral-200"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-lg">{pkg.units} {TOKEN_NAME}</p>
                      <p className="text-sm text-neutral-500">Get {pkg.units} units for your rides</p>
                    </div>
                    <p className="text-xl font-bold text-blue-600">{CURRENCY_SYMBOL}{pkg.priceNaira.toLocaleString()}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handlePurchase}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pay {CURRENCY_SYMBOL}{selectedPkg.priceNaira.toLocaleString()}
              </button>
            </div>
          )}

          {step === 'paying' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="font-bold text-lg">Processing Payment</p>
                <p className="text-neutral-500">Please do not close the app...</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-2xl text-neutral-900">Success!</p>
                <p className="text-neutral-500">Added {selectedPkg.units} {TOKEN_NAME} to your wallet</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
