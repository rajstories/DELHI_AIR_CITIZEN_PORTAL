import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, VideoOff, CheckCircle2, Zap, AlertTriangle, AlertCircle,
  MapPin, Camera, Loader2,
  Flame, HardHat, Factory, Car, Trash2, HelpCircle,
  ShieldCheck, ShieldAlert, ShieldX, Upload, Star
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { encodeDigiPin } from '../src/services/digiPinService';
import { extractExifData, type ExifData } from '../src/services/exifService';
import { verifyReport, type VerificationResult } from '../src/services/verificationService';
import { uploadPhoto, saveReport, type ReportPayload } from '../src/services/reportService';
import { getCitizenId } from '../src/utils/citizenUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GreenLensCameraProps {
  onClose: () => void;
  onSubmit: (trustScore?: number) => void;
}

interface GpsCoords { lat: number; lng: number; }

type SubmitStep = 'idle' | 'uploading' | 'verifying' | 'calculating' | 'sending' | 'done';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Global lock across component instances (important in React dev remount cycles)
// so we don't overlap camera getUserMedia calls and trigger NotReadableError.
let globalCameraStartInProgress = false;

// ─── Constants ────────────────────────────────────────────────────────────────

const POLLUTION_TYPES = [
  { value: 'Biomass Burning',   label: 'Biomass Burning',   icon: Flame,      key: 'biomass_burning'   },
  { value: 'Construction Dust', label: 'Construction Dust', icon: HardHat,    key: 'construction_dust' },
  { value: 'Industrial Smoke',  label: 'Industrial Smoke',  icon: Factory,    key: 'industrial'        },
  { value: 'Vehicle Pollution', label: 'Vehicle Pollution', icon: Car,        key: 'vehicular'         },
  { value: 'Garbage Burning',   label: 'Garbage Burning',   icon: Trash2,     key: 'garbage_burning'   },
  { value: 'Other',             label: 'Other',             icon: HelpCircle, key: 'other'             },
] as const;

const SEVERITY_MAP = {
  Mild:     { color: 'green',  label: 'Mild',     dbValue: 'low'    },
  Moderate: { color: 'orange', label: 'Moderate', dbValue: 'medium' },
  Severe:   { color: 'red',    label: 'Severe',   dbValue: 'high'   },
} as const;

const SEVERITY_LEVELS = Object.keys(SEVERITY_MAP) as Array<keyof typeof SEVERITY_MAP>;

// ─── Component ────────────────────────────────────────────────────────────────

