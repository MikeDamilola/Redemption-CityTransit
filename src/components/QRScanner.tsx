import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Keyboard, ArrowRight, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerProps {
  onScanSuccess: (driverId: string) => void;
}

export default function QRScanner({ onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualId, setManualId] = useState('');

  useEffect(() => {
    if (mode === 'camera') {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        },
        /* verbose= */ false
      );

      scannerRef.current.render((decodedText) => {
        if (decodedText.startsWith('citytransit://pay/')) {
          const driverId = decodedText.split('/').pop();
          if (driverId) {
            onScanSuccess(driverId);
            scannerRef.current?.clear();
          }
        }
      }, (error) => {
        // console.warn(error);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScanSuccess, mode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      onScanSuccess(manualId.trim());
    }
  };

  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {mode === 'camera' ? (
          <motion.div 
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center gap-8"
          >
            <div id="qr-reader" className="w-full max-w-sm border-none!" />
            <button 
              onClick={() => setMode('manual')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors py-2 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
            >
              <Keyboard className="w-4 h-4" />
              Enter Driver ID manually
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="manual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Manual Entry</h3>
              <p className="text-white/50 text-sm">Enter the Driver ID found below their QR code</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. ABC123XYZ"
                  className="w-full h-14 bg-white/10 border border-white/20 rounded-2xl px-4 text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={!manualId.trim()}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <button 
              onClick={() => setMode('camera')}
              className="w-full py-2 text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Back to Camera
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
        #qr-reader__status_span {
          display: none !important;
        }
        #qr-reader video {
          border-radius: 32px;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}
