import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaSearch, FaUser, FaSignOutAlt, FaUpload, FaTachometerAlt, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <a className="text-2xl font-bold text-blue-600">BlueWhale</a>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <a className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  router.pathname === '/' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                  Home
                </a>
              </Link>
              {isAuthenticated && (
                <>
                  <Link href="/dashboard">
                    <a className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === '/dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                      <FaTachometerAlt className="mr-1" /> Dashboard
                    </a>
                  </Link>
                  <Link href="/upload">
                    <a className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      router.pathname === '/upload' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                      <FaUpload className="mr-1" /> Upload
                    </a>
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    {user?.full_name || user?.username}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </button>
                    {isMenuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <Link href="/profile">
                          <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <FaUser className="inline mr-2" /> Profile
                          </a>
                        </Link>
                        <Link href="/account/security">
                          <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <FaShieldAlt className="inline mr-2" /> Security
                          </a>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FaSignOutAlt className="inline mr-2" /> Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link href="/login">
                    <a className="text-sm font-medium text-blue-600 hover:text-blue-500">
                      Sign in
                    </a>
                  </Link>
                  <Link href="/register">
                    <a className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500">
                      Sign up
                    </a>
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link href="/">
            <a className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              router.pathname === '/' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
            }`}>
              Home
            </a>
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/dashboard">
                <a className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  router.pathname === '/dashboard' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}>
                  Dashboard
                </a>
              </Link>
              <Link href="/upload">
                <a className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  router.pathname === '/upload' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                }`}>
                  Upload
                </a>
              </Link>
            </>
          )}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          {isAuthenticated ? (
            <>
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.full_name || user?.username}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link href="/profile">
                  <a className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    Your Profile
                  </a>
                </Link>
                <Link href="/account/security">
                  <a className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    Security Settings
                  </a>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 space-y-1 px-4">
              <Link href="/login">
                <a className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                  Sign in
                </a>
              </Link>
              <Link href="/register">
                <a className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                  Sign up
                </a>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
