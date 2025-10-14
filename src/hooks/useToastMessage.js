import { useState } from "react";
export default function useToastMessage() {
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const showNotice = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
  };
  return { toastMsg, showToast, showNotice, closeToast: () => setShowToast(false) };
}
