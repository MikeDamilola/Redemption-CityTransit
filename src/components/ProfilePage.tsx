import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, Mail, Shield, Car, Save, Loader2, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface ProfilePageProps {
  profile: UserProfile;
}

export default function ProfilePage({ profile }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
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
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      // Just clear the role instead of deleting the doc
      await updateDoc(userRef, {
        role: null
      });
      // App.tsx listener will handle the UI update
    } catch (err) {
      console.error("Switch role error:", err);
      alert("Failed to reset role");
    } finally {
      setLoading(false);
      setShowSwitchConfirm(false);
    }
  };

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
        <button 
          onClick={() => setShowSwitchConfirm(true)}
          className="w-full h-14 bg-neutral-100 text-neutral-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Switch Role / Reset Profile
        </button>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl space-y-2">
          <h4 className="font-bold text-blue-900 text-sm">Security Tip</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            Never share your login credentials or QR code with anyone. CityTransit staff will never ask for your password.
          </p>
        </div>
      </div>

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
