import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl">
            Photo Business Platform
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            All-in-one solution for managing your photography business
          </p>
        </div>

        {/* CTA Section */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-xl"
          >
            Get Started
          </Link>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* CRM Feature */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Client Management</h3>
              <p className="mt-2 text-base text-gray-500">
                Keep track of all your clients, their contact information, and booking history in one place.
              </p>
            </div>

            {/* Booking Feature */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Smart Booking</h3>
              <p className="mt-2 text-base text-gray-500">
                Schedule sessions with automatic Google Calendar sync. Never double-book again.
              </p>
            </div>

            {/* Gallery Feature */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Photo Galleries</h3>
              <p className="mt-2 text-base text-gray-500">
                Share beautiful photo galleries with your clients. Secure, fast, and easy to use.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Features List */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Everything you need to run your photography business
          </h2>
          <ul className="space-y-4 text-lg text-gray-600">
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              Google Calendar integration for seamless scheduling
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              Gmail integration for client communication
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              Secure cloud storage for all your photos
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              Mobile-first design for on-the-go management
            </li>
          </ul>
        </div>

        {/* Footer CTA */}
        <div className="mt-20 text-center">
          <p className="text-lg text-gray-600 mb-4">Ready to streamline your photography business?</p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign in to get started
          </Link>
        </div>
      </div>
    </div>
  )
}
