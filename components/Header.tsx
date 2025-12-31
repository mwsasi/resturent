
import React from 'react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="bg-orange-600 text-white shadow-lg no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-white p-1 rounded-full text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">SpiceRoute</h1>
        </div>
        
        <nav className="flex space-x-1">
          <button 
            onClick={() => setView('pos')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${currentView === 'pos' ? 'bg-orange-700 text-white' : 'hover:bg-orange-500'}`}
          >
            POS
          </button>
          <button 
            onClick={() => setView('admin')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${currentView === 'admin' ? 'bg-orange-700 text-white' : 'hover:bg-orange-500'}`}
          >
            Manage Menu
          </button>
          <button 
            onClick={() => setView('reports')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${currentView === 'reports' ? 'bg-orange-700 text-white' : 'hover:bg-orange-500'}`}
          >
            Reports
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
