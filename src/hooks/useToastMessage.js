import { useState } from "react";
export default function useToastMessage() {
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
 const showNotice = (msg, duration = 5000) => {
  setToastMsg(msg);
  setShowToast(true);
  // allow CSS slide-out before hiding
  setTimeout(() => setShowToast(false), duration + 500);
};

return { toastMsg, showToast, showNotice, closeToast: () => setShowToast(false) };

}
