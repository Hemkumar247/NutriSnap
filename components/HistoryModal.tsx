import React, { useState, useMemo, useEffect } from 'react';
import type { DailyLogItem } from '../types';
import { ResetIcon, PencilIcon, TrashIcon, FoodIcon } from './IconComponents';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLogItem[];
  onEdit: (item: DailyLogItem) => void;
  onDelete: (itemId: string) => void;
  onViewDetails: (item: DailyLogItem) => void;
}

const formatDateGroup = (dateStr: string): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(dateStr);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const groupLogByDate = (log: DailyLogItem[]): Record<string, DailyLogItem[]> => {
  return log.reduce((acc, item) => {
    const dateKey = item.timestamp.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, DailyLogItem[]>);
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, log, onEdit, onDelete, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setConfirmDeleteId(null);
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLog = useMemo(() => {
    if (!searchTerm.trim()) return log;
    return log.filter(item =>
      item.foodName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [log, searchTerm]);

  const groupedLog = useMemo(() => groupLogByDate(filteredLog), [filteredLog]);
  const sortedDateKeys = useMemo(() => Object.keys(groupedLog).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), [groupedLog]);

  if (!isOpen) return null;

  const handleEditClick = (item: DailyLogItem) => {
    onClose(); // Close history modal to open edit modal
    onEdit(item);
  };

  const handleDelete = (itemId: string) => {
    onDelete(itemId);
    setConfirmDeleteId(null);
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true"></div>
      <div className="relative bg-slate-900/70 backdrop-blur-lg border border-cyan-300/20 rounded-2xl shadow-xl w-full max-w-2xl h-[90vh] flex flex-col m-4 animate-fade-in">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-cyan-300/20">
          <h2 className="text-xl font-bold text-slate-100">Food Log History</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 rounded-full hover:bg-slate-700"
            aria-label="Close history"
          >
            <ResetIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Search Bar */}
        <div className="flex-shrink-0 p-4 border-b border-cyan-300/20">
          <input
            type="text"
            placeholder="Search by food name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto">
          {sortedDateKeys.length > 0 ? (
            sortedDateKeys.map(dateKey => (
              <div key={dateKey}>
                <h3 className="text-lg font-semibold bg-slate-800/50 text-slate-200 p-3 sticky top-0 backdrop-blur-sm">
                  {formatDateGroup(dateKey)}
                </h3>
                <div className="divide-y divide-slate-700/50">
                  {groupedLog[dateKey].map(item => (
                    <div key={item.id} className="p-4 hover:bg-slate-800/50 transition-colors duration-200">
                      <div className="flex items-center space-x-4 cursor-pointer" onClick={() => onViewDetails(item)}>
                        {item.imageUrl ? (
                           <img src={item.imageUrl} alt={item.foodName} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-700" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
                            <FoodIcon className="w-8 h-8 text-slate-400"/>
                          </div>
                        )}
                        <div className="flex-grow">
                          <p className="font-bold text-slate-100">{item.foodName}</p>
                          <p className="text-sm text-slate-400">
                            {Math.round(item.nutrition.calories)} cal &bull; {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                           {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-2">
                               <button onClick={() => handleDelete(item.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded-full hover:bg-red-600">Delete</button>
                               <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1 text-sm bg-slate-600 rounded-full hover:bg-slate-500">Cancel</button>
                            </div>
                           ) : (
                             <>
                              <button onClick={() => handleEditClick(item)} className="p-2 text-slate-400 hover:text-cyan-400 rounded-full hover:bg-slate-700" aria-label="Edit">
                                <PencilIcon className="w-5 h-5" />
                              </button>
                              <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-900/40" aria-label="Delete">
                                <TrashIcon className="w-5 h-5" />
                              </button>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-10 text-slate-400">
              <h3 className="text-xl font-semibold mb-2">No Meals Found</h3>
              <p>{searchTerm ? 'Try a different search term.' : 'Your food log is empty. Analyze a meal to begin!'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
