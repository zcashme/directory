import AdminRefundPage from "../../../src/components/AdminRefundPage";

export default function AdminRefundsPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="p-6 text-red-600">
        Admin page only available in development.
      </div>
    );
  }

  return <AdminRefundPage />;
}
