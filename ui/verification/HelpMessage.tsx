interface HelpMessageProps {
  introText?: string;
  helpText?: string;
  className?: string;
}

export default function HelpMessage({
  introText = "Complete this transaction using your wallet.",
  className = "",
}: HelpMessageProps) {
  return (
    <div className={className}>
      <div className="w-full flex items-center justify-center gap-2 text-center mt-2 mb-0">
        <p className="text-[12px] text-gray-600 italic m-0">{introText}</p>
      </div>
    </div>
  );
}
