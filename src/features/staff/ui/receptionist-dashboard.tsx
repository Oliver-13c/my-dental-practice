'use client';

export function ReceptionistDashboard() {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-800">Front Desk Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Arrivals Widget */}
                <div className="p-4 border border-purple-100 bg-purple-50 rounded-md">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-purple-900">Current Arrivals</h3>
                        <span className="bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded-full">3 Waiting</span>
                    </div>
                    <ul className="space-y-2">
                        <li className="bg-white p-3 rounded shadow-sm flex justify-between items-center border border-purple-100">
                            <div>
                                <p className="font-medium text-gray-800">John Doe</p>
                                <p className="text-xs text-gray-500">Appt: 09:00 AM (Dr. Smith)</p>
                            </div>
                            <button className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">Check In</button>
                        </li>
                        <li className="bg-white p-3 rounded shadow-sm flex justify-between items-center border border-gray-100">
                            <div>
                                <p className="font-medium text-gray-800">Jane Roe</p>
                                <p className="text-xs text-gray-500">Appt: 09:30 AM (Hygiene)</p>
                            </div>
                            <span className="text-xs text-green-600 font-medium border border-green-200 bg-green-50 px-2 py-1 rounded">Checked In</span>
                        </li>
                    </ul>
                </div>

                {/* Quick Actions */}
                <div className="p-4 border border-gray-200 rounded-md flex flex-col justify-center items-center space-y-4">
                    <h3 className="font-medium text-gray-900 w-full text-left">Quick Actions</h3>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md shadow-sm transition-colors">
                        + New Appointment
                    </button>
                    <button className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-3 rounded-md shadow-sm transition-colors">
                        Register New Patient
                    </button>
                </div>
            </div>
        </div>
    );
}
