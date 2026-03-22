import React from 'react';
import { ChatIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface ChatButtonProps {
  onClick: () => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={() => {
        onClick();
        soundService.play('start');
      }}
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 p-0 text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 ease-in-out hover:scale-110 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 active:scale-100"
      aria-label="Open Nutrition AI Assistant"
    >
      <ChatIcon className="w-8 h-8" />
    </button>
  );
};
