import React from 'react';
import { User, Car, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface RoleSelectionProps {
  onSelect: (role: 'passenger' | 'driver') => void;
}

export default function RoleSelection({ onSelect }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900">Choose your role</h2>
          <p className="text-neutral-500">How will you be using CityTransit today?</p>
        </div>

        <div className="grid gap-4">
          <RoleCard 
            icon={<User className="w-6 h-6 text-blue-600" />}
            title="Passenger"
            description="I want to buy tokens and pay for my rides."
            onClick={() => onSelect('passenger')}
          />
          <RoleCard 
            icon={<Car className="w-6 h-6 text-green-600" />}
            title="Driver"
            description="I want to accept payments and manage my earnings."
            onClick={() => onSelect('driver')}
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-6 bg-white border border-neutral-200 rounded-2xl text-left flex items-start gap-4 hover:border-blue-300 transition-colors shadow-sm"
    >
      <div className="p-3 bg-neutral-50 rounded-xl">
        {icon}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-neutral-900">{title}</h3>
          <ArrowRight className="w-4 h-4 text-neutral-300" />
        </div>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
    </motion.button>
  );
}
