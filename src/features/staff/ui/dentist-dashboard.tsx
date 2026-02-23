'use client';

export function DentistDashboard() {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Dentist Overview</h2>
            <div className="space-y-4">
                <div className="p-4 border border-blue-100 bg-blue-50 rounded-md">
                    <h3 className="font-medium text-blue-900">Today's Schedule</h3>
                    <p className="text-sm text-blue-700 mt-1">You have 5 appointments today.</p>
                    <ul className="mt-2 text-sm text-gray-700 space-y-2">
                        <li className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                            <span>09:00 AM - Cleaning</span>
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Arrived</span>
                        </li>
                        <li className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                            <span>10:30 AM - Root Canal</span>
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">Scheduled</span>
                        </li>
                    </ul>
                </div>
                <div className="p-4 border border-gray-200 rounded-md">
                    <h3 className="font-medium text-gray-900">Recent Patient Files</h3>
                    <p className="text-sm text-gray-500 italic">No recent files reviewed.</p>
                </div>
            </div>
        </div>
    );
}
