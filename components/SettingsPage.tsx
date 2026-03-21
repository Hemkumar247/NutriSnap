import React, { useState } from 'react';
import { AppSettings } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { soundService } from '../services/soundService';

interface SettingsPageProps {
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    onExportData: () => void;
    onClearData: () => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; }> = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
        <span className="font-medium text-slate-200">{label}</span>
        <button
            role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-cyan-400' : 'bg-slate-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}/>
        </button>
    </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdateSettings, onExportData, onClearData }) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const handleThemeChange = (isDark: boolean) => {
        onUpdateSettings({ ...settings, theme: isDark ? 'dark' : 'light' });
        soundService.play('click');
    };

    const handleUnitsChange = (isMetric: boolean) => {
        onUpdateSettings({ ...settings, units: isMetric ? 'metric' : 'imperial' });
        soundService.play('click');
    };
    
    const handleClearDataConfirm = () => {
        onClearData();
        setIsConfirmOpen(false);
        soundService.play('stop');
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
            <div className="corner-box">
                <h3 className="text-xl font-bold text-cyan-300 mb-4">Appearance</h3>
                <div className="space-y-4">
                    <ToggleSwitch label="Dark Mode" checked={settings.theme === 'dark'} onChange={handleThemeChange} />
                </div>
            </div>

            <div className="corner-box">
                <h3 className="text-xl font-bold text-cyan-300 mb-4">Units</h3>
                 <div className="flex bg-slate-800/50 p-1 rounded-full">
                    <button
                        onClick={() => handleUnitsChange(true)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all w-1/2 ${settings.units === 'metric' ? 'bg-slate-700 text-cyan-300' : 'text-slate-400'}`}
                    >Metric (kg, cm)</button>
                    <button
                        onClick={() => handleUnitsChange(false)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all w-1/2 ${settings.units === 'imperial' ? 'bg-slate-700 text-cyan-300' : 'text-slate-400'}`}
                    >Imperial (lbs, ft)</button>
                </div>
            </div>

            <div className="corner-box">
                <h3 className="text-xl font-bold text-cyan-300 mb-4">Data Management</h3>
                <div className="space-y-4">
                    <button onClick={onExportData} className="w-full text-center px-5 py-2.5 bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-full hover:bg-slate-600 transition-all active:scale-95">
                        Export My Data
                    </button>
                    <button onClick={() => setIsConfirmOpen(true)} className="w-full text-center px-5 py-2.5 bg-red-900/40 border border-red-500/30 text-red-400 font-semibold rounded-full hover:bg-red-900/60 transition-all active:scale-95">
                        Clear All Data
                    </button>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleClearDataConfirm}
                title="Clear All Data?"
                message="This action is irreversible. All your logged meals, goals, and preferences will be permanently deleted."
            />
        </div>
    );
};
