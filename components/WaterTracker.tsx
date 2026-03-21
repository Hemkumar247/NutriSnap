import React, { useState, useEffect } from 'react';
import { ProgressBar } from './ProgressBar';
import { WaterDropIcon, MinusIcon, AddIcon, PencilIcon, CheckIcon } from './IconComponents';

interface WaterTrackerProps {
  current: number;
  goal: number;
  onLog: (amount: number) => void;
  onUpdateGoal: (newGoal: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({ current, goal, onLog, onUpdateGoal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableGoal, setEditableGoal] = useState(goal);

  useEffect(() => {
    // Sync local state if prop changes from outside, but only when not editing
    if (!isEditing) {
      setEditableGoal(goal);
    }
  }, [goal, isEditing]);

  const handleSave = () => {
    if (editableGoal > 0) {
      onUpdateGoal(editableGoal);
    }
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <div className="mb-6 bg-slate-800/40 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-lg text-slate-200 flex items-center">
          <WaterDropIcon className="w-5 h-5 mr-2 text-cyan-400" />
          Water Intake
        </h4>
        {isEditing ? (
          <button 
            onClick={handleSave} 
            className="p-2 rounded-full text-cyan-400 hover:bg-cyan-400/10"
            aria-label="Save water goal"
          >
            <CheckIcon className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={handleEdit} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-700"
            aria-label="Edit water goal"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center text-sm mb-1.5">
          <span className="font-semibold text-slate-300">
              Current: <span className="font-bold text-slate-100">{current} ml</span>
          </span>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-300">Goal:</span>
            {isEditing ? (
              <input
                type="number"
                value={editableGoal}
                onChange={(e) => setEditableGoal(Number(e.target.value))}
                className="w-24 px-2 py-1 text-right bg-slate-700 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                step="50"
                min="0"
              />
            ) : (
              <span className="font-bold text-slate-100">{goal} ml</span>
            )}
          </div>
      </div>
      
      <ProgressBar value={current} goal={goal} gradient="from-blue-400 to-cyan-400" />
      
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          onClick={() => onLog(-250)}
          className="flex items-center justify-center p-2 rounded-full border-2 transition-all duration-200 active:scale-95 bg-transparent border-slate-600 text-slate-300 hover:border-red-500/50 hover:text-red-400"
          aria-label="Remove one glass (250ml)"
        >
          <MinusIcon className="w-4 h-4" />
          <span className="ml-1 text-xs">Glass</span>
        </button>
        <button
          onClick={() => onLog(250)}
          className="flex items-center justify-center p-2 rounded-full border-2 transition-all duration-200 active:scale-95 bg-transparent border-slate-600 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300"
          aria-label="Add one glass (250ml)"
        >
          <AddIcon className="w-4 h-4" />
          <span className="ml-1 text-xs">Glass</span>
        </button>
        <button
          onClick={() => onLog(500)}
          className="flex items-center justify-center p-2 rounded-full border-2 transition-all duration-200 active:scale-95 bg-transparent border-slate-600 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300"
          aria-label="Add one bottle (500ml)"
        >
          <AddIcon className="w-4 h-4" />
          <span className="ml-1 text-xs">Bottle</span>
        </button>
      </div>
    </div>
  );
};