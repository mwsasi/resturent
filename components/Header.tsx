
import React from 'react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="bg-orange-600 text-white shadow-md no-print shrink-0">
      <div className="mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-white p-1 rounded text-orange-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
               <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
             </svg>
          </div>
          <h1 className="text-xs font-black tracking-tighter uppercase whitespace-nowrap leading-none">
            Supreme<br/><span className="text-orange-200">Food Court</span>
          </h1>
        </div>
        
        <nav className="flex space-x-1">
          {(['pos', 'admin', 'reports'] as ViewState[]).map(v => (
            <button 
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all ${currentView === v ? 'bg-orange-700 text-white shadow-inner' : 'hover:bg-orange-500/50 text-orange-100'}`}
            >
              {v}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
