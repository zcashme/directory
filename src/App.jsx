import "./index.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Directory from "./Directory";
import { FeedbackProvider } from "./store";
import AdminRefundPage from "./components/AdminRefundPage";
import TermsOfService from "./components/TermsOfService";
import PrivacyPolicy from "./components/PrivacyPolicy";

 

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
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route
        path="/admin/refunds"
        element={
          import.meta.env.DEV ? (
            <AdminRefundPage />
          ) : (
            <div className="p-6 text-red-600">Admin page only available in development.</div>
          )
        }
      />

        {/* Wildcard route: handles / and all slugs */}
        <Route
          path="/*"
          element={
            <Directory
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          }
        />
      </Routes>
    </FeedbackProvider>
  );
}

export default App;
