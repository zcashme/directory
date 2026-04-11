"use client";

import AddUserForm from "@/ui/signup/AddUserForm";
import { useJoinModal } from "@/ui/signup/JoinModalContext";

export default function JoinModal() {
  const { isJoinOpen, prefillUsername, prefillReferrer, closeJoin } = useJoinModal();

  return (
    <AddUserForm
      isOpen={isJoinOpen}
      prefillUsername={prefillUsername}
      prefillReferrer={prefillReferrer}
      onClose={closeJoin}
      onUserAdded={closeJoin}
    />
  );
}
