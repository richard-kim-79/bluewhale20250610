import React from 'react';
import { FeedTab } from '../types';

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

const FeedTabs: React.FC<FeedTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: FeedTab; label: string; description: string }[] = [
    {
      id: 'for-you',
      label: 'For You',
      description: 'Personalized content based on your interests'
    },
    {
      id: 'local',
      label: 'Local',
      description: 'Content relevant to your location'
    },
    {
      id: 'global',
      label: 'Global',
      description: 'Top content from around the world'
    }
  ];

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-2 text-sm text-gray-500">
        {tabs.find(tab => tab.id === activeTab)?.description}
      </div>
    </div>
  );
};

export default FeedTabs;