export const GreenLensCamera: React.FC<GreenLensCameraProps> = ({ onClose, onSubmit }) => {
  const { t } = useLanguage();

  // Refs
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const cameraStartTokenRef = useRef(0);

  // Camera / flow state
  const [cameraError, setCameraError]     = useState(false);
  const [cameraErrorType, setCameraErrorType] = useState<'denied' | 'busy' | 'not_found' | 'unknown' | null>(null);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const [step, setStep]                   = useState<'capture' | 'analyze' | 'details' | 'result'>('capture');
  const [isProcessing, setIsProcessing]   = useState(false);
  const [submitStep, setSubmitStep]       = useState<SubmitStep>('idle');

  // Photo captured from live camera only
  const [capturedFile, setCapturedFile]       = useState<File | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isLiveCapture, setIsLiveCapture]     = useState(false);

  // EXIF + GPS state
  const [gps, setGps]           = useState<GpsCoords | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'ok' | 'denied' | 'unavailable'>('loading');
  const [hasSharedLocation, setHasSharedLocation] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [digiPin, setDigiPin]   = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form
  const [selectedType, setSelectedType]         = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [description, setDescription]           = useState('');

  // Verification result
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const stopCamera = useCallback(() => {
    cameraStartTokenRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    // If another instance is currently starting camera, wait a moment and retry.
    if (globalCameraStartInProgress) {
      await sleep(400);
    }

    stopCamera();
    const token = cameraStartTokenRef.current;
    setCameraError(false);
    setCameraErrorType(null);
    setCameraErrorMessage('');

    globalCameraStartInProgress = true;
    try {
      const cameraConstraints: MediaStreamConstraints[] = [
        { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: true },
      ];

      let stream: MediaStream | null = null;
      let lastError: unknown = null;

      // Retry cycle for transient hardware lock/race conditions.
      for (let attempt = 0; attempt < 3 && !stream; attempt += 1) {
        for (const constraints of cameraConstraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!stream) {
          await sleep(350 * (attempt + 1));
        }
      }

      if (!stream) {
        throw lastError ?? new Error('Unable to acquire camera stream');
      }

      // Ignore stale async camera starts (can happen in dev StrictMode remounts).
      if (token !== cameraStartTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      if (token !== cameraStartTokenRef.current) return;
      console.error('[GreenLens] Camera error:', err);
      const name = err instanceof DOMException ? err.name : 'UnknownError';
      setCameraError(true);

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraErrorType('denied');
        setCameraErrorMessage('Camera permission is blocked. Please allow camera access in browser settings.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraErrorType('busy');
        setCameraErrorMessage('Camera is currently in use by another app or tab. Close other camera apps/tabs, then tap Retry Camera.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraErrorType('not_found');
        setCameraErrorMessage('No camera device was found on this system.');
      } else {
        setCameraErrorType('unknown');
        setCameraErrorMessage('Unable to start camera. Please try again.');
      }
    } finally {
      globalCameraStartInProgress = false;
    }
  }, [stopCamera]);

  // ── Camera startup ──────────────────────────────────────────────────────────
  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
  }, [startCamera, stopCamera]);

  // ── Auto GPS + DigiPin on mount ─────────────────────────────────────────────
  const requestGps = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return false;
    }

    setGpsStatus('loading');
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: GpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGps(coords);
          setGpsStatus('ok');
          const pin = encodeDigiPin(coords.lat, coords.lng);
          setDigiPin(pin);
          console.log('[GreenLens] GPS:', coords, '→ DigiPin:', pin);
          resolve(true);
        },
        (err) => {
          console.warn('[GreenLens] GPS error:', err.message);
          setGpsStatus(err.code === 1 ? 'denied' : 'unavailable');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  }, []);

  useEffect(() => {
    requestGps();
  }, [requestGps]);

  const handleShareLiveLocation = useCallback(async () => {
    setIsSharingLocation(true);
    const ok = await requestGps();
    setIsSharingLocation(false);

    if (ok) {
      setHasSharedLocation(true);
    } else {
      setHasSharedLocation(false);
      alert('Unable to fetch live location. Please enable location permission and try again.');
    }
  }, [requestGps]);

  // ── Run EXIF + analysis once a file is captured ────────────────────────────
  const runAnalysis = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setStep('analyze');
    const exif = await extractExifData(file);
    setExifData(exif);
    setIsAnalyzing(false);
    setStep('details');
  }, []);

  // ── Snap from camera → canvas → File ───────────────────────────────────────
  // NOTE: This component ONLY supports real-time camera captures.
  // Gallery uploads are explicitly NOT allowed for authenticity verification.
  const handleSnap = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isProcessing) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedDataUrl(dataUrl);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setCapturedFile(file);
      setIsLiveCapture(true); // ALWAYS true — this is the ONLY way to capture
      console.log(`[GreenLens] Camera snap: ${(blob.size / 1024).toFixed(1)} KB — Live capture confirmed`);
      runAnalysis(file);
    }, 'image/jpeg', 0.85);

    video.pause();
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 400);
  }, [isProcessing, runAnalysis]);


  // ── Retake ──────────────────────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    setCapturedFile(null);
    setCapturedDataUrl(null);
    setIsLiveCapture(false);
    setHasSharedLocation(false);
    setExifData(null);
    setIsProcessing(false);
    setStep('capture');
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => undefined);
    }
  }, []);

  // ── Full submit flow ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // ⚠️ STRICT VALIDATION: Gallery uploads are not allowed
    if (!capturedFile) { alert('Please capture a photo first'); return; }
    if (!selectedType || !selectedSeverity) return;
    if (!hasSharedLocation || !gps) {
      alert('Please send your live location first, then submit the report.');
      return;
    }
    
    // ENFORCE: Only live camera photos are allowed
    if (!isLiveCapture) {
      alert('❌ Gallery uploads are not allowed. Please use the live camera to capture the photo.');
      setStep('capture');
      handleRetake();
      return;
    }

    try {
      const citizenId = getCitizenId();
      const reportId  = `RPT-${Date.now()}`;

      // Step 1 — Upload photo
      setSubmitStep('uploading');
      await new Promise(r => setTimeout(r, 1000));
      const photoUrl = await uploadPhoto(capturedFile, citizenId, reportId);

      // Step 2 — Verify location
      setSubmitStep('verifying');
      await new Promise(r => setTimeout(r, 1000));
      const submittedLat = gps.lat;
      const submittedLng = gps.lng;

      // Calculate trust score
      setSubmitStep('calculating');
      await new Promise(r => setTimeout(r, 500));
      const verification = await verifyReport({
        file: capturedFile,
        submittedLat,
        submittedLng,
        digiPin,
        citizenId,
        isLiveCapture: true, // ALWAYS true because we enforce it above
      });

      // Step 3 — Build + save report
      setSubmitStep('sending');
      await new Promise(r => setTimeout(r, 500));
      const report: ReportPayload = {
        citizenId,
        reportId,
        timestamp:  Date.now(),
        status:     verification.status,
        trustScore: verification.trustScore,
        location: {
          submittedLat,
          submittedLng,
          exifLat:  exifData?.gps?.lat  ?? null,
          exifLng:  exifData?.gps?.lng  ?? null,
          digiPin,
          address:  gps
            ? `GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`
            : 'Delhi, India',
        },
        photo: {
          url:         photoUrl,
          hasExif:     exifData?.hasExif ?? false,
          cameraModel: exifData?.cameraModel ?? null,
          captureTime: exifData?.captureTime?.toISOString() ?? null,
        },
        report: {
          issueType:   selectedType,
          description,
          severity:    SEVERITY_MAP[selectedSeverity as keyof typeof SEVERITY_MAP]?.dbValue ?? selectedSeverity.toLowerCase(),
        },
        verification: verification.breakdown,
      };

      const saveResult = await saveReport(report, verification);

      if (saveResult.wrotePaths.length === 0) {
        alert('Report captured, but Firebase denied write access. Saved locally on this device as unsent report.');
      }

      setVerificationResult(verification);
      setSubmitStep('done');
      setStep('result');
    } catch (err) {
      console.error('[GreenLens] Report submission failed:', err);
      setSubmitStep('idle');
      alert('Report submission failed. Please check network/Firebase settings and try again.');
    }
  };

  // Pass trustScore back to App.tsx so it can calculate points
  const handleDoneFromResult = () => {
    onSubmit(verificationResult?.trustScore);
  };

  const isFormValid = selectedType !== '' && selectedSeverity !== '' && hasSharedLocation;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const GpsPill = () => {
    if (gpsStatus === 'loading') return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Loader2 size={10} className="animate-spin" /> Getting GPS...
      </span>
    );
    if (gpsStatus === 'ok' && gps) return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <MapPin size={10} /> {gps.lat.toFixed(4)}°N, {gps.lng.toFixed(4)}°E
      </span>
    );
    return (
      <button 
        onClick={requestGps}
        className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full hover:bg-orange-500/20 transition-colors font-medium cursor-pointer"
      >
        <AlertCircle size={12} /> Location access denied. Tap to retry
      </button>
    );
  };

  const submitLabel: Record<SubmitStep, string> = {
    idle:        'Submit Report',
    uploading:   '📤 Uploading photo...',
    verifying:   '🔍 Verifying location...',
    calculating: '📊 Calculating trust score...',
    sending:     '✅ Sending to DPCC...',
    done:        'Done!',
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Background — live camera or frozen preview */}
      <div className="absolute inset-0 bg-gray-900">
        {!cameraError ? (
          capturedDataUrl && step !== 'capture' ? (
            <img src={capturedDataUrl} alt="Captured" className="w-full h-full object-cover brightness-50 blur-sm" />
          ) : (
            <video
              ref={videoRef} autoPlay playsInline muted
              className={`w-full h-full object-cover transition-all duration-500 ${step !== 'capture' ? 'brightness-50 blur-sm' : ''}`}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <VideoOff size={48} className="mb-4 text-red-500" />
            <p className="font-semibold">
              {cameraErrorType === 'busy' ? 'Camera currently in use' : 'Camera access unavailable'}
            </p>
            <p className="text-sm mt-1 text-gray-500">{cameraErrorMessage || 'Please allow camera permission and try again.'}</p>
            <button
              onClick={startCamera}
              className="mt-4 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* ─── STEP: CAPTURE ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {step === 'capture' && (
          <div className="relative z-10 flex-1 flex flex-col justify-between p-6">
            {/* Top bar */}
            <div className="flex justify-between items-center">
              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-white tracking-widest">LIVE FEED</span>
              </div>
              <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/20">
                <X size={22} />
              </button>
            </div>

            {/* AR viewfinder */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64 border border-white/30 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 -mb-1 -mr-1" />
                {isProcessing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center flex-col gap-2">
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-white font-bold text-sm tracking-widest uppercase">Capturing...</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Bottom controls */}
            <div className="w-full flex flex-col items-center gap-4">
              <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                <GpsPill />
              </div>

              <p className="text-white/70 font-mono text-xs drop-shadow-md">
                {isProcessing ? 'Processing...' : 'Point at pollution source & tap'}
              </p>

              {/* Info pill — Camera only */}
              <div className="bg-green-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-green-300/40 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-xs font-medium text-green-100">📸 Live Camera Only</span>
              </div>

              {/* Shutter */}
              <motion.button
                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={handleSnap}
                disabled={isProcessing || cameraError}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-all disabled:opacity-50"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <Camera size={26} className="text-gray-700" />
                </div>
              </motion.button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── STEP: ANALYZING ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {step === 'analyze' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-bold text-lg">🔍 Analyzing photo...</p>
            <p className="text-white/60 text-sm">Extracting location & EXIF data</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STEP: DETAILS FORM ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {step === 'details' && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl z-20 shadow-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-4 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-3 shrink-0 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Report Incident</h2>
                <GpsPill />
              </div>
              <div className="flex items-center gap-2">
                {capturedDataUrl && (
                  <img src={capturedDataUrl} alt="Captured" className="w-11 h-11 rounded-lg object-cover border-2 border-green-300 shadow" />
                )}
                <div className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-semibold border border-green-200 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Photo ready
                </div>
              </div>
            </div>

            {/* EXIF Info banner */}
            {exifData && (
              <div className={`mx-5 mt-3 rounded-xl p-2.5 flex items-start gap-2 shrink-0 ${
                exifData.gps ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <MapPin size={13} className={exifData.gps ? 'text-green-600 mt-0.5' : 'text-amber-500 mt-0.5'} />
                <div className="flex-1 min-w-0">
                  {exifData.gps ? (
                    <p className="text-xs text-green-800 font-medium">
                      📍 Location from photo: {exifData.gps.lat.toFixed(4)}°N, {exifData.gps.lng.toFixed(4)}°E ✅
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium">⚠️ Using current GPS location instead</p>
                  )}
                  {exifData.cameraModel && (
                    <p className="text-xs text-gray-500 mt-0.5">📷 {exifData.cameraModel}</p>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3 space-y-4">

              {/* 0. Live Location */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Live Location</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {hasSharedLocation && gps
                        ? `Shared: ${gps.lat.toFixed(4)}°N, ${gps.lng.toFixed(4)}°E`
                        : 'Send current location to continue with scoring workflow'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareLiveLocation}
                    disabled={isSharingLocation || submitStep !== 'idle'}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      hasSharedLocation
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isSharingLocation ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                    {hasSharedLocation ? 'Location Sent' : 'Send Live Location'}
                  </button>
                </div>
              </div>

              {/* 1. Issue Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  What did you see? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {POLLUTION_TYPES.map(({ value, label, icon: Icon }) => {
                    const active = selectedType === value;
                    return (
                      <button key={value} onClick={() => setSelectedType(value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                          active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={15} className={active ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
                        <span className="text-xs leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Severity */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  How severe? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITY_LEVELS.map((level) => {
                    const { color } = SEVERITY_MAP[level];
                    const active = selectedSeverity === level;
                    const cMap = {
                      green:  { a: 'bg-green-100 border-green-500 text-green-800 ring-1 ring-green-400',  i: 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200' },
                      orange: { a: 'bg-orange-100 border-orange-500 text-orange-800 ring-1 ring-orange-400', i: 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-200' },
                      red:    { a: 'bg-red-100 border-red-500 text-red-800 ring-1 ring-red-400',           i: 'bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200' },
                    };
                    return (
                      <button key={level} onClick={() => setSelectedSeverity(level)}
                        className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center gap-0.5 ${active ? cMap[color].a : cMap[color].i}`}
                      >
                        {level === 'Severe' && <AlertTriangle size={13} className={active ? 'text-red-600' : 'text-gray-400'} />}
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Description <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what you see (e.g. Trucks dumping waste near school)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 text-gray-900 text-sm resize-none"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={13} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>📸 Live Camera Required:</strong> Your GPS location, photo metadata, and DigiPin (10-char grid code) are verified for authenticity. Only real-time camera captures are accepted to prevent gallery uploads.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 pt-2 pb-5 border-t border-gray-100 space-y-2 shrink-0">
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || submitStep !== 'idle'}
                className={`w-full text-white text-base font-bold py-3.5 rounded-xl shadow transition-all flex items-center justify-center gap-2 ${
                  !isFormValid || submitStep !== 'idle'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {submitStep !== 'idle' ? (
                  <><Loader2 size={18} className="animate-spin" /> {submitLabel[submitStep]}</>
                ) : (
                  <>Submit Report <Zap size={17} className={isFormValid ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'} /></>
                )}
              </button>

              {submitStep === 'idle' && (
                <button onClick={handleRetake}
                  className="w-full text-gray-400 font-medium py-1.5 text-sm hover:text-gray-700 transition-colors">
                  Retake Photo
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STEP: RESULT ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {step === 'result' && verificationResult && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl z-20 shadow-2xl"
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-4 mb-4" />
            <div className="px-6 pb-8 space-y-4">

              {/* Status header */}
              {verificationResult.status === 'verified' ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <ShieldCheck size={26} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Verification Complete!</p>
                    <p className="text-green-600 text-sm font-medium">✅ Report sent to DPCC Command Center</p>
                  </div>
                </div>
              ) : verificationResult.status === 'flagged' ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <ShieldAlert size={26} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Report Flagged</p>
                    <p className="text-amber-600 text-sm font-medium">⚠️ Sent for manual review</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <ShieldX size={26} className="text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Could Not Verify</p>
                    <p className="text-red-500 text-sm font-medium">
                      ❌ {verificationResult.details.rejectionReason === 'gallery_not_allowed' 
                         ? '📱 Only live camera photos allowed. Gallery uploads rejected for authenticity.'
                         : verificationResult.details.rejectionReason === 'gps_mismatch' ? '📍 Location mismatch — check your GPS or DigiPin'
                         : verificationResult.details.rejectionReason === 'rate_limit' ? '⏱️ Too many reports today. Try again tomorrow.'
                         : verificationResult.details.rejectionReason === 'invalid_image' ? '🖼️ Image too small or invalid format'
                         : '📊 Insufficient trust score'}
                    </p>
                  </div>
                </div>
              )}

              {/* Score breakdown */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck size={13} /> Verification Workflow
                </p>
                {[
                  { label: '1️⃣ GPS Match',      desc: 'Photo location vs submitted GPS', score: verificationResult.breakdown.gpsScore,       max: 30 },
                  { label: '2️⃣ DigiPin Match',  desc: '10-char grid code verification', score: verificationResult.breakdown.digiPinScore,    max: 40 },
                  { label: '3️⃣ Real Photo',     desc: 'Live camera confirmed (not gallery)', score: verificationResult.breakdown.exifScore,       max: 30 },
                ].map(({ label, desc, score, max }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center shrink-0">
                        {score > 0 ? <CheckCircle2 size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-gray-300" />}
                      </span>
                      <span className="text-sm text-gray-700 flex-1 font-medium">{label}</span>
                      <span className={`text-sm font-bold tabular-nums ${score > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {score}/{max}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">{desc}</p>
                  </div>
                ))}

                {/* Trust score bar */}
                <div className="pt-2 border-t border-gray-200 mt-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                      <Star size={13} className="text-yellow-500 fill-yellow-400" /> Trust Score
                    </span>
                    <span className="text-base font-extrabold text-gray-900">
                      {verificationResult.trustScore}/100
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${verificationResult.trustScore}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        verificationResult.trustScore >= 70 ? 'bg-green-500'
                        : verificationResult.trustScore >= 40 ? 'bg-amber-500'
                        : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Rejected (&lt;40)</span><span>Flagged (40-69)</span><span>Verified (≥70)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDoneFromResult}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Zap size={18} className="text-yellow-400 fill-yellow-400" />
                {verificationResult.status === 'verified' ? 'Claim Reward & View Report' : 'Done'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
