import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon }) => {
  return (
    <div className="bg-tg-secondaryBg rounded-xl p-4 flex items-center gap-4 shadow-sm border border-white/5">
      <div className="p-3 bg-tg-bg rounded-lg text-tg-link">
        {icon}
      </div>
      <div>
        <p className="text-sm text-tg-hint">{title}</p>
        <p className="text-xl font-bold text-tg-text">{value}</p>
        {subtext && <p className="text-xs text-tg-hint mt-1">{subtext}</p>}
      </div>
    </div>
  );
};