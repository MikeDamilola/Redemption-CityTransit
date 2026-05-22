import React, { useState, useEffect } from 'react';
import { UserProfile, Ride } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit, writeBatch, increment } from 'firebase/firestore';
import { Navigation, MapPin, CheckCircle2, ChevronRight, Loader2, Map as MapIcon, Phone, Clock, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { TOKEN_NAME } from '../constants';

interface RideRequestsProps {
  profile: UserProfile;
}

export default function RideRequests({ profile }: RideRequestsProps) {
  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    // Listen for available pending rides
    const qPending = query(
      collection(db, 'rides'),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubPending = onSnapshot(qPending, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
      setPendingRides(rides);
    });

    // Listen for current driver's active ride (accepted or in_progress)
    const qActive = query(
      collection(db, 'rides'),
      where('driverId', '==', profile.uid),
      where('status', 'in', ['accepted', 'in_progress']),
      limit(1)
    );

    const unsubActive = onSnapshot(qActive, (snapshot) => {
      if (!snapshot.empty) {
        setActiveRide({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ride);
      } else {
        setActiveRide(null);
      }
    });

    return () => {
      unsubPending();
      unsubActive();
    };
  }, [profile.uid]);

  const handleUpdateETA = async (minutes: number) => {
    if (!activeRide) return;
    try {
      await updateDoc(doc(db, 'rides', activeRide.id), {
        estimatedArrival: minutes.toString()
      });
      toast.success(`ETA updated to ${minutes} mins`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rides/${activeRide.id}`);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    if (!profile.isAvailable) {
      toast.error("You must be Online to accept rides");
      return;
    }
    setLoadingAction(rideId);
    try {
      // For simplicity, let's auto-set an initial ETA when accepting
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'accepted',
        driverId: profile.uid,
        driverName: profile.displayName,
        driverPhone: profile.phoneNumber,
        acceptedAt: Date.now(),
        estimatedArrival: "5" // Default 5 mins
      });
      toast.success("Ride accepted!");
    } catch (err) {
      console.error("Accept ride error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `rides/${rideId}`);
      toast.error("Failed to accept ride. It might have been taken.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePickup = async () => {
    if (!activeRide) return;
    setLoadingAction('pickup');
    try {
      await updateDoc(doc(db, 'rides', activeRide.id), {
        status: 'in_progress',
        startedAt: Date.now()
      });
      toast.success("Ride started! Drive safely.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rides/${activeRide.id}`);
      toast.error("Failed to start ride");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    setLoadingAction('complete');
    try {
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'rides', activeRide.id), {
        status: 'completed',
        completedAt: Date.now()
      });

      const passengerRef = doc(db, 'users', activeRide.passengerId);
      const driverRef = doc(db, 'users', profile.uid);
      const txRef = doc(collection(db, 'transactions'));

      batch.update(passengerRef, { balance: increment(-activeRide.fare) });
      batch.update(driverRef, { balance: increment(activeRide.fare) });
      
      batch.set(txRef, {
        id: txRef.id,
        fromId: activeRide.passengerId,
        fromName: activeRide.passengerName,
        toId: profile.uid,
        toName: profile.displayName,
        amount: activeRide.fare,
        type: 'payment',
        timestamp: Date.now(),
        status: 'completed'
      });

      await batch.commit();
      toast.success("Ride completed and fare collected!");
    } catch (err) {
      console.error("Complete ride error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'ride-completion-batch');
      toast.error("Failed to complete ride");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeRide ? (
          <motion.div
            key="active-job"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-neutral-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-50" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    {activeRide.status === 'accepted' ? <Clock className="w-6 h-6 text-blue-400" /> : <Navigation className="w-6 h-6 text-green-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {activeRide.status === 'accepted' ? 'Pickup Commuter' : 'Trip in Progress'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-white/50 font-medium uppercase tracking-wider">{activeRide.passengerName}</p>
                      <span className="text-white/20">•</span>
                      <p className="text-[10px] text-blue-400 font-bold uppercase">
                        {activeRide.status === 'accepted' ? 'Heading to pickup' : 'On the road'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-widest",
                  activeRide.status === 'accepted' ? "bg-blue-500/20 border-blue-500/30 text-blue-400" : "bg-green-500/20 border-green-500/30 text-green-400"
                )}>
                  {activeRide.status === 'accepted' ? 'Pending Pickup' : 'Active Ride'}
                </div>
              </div>

              {/* Communication & ETA row */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <a 
                  href={`tel:${activeRide.passengerPhone}`}
                  className="h-12 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Passenger
                </a>
                <div className="h-12 bg-white/10 border border-white/10 rounded-xl flex items-center justify-between px-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>{activeRide.estimatedArrival || '--'}m ETA</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleUpdateETA(Math.max(1, parseInt(activeRide.estimatedArrival || '5') - 1))} className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs">-</button>
                    <button onClick={() => handleUpdateETA(parseInt(activeRide.estimatedArrival || '5') + 1)} className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs">+</button>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2 py-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <div className="w-0.5 h-full bg-white/10" />
                    <MapPin className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-1 tracking-tighter">Pickup Location</p>
                      <p className="text-sm font-bold text-white/90">{activeRide.pickup}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase font-bold mb-1 tracking-tighter">Destination</p>
                      <p className="text-sm font-bold text-white/90">{activeRide.destination}</p>
                    </div>
                  </div>
                </div>
              </div>

              {activeRide.status === 'accepted' ? (
                <button
                  onClick={handlePickup}
                  disabled={loadingAction === 'pickup'}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {loadingAction === 'pickup' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      Commuter Picked Up
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCompleteRide}
                  disabled={loadingAction === 'complete'}
                  className="w-full h-14 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                >
                  {loadingAction === 'complete' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Complete Ride & Collect Fare
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-blue-600" />
                Available Requests
              </h3>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded-full">
                {pendingRides.length} nearby
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {pendingRides.length > 0 ? (
                pendingRides.map((ride, idx) => (
                  <motion.div
                    key={ride.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center font-bold text-blue-600">
                          {ride.passengerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{ride.passengerName}</p>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{TOKEN_NAME} Reward: {ride.fare}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Requested</p>
                        <p className="text-xs font-bold text-neutral-600">
                          {new Date(ride.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-5 py-3 border-y border-neutral-50 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <p className="text-xs text-neutral-600 truncate flex-1 leading-relaxed">{ride.pickup}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <p className="text-xs text-neutral-900 font-bold truncate flex-1 leading-relaxed">{ride.destination}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptRide(ride.id)}
                      disabled={!!loadingAction}
                      className="w-full h-12 bg-neutral-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                      {loadingAction === ride.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Accept Request
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-neutral-50 rounded-3xl p-12 text-center border border-dashed border-neutral-200"
                >
                  <Navigation className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500 font-bold text-sm">No requests available</p>
                  <p className="text-neutral-400 text-xs mt-1">Waiting for passengers to book rides...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
