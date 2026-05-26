export default function ReportsPage() {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Reports</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-semibold mb-2">7-Day Summary</h3>
          <p className="text-gray-600 text-sm">Export as PDF</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-semibold mb-2">30-Day Summary</h3>
          <p className="text-gray-600 text-sm">Share with pediatrician</p>
        </div>
      </div>
    </div>
  )
}
