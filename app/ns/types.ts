/**
 * NS Selection context type - manages address selection and QR code display in NS directory
 */
export interface NsSelectionContextType {
  selectedAddress: string | null;
  setSelectedAddress: (address: string | null) => void;
  forceShowQR: boolean;
  setForceShowQR: (value: boolean) => void;
}
