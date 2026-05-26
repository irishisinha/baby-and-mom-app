export default function FamilyPage() {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-6">Family Management</h2>
      <div className="bg-white rounded shadow p-6">
        <h3 className="font-semibold mb-4">Family Members</h3>
        <p className="text-gray-600 text-sm mb-4">Invite family and manage roles from here.</p>
        <button className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600">Invite Family Member</button>
      </div>
    </div>
  )
}
