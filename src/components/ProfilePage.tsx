import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Mail, Shield, Car, Save, Loader2, CheckCircle2, RefreshCw, AlertTriangle, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface ProfilePageProps {
  profile: UserProfile;
}

export default function ProfilePage({ profile }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState(profile.vehicleNumber || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        vehicleNumber: vehicleNumber
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setIsEditing(false);
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        role: null,
        balance: 0 // Reset balance to zero for testing
      });
      toast.success("Profile reset successfully");
    } catch (err) {
      console.error("Switch role error:", err);
      toast.error("Failed to reset role");
    } finally {
      setLoading(false);
      setShowSwitchConfirm(false);
    }
  };

  const handleAddTokens = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        balance: (profile.balance || 0) + 500
      });
      toast.success("Added 500 tokens for testing!");
    } catch (err) {
      console.error("Add tokens error:", err);
      toast.error("Failed to add tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalReset = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Get all rides
      const ridesSnap = await getDocs(collection(db, 'rides'));
      ridesSnap.docs.forEach(doc => batch.delete(doc.ref));

      // 2. Get all transactions
      const txSnap = await getDocs(collection(db, 'transactions'));
      txSnap.docs.forEach(doc => batch.delete(doc.ref));

      // 3. Reset all user balances to 0
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(userDoc => {
        batch.update(userDoc.ref, { balance: 0 });
      });

      await batch.commit();
      toast.success("All app data has been wiped and reset!");
    } catch (err) {
      console.error("Global reset error:", err);
      toast.error("Failed to perform global reset. Check permissions.");
    } finally {
      setLoading(false);
      setShowGlobalResetConfirm(false);
    }
  };

  const isAdminUser = profile.email === 'dadadammy4141@gmail.com';

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-12 h-12 text-blue-600" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900">{profile.displayName}</h2>
          <p className="text-neutral-500 text-sm flex items-center justify-center gap-1 capitalize">
            <Shield className="w-3 h-3" />
            Verified {profile.role}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-neutral-900 px-1">Account Information</h3>
        
        <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50 shadow-sm">
          <InfoRow 
            icon={<Mail className="w-5 h-5 text-neutral-400" />} 
            label="Email Address" 
            value={profile.email} 
          />
          <InfoRow 
            icon={<User className="w-5 h-5 text-neutral-400" />} 
            label="User ID" 
            value={profile.uid.substring(0, 12) + '...'} 
          />
          {profile.role === 'driver' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-50 rounded-lg">
                    <Car className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">Vehicle Number</p>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="font-bold text-neutral-700 border-b-2 border-blue-600 outline-none w-full"
                        placeholder="Enter vehicle number"
                        autoFocus
                      />
                    ) : (
                      <p className={cn("font-bold", !profile.vehicleNumber && "text-red-500 italic")}>
                        {profile.vehicleNumber || 'Not set'}
                      </p>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditing && (
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 h-10 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setVehicleNumber(profile.vehicleNumber || '');
                    }}
                    className="h-10 px-4 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {success && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-700">Profile updated successfully!</p>
        </motion.div>
      )}

      <div className="pt-4 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Shield className="w-4 h-4 text-neutral-400" />
          <h3 className="font-bold text-neutral-900 text-sm uppercase tracking-wider">Testing Utilities</h3>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {isAdminUser && (
            <button 
              onClick={handleAddTokens}
              disabled={loading}
              className="w-full h-14 bg-green-50 border border-green-100 text-green-600 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-200">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              Add 500 Test Tokens
            </button>
          )}

          <button 
            onClick={() => setShowSwitchConfirm(true)}
            className="w-full h-14 bg-white border border-neutral-200 text-neutral-600 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-5 h-5 text-blue-500" />
            Switch Role / Reset My Balance
          </button>

          {isAdminUser && (
            <button 
              onClick={() => setShowGlobalResetConfirm(true)}
              className="w-full h-14 bg-red-50 border border-red-100 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-100 transition-colors shadow-sm"
            >
              <AlertTriangle className="w-5 h-5" />
              Wipe All App Activity (Global)
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl space-y-2">
          <h4 className="font-bold text-blue-900 text-sm">Testing Mode Active</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            These tools are for development testing. Wiping data will delete all recorded rides and transactions across the entire app.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showGlobalResetConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">Total System Wipe?</h3>
                <p className="text-neutral-500 text-sm">
                  This will PERMANENTLY DELETE all transactions and rides for ALL users. This cannot be undone.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleGlobalReset}
                  disabled={loading}
                  className="w-full h-14 bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Wipe Everything"}
                </button>
                <button
                  onClick={() => setShowGlobalResetConfirm(false)}
                  disabled={loading}
                  className="w-full h-14 bg-neutral-100 text-neutral-600 rounded-2xl font-bold text-lg"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSwitchConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">Switch Role?</h3>
                <p className="text-neutral-500 text-sm">
                  This will reset your current profile and balance. You will be taken back to the role selection screen.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSwitchRole}
                  disabled={loading}
                  className="w-full h-14 bg-amber-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, Reset Profile"}
                </button>
                <button
                  onClick={() => setShowSwitchConfirm(false)}
                  disabled={loading}
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="p-2 bg-neutral-50 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-neutral-400 font-bold uppercase">{label}</p>
        <p className="font-bold text-neutral-700">{value}</p>
      </div>
    </div>
  );
}
