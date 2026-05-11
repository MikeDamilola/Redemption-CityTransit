import React, { useState, useEffect } from 'react';
import { UserProfile, Ride } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit, getDocs, setDoc } from 'firebase/firestore';
import { MapPin, Navigation, Clock, CheckCircle2, XCircle, Loader2, Users, Search, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { TOKEN_NAME } from '../constants';

interface RideBookingProps {
  profile: UserProfile;
}

export default function RideBooking({ profile }: RideBookingProps) {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Listen for current user's active rides (not completed or cancelled)
    const q = query(
      collection(db, 'rides'),
      where('passengerId', '==', profile.uid),
      where('status', 'in', ['pending', 'accepted']),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveRide({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride);
      } else {
        setActiveRide(null);
      }
    });

    return () => unsub();
  }, [profile.uid]);

  // Fetch available drivers when searching
  useEffect(() => {
    if (activeRide?.status === 'pending') {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'driver'),
        where('isAvailable', '==', true),
        limit(5)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const drivers = snapshot.docs.map(doc => doc.data() as UserProfile);
        setAvailableDrivers(drivers);
      });
      return () => unsub();
    }
  }, [activeRide?.status]);

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !destination.trim()) {
      toast.error("Please enter both pickup and destination");
      return;
    }

    if (profile.balance < 5) {
      toast.error(`Insufficient balance. Minimum 5 ${TOKEN_NAME} required.`);
      return;
    }

    setLoading(true);
    try {
      const ridesRef = collection(db, 'rides');
      const newRideRef = doc(ridesRef);
      
      const rideData = {
        id: newRideRef.id,
        passengerId: profile.uid,
        passengerName: profile.displayName,
        driverId: null,
        driverName: null,
        status: 'pending',
        pickup: pickup.trim(),
        destination: destination.trim(),
        fare: 5, // Fixed fare for simplicity
        timestamp: Date.now()
      };

      await setDoc(newRideRef, rideData);
      
      toast.success("Ride requested! Waiting for a driver...");
      setPickup('');
      setDestination('');
    } catch (err) {
      console.error("Ride request error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'rides');
      toast.error("Failed to request ride");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
      await updateDoc(doc(db, 'rides', activeRide.id), {
        status: 'cancelled'
      });
      toast.success("Ride cancelled");
    } catch (err) {
      console.error("Cancel ride error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rides/${activeRide.id}`);
      toast.error("Failed to cancel ride");
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!activeRide ? (
          <motion.div
            key="request-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Book a Ride</h3>
                <p className="text-xs text-neutral-400 font-medium">Request a ride to your destination</p>
              </div>
            </div>

            <form onSubmit={handleRequestRide} className="space-y-4">
              <div className="space-y-4 relative">
                <div className="absolute left-[23px] top-[40px] bottom-[40px] w-0.5 bg-dashed border-l-2 border-dashed border-neutral-100" />
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 bg-white" />
                  </div>
                  <input
                    type="text"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="Pickup Location"
                    className="w-full h-14 bg-neutral-50 border border-neutral-100 rounded-2xl pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <MapPin className="w-5 h-5 text-rose-500" />
                  </div>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Where to?"
                    className="w-full h-14 bg-neutral-50 border border-neutral-100 rounded-2xl pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-900">Estimated Fare</span>
                </div>
                <span className="font-bold text-blue-600">5 {TOKEN_NAME}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-neutral-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg hover:bg-neutral-800"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Now"}
              </button>
            </form>
          </motion.div>
        ) : activeRide.status === 'pending' ? (
          <motion.div
            key="searching-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/95 backdrop-blur-md z-50 flex flex-col p-6"
          >
            <div className="flex-1 flex flex-col max-w-md mx-auto w-full pt-12">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Search className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Finding Drivers</h3>
                    <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Searching nearby...</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelRide}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Ride Summary in Overlay */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-8">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <div className="w-0.5 h-full bg-white/10" />
                    <MapPin className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-0.5 tracking-tighter">From</p>
                      <p className="text-sm font-medium text-white line-clamp-1">{activeRide.pickup}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-0.5 tracking-tighter">To</p>
                      <p className="text-sm font-medium text-white line-clamp-1">{activeRide.destination}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/30 uppercase font-bold mb-0.5 tracking-tighter">Fare</p>
                    <p className="text-lg font-bold text-blue-400">{activeRide.fare} <span className="text-[10px]">{TOKEN_NAME}</span></p>
                  </div>
                </div>
              </div>

              {/* Drivers Results */}
              <div className="flex-1 space-y-4 overflow-y-auto pb-8 scrollbar-hide">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Drivers Found
                  </h4>
                  <span className="text-[10px] font-bold text-blue-400">{availableDrivers.length} Near You</span>
                </div>

                <AnimatePresence mode="popLayout">
                  {availableDrivers.length > 0 ? (
                    availableDrivers.map((driver, idx) => (
                      <motion.div
                        key={driver.uid}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.1 } }}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl p-4 flex items-center justify-between transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                              {driver.photoURL ? (
                                <img src={driver.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-7 h-7 text-blue-400" />
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-neutral-900 rounded-full" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white">{driver.displayName}</p>
                              <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md font-bold uppercase">Pro</span>
                            </div>
                            <p className="text-[10px] text-white/40 font-medium">{driver.vehicleNumber || 'Standard Vehicle'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <Navigation className="w-2.5 h-2.5 text-blue-400" />
                                <span className="text-[10px] text-blue-400 font-bold">{(0.5 + Math.random() * 2).toFixed(1)} km</span>
                              </div>
                              <span className="text-white/20 text-[10px]">•</span>
                              <span className="text-[10px] text-white/40 font-medium">4.9 ★</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-600 p-2.5 rounded-xl group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
                          <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-10 text-center">
                      <Loader2 className="w-6 h-6 text-white/30 mx-auto mb-3 animate-spin" />
                      <p className="text-white/40 text-sm font-medium">Updating drivers roster...</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Pulse */}
              <div className="py-6 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                  <div className="w-3 h-3 bg-blue-500 rounded-full relative z-10" />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active-ride"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 whitespace-nowrap">Ride Accepted!</h3>
                    <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">
                      Driver: {activeRide.driverName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-600" />
                    <div className="w-0.5 h-full bg-neutral-100" />
                    <MapPin className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Pickup</p>
                      <p className="text-sm font-medium line-clamp-1">{activeRide.pickup}</p>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Destination</p>
                        <p className="text-sm font-medium line-clamp-1">{activeRide.destination}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Requested</p>
                        <p className="text-xs font-bold text-neutral-600">
                          {new Date(activeRide.timestamp).toLocaleDateString()} {new Date(activeRide.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-green-600 uppercase font-bold mb-0.5">
                    {activeRide.acceptedAt ? `Accepted ${new Date(activeRide.acceptedAt).toLocaleDateString()} ${new Date(activeRide.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Calculating...'}
                  </p>
                  <p className="font-bold text-green-900">{activeRide.fare} {TOKEN_NAME}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold shadow-sm shadow-green-100">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  In Progress
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
