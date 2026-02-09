export function getUserFriendlyErrorMessage(apiErrorMessage: string | undefined): string {
  const errorMap: Record<string, string> = {
    "refundTo is not valid": "Your refund address is incorrect. Please verify and try again.",
    "refundTo should not be empty": "Refund address is required.",
    "recipient is not valid": "The destination address is invalid. Please check the address format.",
    "tokenIn is not valid": "Invalid origin token. Please select a valid token.",
    "tokenOut is not valid": "Invalid destination token. Please refresh and try again.",
    "amount must be greater than 0": "Amount must be greater than zero.",
  };

  for (const [apiError, userMessage] of Object.entries(errorMap)) {
    if (apiErrorMessage?.includes(apiError)) {
      return userMessage;
    }
  }

  return apiErrorMessage || "An error occurred. Please try again.";
}
