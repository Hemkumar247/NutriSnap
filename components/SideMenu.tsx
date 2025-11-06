import React from 'react';
import { HistoryIcon, ChartBarIcon, ChevronDoubleLeftIcon, LayoutGridIcon, TrendingUpIcon } from './IconComponents';
import { soundService } from '../services/soundService';
import { AppView } from '../types';

interface SideMenuProps {
    isCollapsed: boolean;
    activeView: AppView;
    onToggle: () => void;
    onNavClick: (view: AppView) => void;
    onHistoryClick: () => void;
    onReportClick: () => void;
}

const NavItem: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; isCollapsed: boolean; isActive?: boolean; }> = ({ label, onClick, children, isCollapsed, isActive }) => {
    const buttonContent = (
         <button
            onClick={onClick}
            className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200 ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-inset ring-cyan-400/50' : 'text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300'}`}
            aria-label={label}
        >
            {children}
            <span className={`ml-4 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                {label}
            </span>
        </button>
    );

    if (isCollapsed) {
        return (
            <div className="group relative flex justify-center">
                {buttonContent}
                <span className="absolute left-full ml-4 w-auto min-w-max px-3 py-1.5 bg-slate-900 text-slate-200 text-sm font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    {label}
                </span>
            </div>
        );
    }
    
    return buttonContent;
};


export const SideMenu: React.FC<SideMenuProps> = ({ isCollapsed, activeView, onToggle, onNavClick, onHistoryClick, onReportClick }) => {
  return (
    <aside className={`fixed top-0 left-0 h-screen bg-slate-900/50 backdrop-blur-lg border-r border-cyan-300/10 z-40 flex flex-col p-2 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Toggle Button */}
        <button 
            onClick={onToggle} 
            className="absolute -right-3 top-9 bg-slate-800 text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-300 w-6 h-6 rounded-full border-2 border-slate-700 flex items-center justify-center transition-transform duration-300"
            aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
        >
            <ChevronDoubleLeftIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Navigation */}
        <nav className="flex flex-col items-center space-y-2 mt-8">
            <NavItem label="Dashboard" onClick={() => onNavClick('dashboard')} isCollapsed={isCollapsed} isActive={activeView === 'dashboard'}>
                <LayoutGridIcon className="w-6 h-6 flex-shrink-0" />
            </NavItem>
            <NavItem label="Deep Analysis" onClick={() => onNavClick('analysis')} isCollapsed={isCollapsed} isActive={activeView === 'analysis'}>
                <TrendingUpIcon className="w-6 h-6 flex-shrink-0" />
            </NavItem>
            <NavItem label="Analytics Report" onClick={onReportClick} isCollapsed={isCollapsed}>
                <ChartBarIcon className="w-6 h-6 flex-shrink-0" />
            </NavItem>
            <NavItem label="Food History" onClick={onHistoryClick} isCollapsed={isCollapsed}>
                <HistoryIcon className="w-6 h-6 flex-shrink-0" />
            </NavItem>
        </nav>
        
        {/* User Profile Footer */}
        <div className="mt-auto w-full p-2">
            <div className={`flex items-center p-2 bg-slate-800/50 rounded-lg overflow-hidden transition-all duration-300`}>
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">
                    HK
                </div>
                <div className={`ml-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <p className="font-semibold text-sm text-slate-100 whitespace-nowrap">Hem Kumar</p>
                    <p className="text-xs text-slate-400 whitespace-nowrap cursor-pointer hover:text-cyan-400">Account</p>
                </div>
            </div>
        </div>
    </aside>
  );
};
