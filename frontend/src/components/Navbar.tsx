import { Link, useNavigate } from "react-router-dom";
import { clearAuth, getUser, isAuthenticated } from "../lib/auth";

export function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const authed = isAuthenticated();

  function handleLogout() {
    clearAuth();
    navigate("/");
    window.location.reload();
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            SubFlow
          </Link>

          <div className="flex items-center gap-4">
            {authed ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Admin
                  </Link>
                )}
                <span className="text-sm text-gray-500">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
