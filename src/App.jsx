import "./index.css";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Directory from "./Directory";
import { FeedbackProvider } from "./store";
import AdminRefundPage from "./components/AdminRefundPage";

// DEBUG: log all scroll calls
if (typeof window !== "undefined" && !window.__scrollDebugPatched) {
  window.__scrollDebugPatched = true;

  const origScrollTo = window.scrollTo.bind(window);
  window.scrollTo = function (...args) {
    console.log(
      "[SCROLL DEBUG] window.scrollTo called with:",
      args,
      "\nstack:\n",
      new Error().stack
    );
    return origScrollTo(...args);
  };

  const origScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args) {
    console.log(
      "[SCROLL DEBUG] scrollIntoView on:",
      this.id || this.className || this.tagName,
      "args:",
      args,
      "\nstack:\n",
      new Error().stack
    );
    return origScrollIntoView.apply(this, args);
  };
}

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
