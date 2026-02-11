import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RoomJoin from './pages/RoomJoin';
import Room from './pages/Room';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoomJoin />} />
        <Route path="/room/:roomCode" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
