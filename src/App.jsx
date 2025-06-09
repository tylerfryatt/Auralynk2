import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ClientDashboard from "./dashboards/ClientDashboard";
import ReaderDashboard from "./dashboards/ReaderDashboard";
import BookingPage from "./pages/BookingPage";
import SessionPage from "./pages/SessionPage";
import AuthPage from "./AuthPage"; // ✅ this is your original login
import HomePage from "./pages/HomePage"; // optional homepage

const App = () => {
  return (
    <div className="glass-card max-w-3xl mx-auto p-6 mt-8">
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/reader" element={<ReaderDashboard />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/session/:bookingId" element={<SessionPage />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
