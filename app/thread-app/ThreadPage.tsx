"use client";

import { useState, useEffect } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { useThreadStore } from "@/lib/stores/thread";
import { getSession } from "@/lib/supabase/auth";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import MessageComposer from "@/ui/thread/MessageComposer";
import MessageFeed from "@/ui/thread/MessageFeed";
import ThreadOtpFlow from "@/ui/thread/ThreadOtpFlow";
import { ThreadMessageWithProfile } from "@/lib/thread/types";
import type { Profile } from "@/lib/profile/types";

interface ThreadPageProps {
  initialMessages: ThreadMessageWithProfile[];
}

export default function ThreadPage({ initialMessages }: ThreadPageProps) {
  const {
    messageComposition,
    verifyQrEnabled,
    isOtpFormOpen,
    setIsOtpFormOpen,
    clearMessageComposition,
    setVerifyQrEnabled,
  } = useThreadStore();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessageAdded, setNewMessageAdded] = useState(false);

  // Load current user from session
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data, error: authError } = await getSession();
        if (authError || !data?.session?.user?.email) {
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        // Extract username from email (before @)
        const email = data.session.user.email;
        const username = email.split("@")[0];

        // Fetch profile for this user
        const profile = await fetchProfileForSlug(username);
        if (profile) {
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Error loading current user:", err);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const handleMessageSuccess = () => {
    // Clear composer
    clearMessageComposition();
    setVerifyQrEnabled(false);
    setIsOtpFormOpen(false);

    // Mark that a new message was added (triggers MessageFeed refresh)
    setNewMessageAdded(!newMessageAdded);

    // Show success message
    setTimeout(() => {
      alert("Your message has been posted!");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ backgroundColor: 'var(--color-background)' }}>
      <ProfileHeader profileCount={0} />
      {/* Header */}
      <div className="border-b border-gray-200 bg-white pt-24">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Thread</h1>
          <p className="mt-2 text-gray-600">
            A public message board where Zcash users can share thoughts and connect with the community.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Composer section (only if logged in) */}
        {!isLoading && currentUser && (
          <div className="mb-8 bg-white rounded-lg shadow p-6 border border-gray-200">
            <MessageComposer profile={currentUser} />
          </div>
        )}

        {/* Verification flow section (shown when composing) */}
        {verifyQrEnabled && currentUser && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Verification</h3>
              <p className="text-sm text-gray-700">
                Follow the steps to verify and publish your message.
              </p>
            </div>
            <ThreadOtpFlow zcasherId={currentUser.id} onSuccess={handleMessageSuccess} />
          </div>
        )}

        {/* Prompt to login */}
        {!isLoading && !currentUser && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-gray-800 mb-3">
              <span className="font-semibold">Want to share your thoughts?</span> Create or log into your Zcash profile to post a message.
            </p>
            <a
              href="/create-profile"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Get Started
            </a>
          </div>
        )}

        {/* Messages feed */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
            <MessageFeed
              initialMessages={initialMessages}
              onNewMessage={newMessageAdded}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
