import React from 'react';
import { Routes, Route } from 'react-router-dom';
import VoiceAgent from './components/VoiceAgent';
import Header from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<VoiceAgent />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 