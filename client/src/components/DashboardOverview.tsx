import React from 'react';
import { Building2 } from 'lucide-react';

interface DashboardProps {
  onSelectTab: (tabKey: string) => void;
}

export const DashboardOverview: React.FC<DashboardProps> = () => {
  return (
    <div className="space-y-8 pb-8 animate-fadeIn">
      {/* BRAND BANNER ONLY */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] p-12 shadow-lg text-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
            <Building2 className="w-8 h-8 text-[#667eea]" />
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-wider">
              SRI KRISHNA CONSTRUCTIONS
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase">
              Welcome to Stock Management System
            </h1>
            <p className="text-base text-white/80 max-w-2xl mx-auto">
              Manage arrivals, sales, and inventories with high-performance real-time ledgers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
