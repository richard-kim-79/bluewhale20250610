import React, { ReactNode } from 'react';
import Head from 'next/head';
import Navigation from './Navigation';
import { FaWater } from 'react-icons/fa';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'BlueWhale' }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{title} | BlueWhale</title>
        <meta name="description" content="BlueWhale - Knowledge Management System" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navigation />

      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <FaWater className="text-primary-600 text-xl" />
              <span className="text-lg font-semibold text-primary-700">BlueWhale</span>
            </div>
            <div className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} BlueWhale. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
