import { useState, type Dispatch, type SetStateAction } from "react";

interface UseProfileEventsResult {
  showBack: boolean;
  setShowBack: Dispatch<SetStateAction<boolean>>;
}

export default function useProfileEvents(): UseProfileEventsResult {
  const [showBack, setShowBack] = useState(false);
  return { showBack, setShowBack };
}
