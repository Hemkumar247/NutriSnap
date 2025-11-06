import React, { useState, useEffect } from 'react';
import type { NutritionInfo } from '../types';
import { PencilIcon, CheckIcon } from './IconComponents';

interface GoalsProps {
  goals: NutritionInfo;
  onSave: (newGoals: NutritionInfo) => void;
}

export const Goals: React.FC<GoalsProps> = ({ goals, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableGoals, setEditableGoals] = useState(goals);

  useEffect(() => {
    setEditableGoals(goals);
  }, [goals]);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableGoals(prev => ({ ...prev, [name]: Number(value) >= 0 ? Number(value) : 0 }));
  };

  const handleSave = () => {
    onSave(editableGoals);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <div className="mb-6 bg-slate-800/40 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-lg text-slate-200">Daily Goals</h4>
        {isEditing ? (
          <button 
            onClick={handleSave} 
            className="p-2 rounded-full text-cyan-400 hover:bg-cyan-400/10"
            aria-label="Save goals"
          >
            <CheckIcon className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={handleEdit} 
            className="p-2 rounded-full text-slate-400 hover:bg-slate-700"
            aria-label="Edit goals"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm items-center">
        {Object.entries(editableGoals).map(([key, value]) => (
          <React.Fragment key={key}>
            <div className="font-semibold text-slate-300 capitalize">{key}:</div>
            {isEditing ? (
              <input
                type="number"
                name={key}
                value={value}
                onChange={handleGoalChange}
                className="w-full px-2 py-1 text-right bg-slate-700 text-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 text-base"
              />
            ) : (
              <div className="text-right font-bold text-slate-100 px-2 py-1">{value}{key !== 'calories' ? 'g' : ''}</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
