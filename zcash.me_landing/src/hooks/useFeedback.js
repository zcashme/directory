import { useContext } from "react";
import { FeedbackContext } from "../feedback-context";

export function useFeedback() {
  return useContext(FeedbackContext);
}

export default useFeedback;
