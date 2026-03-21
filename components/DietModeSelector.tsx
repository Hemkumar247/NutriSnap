import React from 'react';

type DietMode = 'maintenance' | 'loss' | 'gain';

interface DietModeSelectorProps {
  currentMode: DietMode;
  onModeChange: (mode: DietMode) => void;
}

const MODES: { id: DietMode; label: string }[] = [
  { id: 'loss', label: 'Loss' },
  { id: 'maintenance', label: 'Maintain' },
  { id: 'gain', label: 'Gain' },
];

export const DietModeSelector: React.FC<DietModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="mb-6">
      <h4 className="font-bold text-lg text-slate-200 mb-3">Your Goal</h4>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`text-center p-2 rounded-full border-2 transition-all duration-200 active:scale-95 text-sm font-semibold
              ${currentMode === mode.id 
                ? 'bg-cyan-400 border-cyan-400 text-slate-900 shadow-md shadow-cyan-500/20' 
                : 'bg-transparent border-slate-600 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300'
              }`
            }
            aria-pressed={currentMode === mode.id}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
};
