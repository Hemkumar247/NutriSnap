import React, { useEffect } from 'react';
import { AlertTriangleIcon } from './IconComponents';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            role="dialog" aria-modal="true"
        >
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true"></div>
            <div className="relative bg-slate-900/70 backdrop-blur-lg border border-red-500/30 rounded-2xl shadow-xl w-full max-w-sm m-4 animate-fade-in">
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20 mb-4">
                        <AlertTriangleIcon className="h-6 w-6 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">{title}</h3>
                    <div className="mt-2">
                        <p className="text-sm text-slate-400">{message}</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 p-4 flex justify-center space-x-3 rounded-b-2xl border-t border-red-500/20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-full hover:bg-slate-600 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-all active:scale-95"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
