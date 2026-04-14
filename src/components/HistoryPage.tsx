import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction } from '../types';
import { History, ArrowUpRight, ArrowDownLeft, Plus, Search, Filter } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, or } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { TOKEN_NAME } from '../constants';

interface HistoryPageProps {
  profile: UserProfile;
}

export default function HistoryPage({ profile }: HistoryPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query transactions where user is either sender or receiver
    const q = query(
      collection(db, 'transactions'),
      or(
        where('fromId', '==', profile.uid),
        where('toId', '==', profile.uid)
      ),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    }, (err) => {
      console.error("History snapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile.uid]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-900">Transaction History</h2>
        <div className="flex gap-2">
          <button className="p-2 bg-white border border-neutral-200 rounded-xl text-neutral-500">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 bg-white border border-neutral-200 rounded-xl text-neutral-500">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-400">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-200 space-y-4">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
              <History className="w-8 h-8 text-neutral-300" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-neutral-900">No transactions yet</p>
              <p className="text-sm text-neutral-400 px-12">Your ride payments and token purchases will appear here.</p>
            </div>
          </div>
        ) : (
          transactions.map((tx) => {
            const isOutgoing = tx.fromId === profile.uid;
            const isPurchase = tx.type === 'purchase';
            
            return (
              <div key={tx.id} className="bg-white p-4 rounded-2xl border border-neutral-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    isPurchase ? "bg-green-50" : isOutgoing ? "bg-blue-50" : "bg-orange-50"
                  )}>
                    {isPurchase ? (
                      <Plus className="w-6 h-6 text-green-600" />
                    ) : isOutgoing ? (
                      <ArrowUpRight className="w-6 h-6 text-blue-600" />
                    ) : (
                      <ArrowDownLeft className="w-6 h-6 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">
                      {isPurchase ? 'Token Purchase' : isOutgoing ? `Paid to ${tx.toName}` : `Received from ${tx.fromName}`}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold text-lg",
                    isPurchase || !isOutgoing ? "text-green-600" : "text-neutral-900"
                  )}>
                    {isPurchase || !isOutgoing ? '+' : '-'}{tx.amount}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase">{TOKEN_NAME}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
