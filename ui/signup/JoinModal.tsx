"use client";

import AddUserForm from "@/ui/signup/AddUserForm";
import { useJoinModal } from "@/ui/signup/JoinModalContext";
import { buildSlug } from "@/lib/profile/profileUtils";

export default function JoinModal() {
  const { isJoinOpen, prefillUsername, prefillReferrer, prefillReferrerId, closeJoin, notifyCreated } = useJoinModal();

  return (
    <AddUserForm
      isOpen={isJoinOpen}
      prefillUsername={prefillUsername}
      prefillReferrer={prefillReferrer}
      prefillReferrerId={prefillReferrerId}
      onClose={closeJoin}
      onUserAdded={(profile) => notifyCreated(buildSlug(profile))}
    />
  );
}
