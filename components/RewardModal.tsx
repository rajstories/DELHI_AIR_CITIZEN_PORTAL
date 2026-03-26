import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Zap, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface RewardModalProps {
  onClose: () => void;
  onRedeem: () => void;
  onScanAnother: () => void;
  pointsEarned?: number;
  status?: 'verified' | 'flagged' | 'rejected';
}

export const RewardModal: React.FC<RewardModalProps> = ({ 
  onClose, 
  onRedeem, 
  onScanAnother, 
  pointsEarned,
  status 
}) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (status === 'verified' && pointsEarned > 0) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#22c55e', '#fbbf24', '#ffffff']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22c55e', '#fbbf24', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [status, pointsEarned]);

  const isVerified = status === 'verified' && pointsEarned > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                <X size={24} />
            </button>

            {/* Header Image/Icon */}
            <div className={`p-8 flex justify-center relative overflow-hidden ${
              isVerified 
                ? 'bg-gradient-to-br from-green-50 to-emerald-100' 
                : 'bg-gradient-to-br from-amber-50 to-orange-100'
            }`}>
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-50 ${
                  isVerified ? 'bg-yellow-300' : 'bg-orange-300'
                }`}></div>
                <div className={`absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-30 ${
                  isVerified ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg border-4 z-10 ${
                      isVerified 
                        ? 'bg-white border-green-500' 
                        : 'bg-white border-yellow-500'
                    }`}
                >
                    {isVerified ? (
                      <CheckCircle2 size={48} className="text-green-500" strokeWidth={3} />
                    ) : (
                      <AlertTriangle size={48} className="text-yellow-500" strokeWidth={3} />
                    )}
                </motion.div>
            </div>

            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isVerified ? t('greenlens.impact.verified') : 'Report Submitted'}
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  {isVerified 
                    ? t('greenlens.impact.msg')
                    : 'Your report has been submitted for review. Points will be awarded after verification.'
                  }
                </p>

                {isVerified ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-4">
                      <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                          <Zap size={24} fill="currentColor" />
                      </div>
                      <div className="text-left">
                          <div className="text-2xl font-bold text-gray-900">+{pointsEarned}</div>
                          <div className="text-xs text-yellow-800 font-semibold uppercase">{t('greenlens.reward.added')}</div>
                      </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                      <div className="text-lg font-bold text-gray-700">Pending Review</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {status === 'flagged' 
                          ? 'Your report is under review. You will earn points once verified by authorities.'
                          : 'Report submitted. No points earned.'
                        }
                      </div>
                  </div>
                )}

                <div className="space-y-3">
                    {isVerified && (
                      <button 
                          onClick={onRedeem}
                          className="w-full bg-gov-navy text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-[#152e4d] flex items-center justify-center gap-2"
                      >
                          {t('greenlens.redeem')} <ArrowRight size={18} />
                      </button>
                    )}
                    <button 
                        onClick={onScanAnother}
                        className="w-full bg-white text-gray-600 font-semibold py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                    >
                        {isVerified ? t('greenlens.scan.another') : 'Close'}
                    </button>
                </div>
            </div>
        </motion.div>
    </div>
  );
};
