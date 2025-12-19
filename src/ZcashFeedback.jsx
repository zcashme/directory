// ZcashFeedback.jsx with unified visual wrapper
import React, { useEffect } from "react";
import { useFeedback } from "./hooks/useFeedback";
import useFeedbackEvents from "./hooks/useFeedbackEvents";
import { ZcashFeedbackDraft, ZcashFeedbackVerify } from "./feedback";

function ZcashCardWrapper({ title, children }) {
  return (
    <div className="p-0 mt-4 bg-transparent shadow-none border-none rounded-none">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function ZcashFeedback() {
  const {
  mode,
  setMode,
  setForceShowQR,
  setVerifyId,
  selectedProfile,
} = useFeedback();
  useFeedbackEvents();

  useEffect(() => {
    console.log("ZcashFeedback mounted, mode:", mode);
  }, [mode]);

  useEffect(() => {
  const handler = () => {
    setMode("note");
    setForceShowQR(false);
  };
  window.addEventListener("forceFeedbackNoteMode", handler);
  return () => window.removeEventListener("forceFeedbackNoteMode", handler);
}, [setMode, setForceShowQR]);


  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="relative">
          <button
            id="draft-button"
            onClick={() => {
              setMode("note");
              document.getElementById("zcash-feedback")?.scrollIntoView({ behavior: "smooth" });
              window.dispatchEvent(new CustomEvent("closeDirectory"));
            }}
            className={`relative text-white rounded-full w-14 h-14 shadow-lg text-lg font-bold transition-all duration-300 ${
              mode === "note" ? "opacity-100 scale-100" : "opacity-70 scale-90"
            } bg-blue-600 hover:bg-blue-700 animate-pulse-slow`}
            title="Draft a memo"
          >
            ✎
          </button>
        </div>
      </div>

      <div id="zcash-feedback" className="border-t mt-10 pt-6 text-center">
<div className="flex justify-center items-center mb-1 relative -mt-7">
          <div className="inline-flex border border-gray-300 rounded-full overflow-hidden text-sm shadow-sm bg-white relative -top-3 z-10">
            <button
              onClick={() => {
                setMode("note");
                setForceShowQR(false);
                window.dispatchEvent(new CustomEvent("enterDraftMode"));
              }}
              className={`px-3 py-1 font-medium transition-colors ${
                mode === "note" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              ✎ Draft
            </button>

            <button
              onClick={() => {
                if (selectedProfile?.zId) setVerifyId(selectedProfile.zId);
                setMode("signin");
                setForceShowQR(true);
setTimeout(() => {
  // If Return-to-Front was pressed, cancel the scroll
  if (window.skipZcashFeedbackScroll) {
    window.skipZcashFeedbackScroll = false; // reset flag
    return;
  }

  document.getElementById("zcash-feedback")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}, 150);

                window.dispatchEvent(new CustomEvent("enterSignInMode"));
              }}
              className={`px-3 py-1 font-medium transition-colors ${
                mode === "signin" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-100"
              }`}
            >
               ⛊ Verify 
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center bg-transparent border-none shadow-none">
          <div className="w-full max-w-xl mt-[-9px]">
            {mode === "signin" ? (
<ZcashCardWrapper
  title={
    <div
      className="
        w-full
        border
        rounded-xl
        px-4
        py-3
        bg-transparent
        text-center
        border-[#000000]/90
      "
      style={{ lineHeight: "1.2" }}
    >
      <div className="font-semibold text-[15px] text-gray-800 flex items-center justify-center gap-1">
        Request One-Time Passcode
        
      </div>

      <div className="text-[13px] text-gray-600 mt-1 font-light">
        to verify your address or approve changes
      </div>
    </div>
  }
>
  <ZcashFeedbackVerify />
</ZcashCardWrapper>

            ) : (
              <ZcashCardWrapper>
                <ZcashFeedbackDraft />
              </ZcashCardWrapper>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulseSlow 2.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
