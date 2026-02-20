"use client";

import { useState } from "react";
// Buttons
import Button from "@/ui/common/buttons/Button";
import CopyButton from "@/ui/common/buttons/CopyButton";
import IconButton from "@/ui/common/buttons/IconButton";
// Layout
import Card from "@/ui/common/layout/Card";
import Section from "@/ui/common/layout/Section";
import Divider from "@/ui/common/layout/Divider";
// Feedback
import Badge from "@/ui/common/feedback/Badge";
import Spinner from "@/ui/common/feedback/Spinner";
import Alert from "@/ui/common/feedback/Alert";
// Forms
import Input from "@/ui/common/forms/Input";
import TextArea from "@/ui/common/forms/TextArea";
import Select from "@/ui/common/forms/Select";
import Checkbox from "@/ui/common/forms/Checkbox";
import FormField from "@/ui/common/forms/FormField";
import Dropdown from "@/ui/common/forms/Dropdown";
// Modals
import Modal from "@/ui/common/modals/Modal";
import ModalHeader from "@/ui/common/modals/ModalHeader";
import ModalBody from "@/ui/common/modals/ModalBody";
import ModalFooter from "@/ui/common/modals/ModalFooter";
import ConfirmDialog from "@/ui/common/modals/ConfirmDialog";
import TutorialModal from "@/ui/common/modals/TutorialModal";
// Other
import HelpIcon from "@/ui/common/HelpIcon";

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [dropdownValue, setDropdownValue] = useState("");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [textAreaValue, setTextAreaValue] = useState("");

  const tutorialSteps = [
    {
      id: "profile",
      title: "Create your Zcash identity",
      description:
        "Start by choosing your handle and adding a short bio so other users can trust who they are interacting with.",
      details: [
        "Pick a username you will keep long-term.",
        "Add one social link for easier verification.",
        "Use a shielded address for better privacy defaults.",
      ],
      videoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U",
      videoTitle: "Profile setup walkthrough",
      textContent: (
        <p>
          This is the first-run setup screen. Keep friction low and ask only for information needed to get users to
          their first successful action.
        </p>
      ),
    },
    {
      id: "discover",
      title: "Find and follow trusted users",
      description:
        "Show how to search the directory, filter by location, and review verification badges before interacting.",
      details: [
        "Teach the meaning of profile badges.",
        "Show how to open a profile and verify links.",
        "Call out referral and community discovery features.",
      ],
      videoUrl: "https://www.youtube.com/embed/jNQXAC9IVRw",
      videoTitle: "Directory walkthrough",
      textContent: (
        <p>
          Prioritize one clear next action here: open one profile, review links, and complete one follow or contact
          action.
        </p>
      ),
    },
    {
      id: "send",
      title: "Complete your first transfer",
      description:
        "End with a short walkthrough showing how to copy a destination, paste an amount, and confirm safely.",
      details: [
        "Confirm destination and amount before submit.",
        "Explain what gets shared publicly vs privately.",
        "Point users to support and recovery docs.",
      ],
      videoUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
      videoTitle: "First transfer walkthrough",
      textContent: (
        <p>
          The final step should create confidence. Keep copy practical and include one direct path to help if anything
          feels unclear.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Design System
          </h1>
          <p className="text-lg text-gray-600">
            33+ reusable components with consistent styling
          </p>
        </div>

        {/* Buttons Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Buttons</h2>

          <Section title="Button Variants">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
          </Section>

          <Divider />

          <Section title="Button Sizes">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </Section>

          <Divider />

          <Section title="Full Width Buttons">
            <div className="space-y-2 max-w-md">
              <Button variant="primary" className="w-full">
                Full Width Primary
              </Button>
              <Button variant="secondary" className="w-full">
                Full Width Secondary
              </Button>
            </div>
          </Section>

          <Divider />

          <Section title="Other Button Components">
            <div className="flex flex-wrap gap-4 items-center">
              <CopyButton text="Hello World" />
              <CopyButton text="Custom label" label="Copy Code" />
              <IconButton variant="primary" title="Edit">
                ✎
              </IconButton>
              <IconButton variant="secondary" title="Settings">
                ⚙
              </IconButton>
              <IconButton variant="danger" title="Delete">
                🗑
              </IconButton>
            </div>
          </Section>
        </Card>

        {/* Feedback Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Feedback</h2>

          <Section title="Badges">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </Section>

          <Divider />

          <Section title="Badge Sizes">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" size="xs">
                Extra Small
              </Badge>
              <Badge variant="success" size="sm">
                Small
              </Badge>
              <Badge variant="success" size="md">
                Medium
              </Badge>
            </div>
          </Section>

          <Divider />

          <Section title="Expandable Badges">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" expandable>
                Hover to expand
              </Badge>
              <Badge variant="info" expandable>
                Interactive badge
              </Badge>
            </div>
          </Section>

          <Divider />

          <Section title="Alerts">
            <div className="space-y-2">
              <Alert variant="error" message="This is an error message" />
              <Alert variant="warning" message="This is a warning message" />
              <Alert variant="success" message="This is a success message" />
              <Alert
                variant="info"
                message="This is an info message"
                dismissible
              />
            </div>
          </Section>

          <Divider />

          <Section title="Spinners">
            <div className="flex gap-4 items-center">
              <Spinner size="xs" />
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </div>
          </Section>

          <Divider />

          <Section title="Spinner Colors">
            <div className="flex gap-4 items-center">
              <Spinner size="lg" color="blue" />
              <Spinner size="lg" color="gray" />
              <Spinner size="lg" color="green" />
              <Spinner size="lg" color="red" />
            </div>
          </Section>
        </Card>

        {/* Forms Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Forms</h2>

          <Section title="Input Components">
            <div className="space-y-4 max-w-md">
              <Input
                placeholder="Text input"
                value={inputValue}
                onChange={setInputValue}
              />
              <Input
                type="email"
                placeholder="Email input"
                value=""
                onChange={() => {}}
              />
              <Input
                type="password"
                placeholder="Password input"
                value=""
                onChange={() => {}}
              />
              <Input
                disabled
                placeholder="Disabled input"
                value=""
                onChange={() => {}}
              />
              <Input
                error
                errorMessage="This field is required"
                value=""
                onChange={() => {}}
              />
            </div>
          </Section>

          <Divider />

          <Section title="Text Area">
            <div className="space-y-4 max-w-md">
              <TextArea
                placeholder="Text area"
                rows={3}
                value={textAreaValue}
                onChange={setTextAreaValue}
              />
              <TextArea
                placeholder="Disabled text area"
                rows={3}
                disabled
                value=""
                onChange={() => {}}
              />
              <TextArea
                placeholder="Text area with error"
                rows={3}
                error
                errorMessage="This field is required"
                value=""
                onChange={() => {}}
              />
            </div>
          </Section>

          <Divider />

          <Section title="Select">
            <div className="space-y-4 max-w-md">
              <Select
                value={selectValue}
                onChange={setSelectValue}
                options={[
                  { value: "", label: "Select an option" },
                  { value: "1", label: "Option 1" },
                  { value: "2", label: "Option 2" },
                  { value: "3", label: "Option 3" },
                ]}
              />
              <Select
                disabled
                options={[{ value: "", label: "Disabled select" }]}
                value=""
                onChange={() => {}}
              />
              <Select
                error
                errorMessage="This field is required"
                options={[{ value: "", label: "Select with error" }]}
                value=""
                onChange={() => {}}
              />
            </div>
          </Section>

          <Divider />

          <Section title="Checkbox">
            <div className="space-y-4 max-w-md">
              <Checkbox
                label="I agree to terms"
                checked={checkboxChecked}
                onChange={setCheckboxChecked}
              />
              <Checkbox
                label="Disabled checkbox"
                disabled
                checked={false}
                onChange={() => {}}
              />
              <Checkbox
                label="Checked disabled"
                checked
                disabled
                onChange={() => {}}
              />
            </div>
          </Section>

          <Divider />

          <Section title="FormField Wrapper">
            <div className="max-w-md space-y-4">
              <FormField
                label="Email Address"
                htmlFor="email"
                helpText="We'll never share your email"
                required
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value=""
                  onChange={() => {}}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                helpText="Must be at least 8 characters"
                required
              >
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value=""
                  onChange={() => {}}
                />
              </FormField>

              <FormField
                label="Bio"
                htmlFor="bio"
                helpText="Tell us about yourself"
              >
                <TextArea
                  id="bio"
                  placeholder="Write something..."
                  rows={4}
                  value=""
                  onChange={() => {}}
                />
              </FormField>
            </div>
          </Section>

          <Divider />

          <Section title="Dropdown">
            <div className="max-w-md space-y-4">
              <Dropdown
                options={[
                  { id: "1", label: "Option 1" },
                  { id: "2", label: "Option 2" },
                  { id: "3", label: "Option 3" },
                ]}
                value={dropdownValue}
                onChange={setDropdownValue}
                placeholder="Select an option"
              />
              <Dropdown
                options={[
                  { id: "btc", label: "Bitcoin", description: "BTC", icon: "₿" },
                  { id: "eth", label: "Ethereum", description: "ETH", icon: "Ξ" },
                  { id: "zec", label: "Zcash", description: "ZEC", icon: "ⓩ" },
                ]}
                value=""
                onChange={() => {}}
                placeholder="Select cryptocurrency"
                searchable
                searchPlaceholder="Search coins..."
              />
            </div>
          </Section>
        </Card>

        {/* Modals Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Modals</h2>

          <Section title="Modal Components">
            <div className="flex gap-2">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              <Button onClick={() => setConfirmOpen(true)} variant="danger">
                Open Confirm Dialog
              </Button>
              <Button onClick={() => setTutorialOpen(true)} variant="secondary">
                Open Tutorial Modal
              </Button>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
              <ModalHeader
                title="Example Modal"
                onClose={() => setModalOpen(false)}
              />
              <ModalBody>
                <p className="text-gray-700">
                  This is the modal body content. You can put any content here,
                  including forms, text, images, and more.
                </p>
                <div className="mt-4 p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-600">
                    Modals can contain complex layouts and interactive elements.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary">Save Changes</Button>
              </ModalFooter>
            </Modal>

            <ConfirmDialog
              isOpen={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                alert("Confirmed!");
                setConfirmOpen(false);
              }}
              title="Delete Item"
              message="Are you sure you want to delete this item? This action cannot be undone."
              variant="danger"
            />

            <TutorialModal
              isOpen={tutorialOpen}
              onClose={() => setTutorialOpen(false)}
              title="Welcome to zcashme"
              subtitle="A first-time user walkthrough with text and embedded video."
              steps={tutorialSteps}
              onSkip={() => setTutorialOpen(false)}
              onComplete={() => setTutorialOpen(false)}
            />
          </Section>

          <Divider />

          <Section title="Confirm Dialog Variants">
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  /* Would open danger variant */
                }}
                variant="danger"
              >
                Danger
              </Button>
              <Button
                onClick={() => {
                  /* Would open warning variant */
                }}
                variant="secondary"
              >
                Warning
              </Button>
              <Button
                onClick={() => {
                  /* Would open success variant */
                }}
                variant="primary"
              >
                Success
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              ConfirmDialog supports danger, warning, and success variants
            </p>
          </Section>
        </Card>

        {/* Layout Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Layout</h2>

          <Section title="Card Padding Variants">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card padding="sm" shadow="sm">
                <p className="text-sm">Small padding</p>
              </Card>
              <Card padding="md" shadow="md">
                <p className="text-sm">Medium padding</p>
              </Card>
              <Card padding="lg" shadow="lg">
                <p className="text-sm">Large padding</p>
              </Card>
            </div>
          </Section>

          <Divider />

          <Section title="Card Shadow Variants">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card shadow="none">
                <p className="text-sm">No shadow</p>
              </Card>
              <Card shadow="sm">
                <p className="text-sm">Small shadow</p>
              </Card>
              <Card shadow="md">
                <p className="text-sm">Medium shadow</p>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card shadow="lg">
                <p className="text-sm">Large shadow</p>
              </Card>
              <Card shadow="xl">
                <p className="text-sm">Extra large shadow</p>
              </Card>
            </div>
          </Section>

          <Divider />

          <Section title="Card Hover Effects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="transition-transform hover:scale-105">
                <p className="text-sm">Hover over me</p>
              </Card>
              <Card shadow="lg" className="transition-all hover:shadow-2xl">
                <p className="text-sm">Hover with large shadow</p>
              </Card>
            </div>
          </Section>

          <Divider />

          <Section title="Divider">
            <p className="text-sm text-gray-600">
              Dividers separate content sections
            </p>
            <Divider />
            <p className="text-sm text-gray-600">
              They provide visual hierarchy
            </p>
          </Section>

          <Divider />

          <Section
            title="Collapsible Section"
            collapsible
            defaultOpen={false}
          >
            <p className="text-gray-700">
              This content is hidden by default and can be toggled by clicking
              the section header. Collapsible sections are great for organizing
              large amounts of content.
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                You can put any content inside collapsible sections, including
                forms, cards, and more.
              </p>
            </div>
          </Section>

          <Divider />

          <Section title="Open Collapsible Section" collapsible defaultOpen>
            <p className="text-gray-700">
              This collapsible section is open by default. Users can close it
              if they want to hide the content.
            </p>
          </Section>
        </Card>

        {/* Additional Components Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Additional Components</h2>

          <Section title="Help Icon">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Need help?</span>
              <HelpIcon text="This is a helpful tooltip message" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-gray-700">More info</span>
              <HelpIcon text="You can use HelpIcon to provide contextual information without cluttering the UI" />
            </div>
          </Section>
        </Card>

        {/* Component Combinations Section */}
        <Card>
          <h2 className="text-2xl font-bold mb-4">Component Combinations</h2>

          <Section title="Form with Validation">
            <div className="max-w-md space-y-4">
              <FormField label="Username" htmlFor="username" required>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value=""
                  onChange={() => {}}
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="combo-email"
                required
                helpText="We'll send a confirmation email"
              >
                <Input
                  id="combo-email"
                  type="email"
                  placeholder="you@example.com"
                  value=""
                  onChange={() => {}}
                />
              </FormField>

              <FormField label="Country" htmlFor="country" required>
                <Select
                  id="country"
                  options={[
                    { value: "", label: "Select country" },
                    { value: "us", label: "United States" },
                    { value: "uk", label: "United Kingdom" },
                    { value: "ca", label: "Canada" },
                  ]}
                  value=""
                  onChange={() => {}}
                />
              </FormField>

              <Checkbox
                label="Subscribe to newsletter"
                checked={false}
                onChange={() => {}}
              />

              <div className="flex gap-2 pt-4">
                <Button variant="secondary" className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1">
                  Submit
                </Button>
              </div>
            </div>
          </Section>

          <Divider />

          <Section title="Status Cards">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                shadow="md"
                className="transition-all hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Active Users
                  </h3>
                  <Badge variant="success">Live</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">1,234</p>
                <p className="text-sm text-gray-600 mt-1">
                  +12% from last week
                </p>
              </Card>

              <Card
                shadow="md"
                className="transition-all hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Pending Tasks
                  </h3>
                  <Badge variant="warning">Action Required</Badge>
                </div>
                <p className="text-3xl font-bold text-gray-900">42</p>
                <p className="text-sm text-gray-600 mt-1">
                  Review by end of day
                </p>
              </Card>
            </div>
          </Section>

          <Divider />

          <Section title="Alert with Actions">
            <Alert
              variant="info"
              message="New features are available!"
              dismissible
            />
            <div className="mt-4">
              <Alert variant="warning" message="Your trial expires in 3 days" />
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm">
                  Upgrade Now
                </Button>
                <Button variant="ghost" size="sm">
                  Learn More
                </Button>
              </div>
            </div>
          </Section>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 py-8">
          <p>
            Design System v1.0 • {new Date().getFullYear()} • Built with React
            & TypeScript
          </p>
        </div>
      </div>
    </div>
  );
}
