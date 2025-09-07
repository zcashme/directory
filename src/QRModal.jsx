function QRModal({ address }) {
  const qrUrl = address
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=283748&bgcolor=ffffff00&data=${encodeURIComponent(
        address
      )}`
    : "";

  return (
    <div
      className="w-[280px] h-[280px] border-8 rounded-lg flex flex-col items-center justify-center relative"
      style={{ borderColor: "#283748", backgroundColor: "transparent" }}
    >
      {address ? (
        <img
          src={qrUrl}
          alt="QR Code"
          className="w-full h-full object-contain rounded"
        />
      ) : (
        <p className="text-sm italic" style={{ color: "#283748" }}>
          No wallet address available
        </p>
      )}
    </div>
  );
}

export default QRModal;
