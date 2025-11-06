import React, { useState, useEffect } from 'react';
import type { DailyLogItem, NutritionInfo } from '../types';

interface EditLogModalProps {
  item: DailyLogItem;
  onClose: () => void;
  onSave: (updatedItem: DailyLogItem) => void;
}

export const EditLogModal: React.FC<EditLogModalProps> = ({ item, onClose, onSave }) => {
  const [foodName, setFoodName] = useState(item.foodName);
  const [nutrition, setNutrition] = useState<NutritionInfo>(item.nutrition);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleNutritionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNutrition(prev => ({ ...prev, [name]: Number(value) >= 0 ? Number(value) : 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...item,
      foodName,
      nutrition,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      aria-labelledby="edit-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div className="relative bg-slate-900/70 backdrop-blur-lg border border-cyan-300/20 rounded-2xl shadow-xl w-full max-w-md m-4 animate-fade-in">
        <div className="p-6 border-b border-cyan-300/20">
          <h2 id="edit-modal-title" className="text-xl font-bold text-slate-100">Edit Meal Entry</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="foodName" className="block text-sm font-medium text-slate-400 mb-1">Food Name</label>
              <input 
                type="text" 
                id="foodName"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-400 focus:border-cyan-400 bg-slate-800 text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(nutrition).map((key) => (
                 <div key={key}>
                    <label htmlFor={key} className="block text-sm font-medium text-slate-400 mb-1 capitalize">{key} {key !== 'calories' && '(g)'}</label>
                    <input 
                      type="number" 
                      id={key}
                      name={key}
                      value={nutrition[key as keyof NutritionInfo]}
                      onChange={handleNutritionChange}
                      className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-400 focus:border-cyan-400 bg-slate-800 text-slate-200"
                    />
                  </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/50 p-4 flex justify-end space-x-3 rounded-b-2xl border-t border-cyan-300/20">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-full hover:bg-slate-600 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-semibold rounded-full hover:shadow-md hover:shadow-cyan-500/20 transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
