import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Sparkles, User, RefreshCw, Mic, Volume2, Square, MicOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI } from "@google/genai";

interface VayuMitraModalProps {
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Browser Speech Recognition Type Support
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VayuMitraModal: React.FC<VayuMitraModalProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Namaste! I am Vayu Mitra 🤖. I monitor real-time air quality in your ward. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Stop after one sentence
        recognitionRef.current.interimResults = true; // Show results while speaking
        recognitionRef.current.lang = 'en-IN'; // Default to Indian English

        recognitionRef.current.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result) => result.transcript)
                .join('');
            setInputValue(transcript);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert("Microphone access denied. Please enable permissions in your browser settings.");
            }
        };
    }
    
    // Cleanup speech synthesis on unmount
    return () => {
        window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
        return;
    }

    if (isListening) {
        try {
            recognitionRef.current.stop();
        } catch(e) { console.warn("Error stopping recognition", e); }
        setIsListening(false);
    } else {
        setInputValue('');
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch (e) {
            console.error("Error starting recognition", e);
            // If already started or other error, try to restart gracefully
            try {
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            } catch(retryError) {
                setIsListening(false);
            }
        }
    }
  };

  const speakText = (text: string, id: string) => {
    if (speakingMessageId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        return;
    }

    window.speechSynthesis.cancel(); // Stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.pitch = 1;
    utterance.rate = 1;
    
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    
    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
        // 2. Call Gemini API
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: text,
            config: {
                systemInstruction: "You are Vayu Mitra, a friendly and knowledgeable AI assistant for the Delhi Air Quality Citizen Portal. Your goal is to help citizens stay safe from pollution. You provide advice on health, masks (N95/N99), schooling (GRAP stages), and safe commuting (Delhi Metro). Keep your responses concise (max 2-3 sentences), helpful, and empathetic. Use relevant emojis. If asked about specific real-time AQI numbers for a location, explain you are an AI assistant and they should check the main dashboard for the latest sensor readings, but give general advice based on typical Delhi pollution scenarios.",
            }
        });

        const responseText = response.text || "I'm having trouble connecting to the airwaves right now. Please try again.";

        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: responseText,
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);

        // Optional: Auto-speak response if needed (disabled by default for UX)
        // speakText(responseText, botMsg.id);

    } catch (error) {
        console.error("AI Error:", error);
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: "My sensors are a bit clogged (Network Error). Please check your connection and try again.",
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  const QuickPrompt = ({ text }: { text: string }) => (
    <button 
      onClick={() => handleSend(text)}
      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-2 rounded-full border border-blue-200 transition-colors whitespace-nowrap"
    >
      {text}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      {/* Modal Content */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white/95 backdrop-blur-xl w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl h-[85vh] sm:h-[600px] flex flex-col pointer-events-auto relative overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-navy to-blue-900 p-4 flex items-center justify-between shadow-md z-10">
           <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-full border border-white/20 relative">
                  <Bot className="text-white" size={24} />
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gov-navy animate-pulse"></div>
              </div>
              <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Vayu Mitra 🤖</h2>
                  <p className="text-blue-200 text-xs font-medium">AI Assistant • Voice Enabled 🎙️</p>
              </div>
           </div>
           <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors">
               <X size={24} />
           </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
           {messages.map((msg) => (
             <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
             >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm relative group ${
                    msg.sender === 'user' 
                    ? 'bg-gov-navy text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                }`}>
                    <p className="text-sm leading-relaxed pr-6">{msg.text}</p>
                    
                    <span className={`text-[10px] mt-1 block opacity-60 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>

                    {/* Text-to-Speech Button for Bot */}
                    {msg.sender === 'bot' && (
                        <button 
                            onClick={() => speakText(msg.text, msg.id)}
                            className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
                                speakingMessageId === msg.id 
                                ? 'bg-blue-100 text-blue-600 animate-pulse' 
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                            title="Read Aloud"
                        >
                            {speakingMessageId === msg.id ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                        </button>
                    )}
                </div>
             </motion.div>
           ))}
           
           {isTyping && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                   <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                       <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                   </div>
               </motion.div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-gray-50/50 border-t border-gray-100">
            <QuickPrompt text="Is it safe to jog?" />
            <QuickPrompt text="Should I wear a mask?" />
            <QuickPrompt text="School updates?" />
            <QuickPrompt text="Ventilation time?" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
            <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                className="flex items-center gap-2"
            >
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Ask Vayu Mitra..."}
                        className={`w-full bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-full pl-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm ${isListening ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
                    />
                    
                    {/* Microphone Button inside Input */}
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                            isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-gov-navy'
                        }`}
                        title="Speak to type"
                    >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                </div>

                <button 
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-gov-navy text-white p-3 rounded-full hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
      </motion.div>
    </div>
  );
};