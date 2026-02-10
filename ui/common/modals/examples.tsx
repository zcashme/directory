/**
 * Modal Component Examples
 *
 * This file contains example implementations of the modal components.
 * These are for reference only and should not be imported in production code.
 */

"use client";

import { useState } from "react";
import Modal from "./Modal";
import ModalHeader from "./ModalHeader";
import ModalBody from "./ModalBody";
import ModalFooter from "./ModalFooter";
import ConfirmDialog from "./ConfirmDialog";
import Button from "@/ui/common/buttons/Button";
import Input from "@/ui/common/forms/Input";

// Example 1: Basic Modal
export function BasicModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="md">
        <ModalHeader title="Welcome!" onClose={() => setIsOpen(false)} />
        <ModalBody>
          <p>This is a basic modal with header, body, and footer.</p>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// Example 2: Form Modal
export function FormModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    console.log("Submitted:", { name, email });
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Edit Profile</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
        <ModalHeader title="Edit Profile" onClose={() => setIsOpen(false)} />
        <ModalBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input
              value={name}
              onChange={setName}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// Example 3: Danger Confirmation
export function DeleteConfirmExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Item deleted");
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete Item
      </Button>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}

// Example 4: Warning Dialog
export function WarningDialogExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Leave Page</Button>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          console.log("Leaving without saving");
          setIsOpen(false);
        }}
        title="Unsaved Changes"
        message={
          <div>
            <p>You have unsaved changes that will be lost.</p>
            <p className="mt-2">Do you want to continue without saving?</p>
          </div>
        }
        variant="warning"
        confirmText="Leave Without Saving"
        cancelText="Go Back"
      />
    </>
  );
}

// Example 5: Non-dismissible Modal
export function ProcessingModalExample() {
  const [isProcessing, setIsProcessing] = useState(false);

  const startProcessing = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 3000);
  };

  return (
    <>
      <Button onClick={startProcessing}>Start Processing</Button>

      <Modal
        isOpen={isProcessing}
        onClose={() => {}}
        closeOnBackdrop={false}
        closeOnEscape={false}
        size="sm"
      >
        <ModalHeader title="Processing..." />
        <ModalBody>
          <div className="text-center py-4">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-sm text-gray-600">Please wait...</p>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}

// Example 6: Large Scrollable Content
export function ScrollableModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const longContent = Array.from({ length: 30 }, (_, i) => (
    <p key={i} className="mb-4">
      This is paragraph {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    </p>
  ));

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Long Content</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl">
        <ModalHeader title="Terms and Conditions" onClose={() => setIsOpen(false)} />
        <ModalBody scrollable>{longContent}</ModalBody>
        <ModalFooter>
          <Button onClick={() => setIsOpen(false)}>Accept</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// Example 7: Multiple Size Variants
export function SizeVariantsExample() {
  const [openSize, setOpenSize] = useState<"xs" | "sm" | "md" | "lg" | "xl" | null>(null);

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
          <Button key={size} onClick={() => setOpenSize(size)}>
            Open {size.toUpperCase()}
          </Button>
        ))}
      </div>

      {openSize && (
        <Modal isOpen onClose={() => setOpenSize(null)} size={openSize}>
          <ModalHeader title={`${openSize.toUpperCase()} Modal`} onClose={() => setOpenSize(null)} />
          <ModalBody>
            <p>This is a {openSize} sized modal.</p>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setOpenSize(null)}>Close</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

// Example 8: Custom Styled Modal
export function CustomStyledModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Special Offer</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="lg"
        className="bg-gradient-to-br from-purple-50 to-pink-50"
      >
        <ModalHeader
          title={<span className="text-purple-600 text-xl">🎉 Special Offer!</span>}
          onClose={() => setIsOpen(false)}
        />
        <ModalBody className="space-y-4">
          <p className="text-lg font-semibold">Limited Time Deal</p>
          <p className="text-gray-700">
            Get 50% off your first month when you sign up today!
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Full access to all features</li>
            <li>Priority support</li>
            <li>Cancel anytime</li>
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Maybe Later
          </Button>
          <Button variant="primary" onClick={() => console.log("Claimed!")}>
            Claim Offer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
