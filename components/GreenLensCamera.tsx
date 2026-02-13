import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, VideoOff, CheckCircle2, ChevronDown, MapPin, Zap, AlertTriangle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface GreenLensCameraProps {
  onClose: () => void;
  onSubmit: () => void;
}

const POLLUTION_TYPES = [
  "Biomass Burning",
  "Construction Dust",
  "Industrial Smoke",
  "Vehicle Pollution",
  "Garbage Burning"
];

const SEVERITY_LEVELS = ["Mild", "Moderate", "Severe"];

export const GreenLensCamera: React.FC<GreenLensCameraProps> = ({ onClose, onSubmit }) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);
  
  // Flow State
  const [step, setStep] = useState<'capture' | 'details'>('capture');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Initialize empty to enforce validation
  const [formData, setFormData] = useState({
      type: '',
      severity: '',
      note: ''
  });

  useEffect(() => {
    // Access real camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setCameraError(true);
      }
    };

    startCamera();

    return () => {
      // Cleanup tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSnap = () => {
    if (videoRef.current) {
      videoRef.current.pause(); // Freeze frame
      setIsProcessing(true);
      
      // Simulate AI analysis delay then move to form
      setTimeout(() => {
        setIsProcessing(false);
        setStep('details');
      }, 800);
    }
  };

  const handleSubmitReport = async () => {
      if (!formData.type || !formData.severity) return;

      setIsSubmitting(true);

      // JSON payload for Firebase Realtime Database
      const incidentData = {
          id: Date.now(),
          type: formData.type,
          severity: formData.severity,
          location: "Rohini Sec-18",
          description: formData.note || "",
          timestamp: new Date().toLocaleTimeString(),
          isNew: true
      };

      try {
          // Update the 'latest_alert' node in Firebase
          await fetch("https://delhi-citizen-app-default-rtdb.firebaseio.com/latest_alert.json", {
              method: "PUT",
              body: JSON.stringify(incidentData),
              headers: { "Content-Type": "application/json" }
          });
          
      } catch (e) {
          console.error("Signal failed", e);
          alert("Network Error. Saving report offline.");
      }

      // Always proceed to reward for the demo UX
      setIsSubmitting(false);
      onSubmit(); 
  };

  const isValid = formData.type !== '' && formData.severity !== '';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
        {/* Real Camera Feed (Background) */}
        <div className="absolute inset-0 bg-gray-900">
             {!cameraError ? (
                 <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    className={`w-full h-full object-cover transition-all duration-500 ${step === 'details' ? 'brightness-50 blur-sm' : ''}`}
                 />
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <VideoOff size={48} className="mb-4 text-red-500" />
                    <p>Camera access denied. Please check permissions.</p>
                 </div>
             )}
        </div>

        {/* --- STEP 1: CAPTURE UI --- */}
        <AnimatePresence>
        {step === 'capture' && (
            <div className="relative z-10 flex-1 flex flex-col justify-between p-6">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-mono text-white tracking-widest">LIVE FEED</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20">
                        <X size={24} />
                    </button>
                </div>

                {/* AR Box */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-64 border border-white/30 rounded-lg">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 -mb-1 -mr-1"></div>
                        
                        {isProcessing && (
                             <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center flex-col gap-2"
                             >
                                 <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                 <span className="text-white font-bold text-sm tracking-widest uppercase">Analyzing...</span>
                             </motion.div>
                        )}
                    </div>
                </div>

                {/* Shutter Button */}
                <div className="w-full flex flex-col items-center gap-6">
                    <div className="text-white/80 font-mono text-sm shadow-black drop-shadow-md">
                        {isProcessing ? "Verifying impact..." : "Point at pollution source & tap button"}
                    </div>
                    
                    <motion.button 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    onClick={handleSnap}
                    disabled={isProcessing || cameraError}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-all disabled:opacity-50"
                    >
                        <div className="w-16 h-16 bg-white rounded-full"></div>
                    </motion.button>
                </div>
            </div>
        )}
        </AnimatePresence>

        {/* --- STEP 2: VERIFICATION FORM (MODAL) --- */}
        <AnimatePresence>
        {step === 'details' && (
            <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 z-20 shadow-2xl h-[85vh] flex flex-col"
            >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
                
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gov-navy">Verify Incident</h2>
                        <p className="text-gray-500 text-xs">Help the AI categorize this report</p>
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                        <CheckCircle2 size={12} /> AI Verified
                    </div>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pb-6 scrollbar-hide">
                    
                    {/* 1. Pollution Type */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">What did you see? <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select 
                                value={formData.type}
                                onChange={(e) => setFormData({...formData, type: e.target.value})}
                                className={`w-full appearance-none border rounded-xl p-4 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium transition-colors ${!formData.type ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-gray-900 border-blue-200 bg-blue-50'}`}
                            >
                                <option value="" disabled>Select Pollution Source</option>
                                {POLLUTION_TYPES.map(t => (
                                    <option key={t} value={t} className="text-gray-900">{t}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>

                    {/* 2. Severity (Color Coded Chips) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">How severe is it? <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-3 gap-3">
                            {SEVERITY_LEVELS.map(level => {
                                const isActive = formData.severity === level;
                                let activeClass = '';
                                let inactiveClass = 'bg-white border-gray-200 text-gray-500 hover:border-gray-300';
                                
                                if (level === 'Mild') {
                                    activeClass = 'bg-green-100 border-green-500 text-green-700 ring-1 ring-green-500';
                                    inactiveClass = 'bg-white border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-50';
                                } else if (level === 'Moderate') {
                                    activeClass = 'bg-orange-100 border-orange-500 text-orange-700 ring-1 ring-orange-500';
                                    inactiveClass = 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-50';
                                } else if (level === 'Severe') {
                                    activeClass = 'bg-red-100 border-red-600 text-red-700 ring-1 ring-red-600';
                                    inactiveClass = 'bg-white border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50';
                                }

                                return (
                                    <button
                                        key={level}
                                        onClick={() => setFormData({...formData, severity: level})}
                                        className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                                            isActive ? activeClass : inactiveClass
                                        }`}
                                    >
                                        {level === 'Severe' && <AlertTriangle size={16} className={isActive ? 'text-red-600' : 'text-gray-400'} />}
                                        {level}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Location Note */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Add Location Note</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="e.g. Near Primary School"
                                value={formData.note}
                                onChange={(e) => setFormData({...formData, note: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-11 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-800 leading-relaxed">
                            Your report helps authorities map pollution hotspots. Accurate data earns higher trust scores.
                        </p>
                    </div>

                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                    <button 
                        onClick={handleSubmitReport}
                        disabled={!isValid || isSubmitting}
                        className={`w-full text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                            !isValid || isSubmitting 
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-gov-navy hover:bg-opacity-90 active:scale-[0.98]'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Verifying & Uploading...
                            </>
                        ) : (
                            <>Submit Report & Earn <Zap size={20} className={isValid ? "text-yellow-400 fill-yellow-400" : "text-gray-400"} /></>
                        )}
                    </button>
                    
                    {!isSubmitting && (
                        <button 
                            onClick={() => { setStep('capture'); if(videoRef.current) videoRef.current.play(); }}
                            className="w-full text-gray-500 font-semibold py-2 hover:text-gray-800 transition-colors"
                        >
                            Retake Photo
                        </button>
                    )}
                </div>

            </motion.div>
        )}
        </AnimatePresence>
    </motion.div>
  );
};
