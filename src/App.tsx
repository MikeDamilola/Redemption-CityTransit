import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';
import { Loader2, LogOut, Wallet, QrCode, History, User as UserIcon, Bus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import PassengerDashboard from './components/PassengerDashboard';
import DriverDashboard from './components/DriverDashboard';
import AuthScreen from './components/AuthScreen';
import RoleSelection from './components/RoleSelection';
import ProfilePage from './components/ProfilePage';
import HistoryPage from './components/HistoryPage';
import { Toaster } from 'sonner';

type Tab = 'wallet' | 'history' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('wallet');

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        unsubProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setError("Failed to load profile");
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleRoleSelect = async (role: 'passenger' | 'driver') => {
    if (!user) return;
    setLoading(true);
    try {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role,
        balance: 0,
        createdAt: Date.now(),
      };

      if (user.photoURL) {
        newProfile.photoURL = user.photoURL;
      }

      if (role === 'driver') {
        newProfile.qrCodeData = `citytransit://pay/${user.uid}`;
      }

      await setDoc(doc(db, 'users', user.uid), newProfile);
    } catch (err) {
      console.error("Role select error:", err);
      setError("Failed to set role");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSignIn={signInWithGoogle} />;
  }

  if (!profile) {
    return <RoleSelection onSelect={handleRoleSelect} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'wallet':
        return profile.role === 'passenger' ? (
          <PassengerDashboard profile={profile} />
        ) : (
          <DriverDashboard profile={profile} />
        );
      case 'history':
        return <HistoryPage profile={profile} />;
      case 'profile':
        return <ProfilePage profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <Toaster position="top-center" />
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CityTransit</span>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-neutral-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50">
        <div className="max-w-md mx-auto px-6 h-20 flex items-center justify-around">
          <NavItem 
            icon={<History className="w-6 h-6" />} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          />
          <NavItem 
            icon={<Wallet className="w-6 h-6" />} 
            label="Wallet" 
            active={activeTab === 'wallet'} 
            onClick={() => setActiveTab('wallet')}
          />
          <NavItem 
            icon={<UserIcon className="w-6 h-6" />} 
            label="Profile" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all relative",
        active ? "text-blue-600" : "text-neutral-400 hover:text-neutral-600"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-4 w-12 h-1 bg-blue-600 rounded-full"
        />
      )}
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
