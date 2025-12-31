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

      <div id="zcash-feedback" className="border-t mt-10 pt-6 text-center">
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
        Request One-Time Passcode (OTP)
      </div>

      <div className="text-[13px] text-gray-600 mt-1 font-light">
        to verify address or apply changes
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
    </>
  );
}
