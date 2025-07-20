import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">VA</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Voice Agent Mastra Demo
              </h1>
              <p className="text-sm text-gray-500">
                Real-time AI voice assistant
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Voice Chat
            </Link>
            <Link 
              to="/sessions" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Sessions
            </Link>
            <Link 
              to="/settings" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Settings
            </Link>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">U</span>
            </div>
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 