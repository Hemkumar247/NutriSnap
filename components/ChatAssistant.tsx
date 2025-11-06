import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import type { ChatMessage, ChatContext } from '../types';
import { BrandLogoIcon, ResetIcon, MicrophoneIcon, MicrophoneOffIcon } from './IconComponents';
import { startLiveConversation } from '../services/geminiService';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { LiveServerMessage, LiveSession } from '@google/genai';
import { soundService } from '../services/soundService';

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onAddLiveTurn: (userMessage: string, modelMessage: string) => void;
  isLoading: boolean;
  chatContext: ChatContext;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1 p-2">
    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
  </div>
);

const LiveStatus: React.FC<{ status: string }> = ({ status }) => (
    <div className="flex items-center justify-center text-center p-2 text-sm text-cyan-300 bg-cyan-900/30 rounded-full">
        <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></div>
        {status}
    </div>
);

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ isOpen, onClose, messages, onSendMessage, onAddLiveTurn, isLoading, chatContext }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Live session state
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [modelTranscript, setModelTranscript] = useState('');

  const sessionRef = useRef<LiveSession | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading, userTranscript, modelTranscript]);

  const cleanupLiveSession = useCallback(() => {
    console.log("Cleaning up live session...");
    // Stop microphone stream
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
  
    // Disconnect audio nodes
    scriptProcessorRef.current?.disconnect();
    streamSourceRef.current?.disconnect();
    scriptProcessorRef.current = null;
    streamSourceRef.current = null;

    // Close audio contexts
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;

    // Stop any playing audio
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // Reset state
    setIsLiveSessionActive(false);
    setIsConnecting(false);
    setUserTranscript('');
    setModelTranscript('');
    setMicError(null);
  }, []);

  const handleStopLiveSession = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    cleanupLiveSession();
    soundService.play('stop');
  }, [cleanupLiveSession]);

  const handleStartLiveSession = useCallback(async () => {
    if (isLiveSessionActive || isConnecting) return;
    setIsConnecting(true);
    setMicError(null);
    soundService.play('start');

    try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Fix: Added `as any` to `window` to handle vendor-prefixed `webkitAudioContext` for older Safari compatibility.
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        // Fix: Added `as any` to `window` to handle vendor-prefixed `webkitAudioContext` for older Safari compatibility.
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const sessionPromise = startLiveConversation({
            onMessage: async (message: LiveServerMessage) => {
                // Handle transcriptions
                if (message.serverContent?.inputTranscription) {
                    setUserTranscript(prev => prev + message.serverContent.inputTranscription.text);
                }
                if (message.serverContent?.outputTranscription) {
                    setModelTranscript(prev => prev + message.serverContent.outputTranscription.text);
                }
                // Handle turn completion
                if (message.serverContent?.turnComplete) {
                    const finalUser = userTranscript + (message.serverContent.inputTranscription?.text || '');
                    const finalModel = modelTranscript + (message.serverContent.outputTranscription?.text || '');
                    onAddLiveTurn(finalUser, finalModel);
                    setUserTranscript('');
                    setModelTranscript('');
                }

                // Handle audio playback
                const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (audioData && outputAudioContextRef.current) {
                    const outputCtx = outputAudioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    audioSourcesRef.current.add(source);
                }
            },
            onError: (e: ErrorEvent) => { 
                console.error('Live session error:', e);
                setMicError("A connection error occurred.");
                handleStopLiveSession();
            },
            onClose: (e: CloseEvent) => {
                console.log('Live session closed.');
                handleStopLiveSession();
            },
        }, chatContext);

        sessionRef.current = await sessionPromise;
        
        // Setup microphone input streaming
        const inputCtx = inputAudioContextRef.current;
        streamSourceRef.current = inputCtx.createMediaStreamSource(mediaStreamRef.current);
        scriptProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);
        
        scriptProcessorRef.current.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            // Must use promise to prevent race condition
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
        };

        streamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputCtx.destination);
        
        setIsConnecting(false);
        setIsLiveSessionActive(true);

    } catch (err) {
        console.error("Failed to start live session:", err);
        setMicError("Could not access microphone. Please check permissions.");
        cleanupLiveSession();
        soundService.play('stop');
    }
  }, [isLiveSessionActive, isConnecting, chatContext, onAddLiveTurn, cleanupLiveSession, handleStopLiveSession]);


  useEffect(() => {
    // Cleanup on component unmount or when modal is closed
    return () => {
      if (sessionRef.current) {
        handleStopLiveSession();
      }
    };
  }, [handleStopLiveSession]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      soundService.play('sent');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-slate-900/70 backdrop-blur-lg border border-cyan-300/20 rounded-2xl shadow-xl w-full max-w-lg h-[90vh] max-h-[700px] flex flex-col m-4 animate-fade-in">
        <header className="flex items-center justify-between p-4 border-b border-cyan-300/20">
          <div className="flex items-center">
            <BrandLogoIcon className="h-7 w-7 text-cyan-400 mr-2" />
            <h2 className="text-lg font-bold text-slate-100">AI Nutrition Assistant</h2>
          </div>
          <button 
              onClick={onClose}
              className="p-2 text-slate-400 rounded-full hover:bg-slate-700 hover:text-slate-200 transition-colors"
              aria-label="Close chat"
          >
              <ResetIcon className="w-5 h-5" />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <BrandLogoIcon className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-1" />}
              <div 
                className={`max-w-[80%] rounded-xl p-3 text-sm md:text-base shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-400 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-none'
                  }`}
              >
                 <div 
                    className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0 prose-a:text-cyan-400" 
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} 
                />
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-600/50">
                        <h4 className="text-xs font-bold text-slate-400 mb-1">Sources:</h4>
                        <ul className="text-xs space-y-1">
                            {msg.sources.map((source, i) => (
                                <li key={i} className="flex">
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="truncate text-cyan-400 hover:underline">
                                        {source.title || source.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-2.5">
                <BrandLogoIcon className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div className="max-w-[80%] rounded-xl p-3 bg-slate-800 text-slate-200 rounded-bl-none">
                    <TypingIndicator />
                </div>
            </div>
          )}
          {/* Live transcript preview */}
          {userTranscript && (
             <div className="flex items-start gap-2.5 justify-end">
                <div className="max-w-[80%] rounded-xl p-3 text-sm md:text-base shadow-sm bg-purple-600/50 text-slate-300 rounded-br-none italic">
                    {userTranscript}
                </div>
            </div>
          )}
          {modelTranscript && (
            <div className="flex items-start gap-2.5">
                <BrandLogoIcon className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div className="max-w-[80%] rounded-xl p-3 bg-slate-800/60 text-slate-300 rounded-bl-none italic">
                    {modelTranscript}
                </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        
        {micError && <p className="text-center text-sm text-red-400 p-2 mx-4 bg-red-900/30 rounded-md">{micError}</p>}
        
        <div className="p-4 border-t border-cyan-300/20">
            {isLiveSessionActive || isConnecting ? (
                <LiveStatus status={isConnecting ? "Connecting..." : "Listening..."} />
            ) : (
                <form onSubmit={handleSubmit}>
                <div className="relative">
                    <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a nutrition question..."
                    className="w-full pl-4 pr-24 py-3 bg-slate-800 border border-slate-600 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 placeholder:text-slate-500"
                    disabled={isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button 
                            type="button"
                            onClick={handleStartLiveSession}
                            className="p-2.5 text-slate-300 rounded-full hover:bg-slate-700 transition-colors"
                            aria-label="Start voice chat"
                        >
                            <MicrophoneIcon className="h-5 w-5" />
                        </button>
                        <button 
                            type="submit" 
                            className="p-2.5 bg-cyan-400 text-slate-900 rounded-full hover:bg-cyan-300 disabled:bg-slate-600 transition-all active:scale-90"
                            disabled={isLoading || !input.trim()}
                            aria-label="Send message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
                </form>
            )}
        </div>
        {isLiveSessionActive && (
            <div className="pb-4 text-center">
                <button 
                    onClick={handleStopLiveSession}
                    className="p-3 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-all active:scale-90 flex items-center gap-2 mx-auto"
                >
                    <MicrophoneOffIcon className="h-5 w-5" />
                    <span className="text-sm font-semibold">Stop Session</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
