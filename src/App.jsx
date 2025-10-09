import "./index.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ZcashProfile from "./ZcashProfile";
import Directory from "./Directory";
import { FeedbackProvider } from "./store";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // 🧠 When user types in search bar, go back to the main directory view
  useEffect(() => {
    if (searchQuery.trim() !== "") {
      navigate("/"); // ensures the directory view shows
    }
  }, [searchQuery, navigate]);

  return (
    <FeedbackProvider>
      <Routes>
        {/* Root route: directory view, passes search control */}
        <Route
          path="/"
          element={
            <Directory
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          }
        />
        {/* Profile route */}
        <Route path="/:slug" element={<ZcashProfile />} />
      </Routes>
    </FeedbackProvider>
  );
}

export default App;
