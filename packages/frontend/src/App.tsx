import { Routes, Route } from 'react-router-dom';
import VoiceAgent from './components/VoiceAgent';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Routes>
        <Route path="/" element={<VoiceAgent />} />
      </Routes>
    </div>
  );
}

export default App; 