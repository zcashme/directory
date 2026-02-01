import { useContext } from "react";
import { SelectionContext } from "./selection-provider";
import { EditsContext } from "./edits-provider";
import { MessagingContext } from "./messaging-provider";

export function useFeedback() {
  return {
    ...useContext(SelectionContext),
    ...useContext(EditsContext),
    ...useContext(MessagingContext),
  };
}

export default useFeedback;
