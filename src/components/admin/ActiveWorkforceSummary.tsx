import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { apiService } from '../../lib/api';

const ActiveWorkforceSummary: React.FC = () => {
  const [counts, setCounts] = useState({ masons: 0, helpers: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const backendList = await apiService.getWorkers().catch(() => []);
        const savedProfilesRaw = localStorage.getItem('worker_db');
        const savedProfiles = savedProfilesRaw ? JSON.parse(savedProfilesRaw) : [];

        let masonsCount = 0;
        let helpersCount = 0;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        endOfWeek.setHours(23, 59, 59, 999);

        backendList.forEach(bw => {
          const foundProfile = savedProfiles.find((p: any) => String(p.id) === String(bw.id) || String(p.workerid) === String(bw.id));
          
          let categoryName = "Helper";
          const catRaw = String(bw.category || foundProfile?.category || "Helper").toLowerCase();
          if (catRaw === '1' || catRaw === 'mason') categoryName = "Mason";
          else if (catRaw === '2' || catRaw === 'helper') categoryName = "Helper";

          const isBackendActive = bw.isActive !== false;
          const isProfileActive = foundProfile ? foundProfile.active !== false : isBackendActive;
          
          const dateOfJoining = foundProfile?.date_of_joining ? new Date(foundProfile.date_of_joining) : new Date();
          const dateOfRelieving = foundProfile?.date_of_relieving ? new Date(foundProfile.date_of_relieving) : null;

          const joinedBeforeEndOfWeek = dateOfJoining <= endOfWeek;
          const notRelievedBeforeStartOfWeek = isProfileActive || (dateOfRelieving && dateOfRelieving >= startOfWeek);

          if (joinedBeforeEndOfWeek && notRelievedBeforeStartOfWeek) {
            if (categoryName === "Mason") {
              masonsCount++;
            } else if (categoryName === "Helper") {
              helpersCount++;
            }
          }
        });

        setCounts({ masons: masonsCount, helpers: helpersCount });
      } catch (err) {
        console.error("Error fetching workforce counts:", err);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Workforce</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Current Week Analysis</p>
        </div>
      </div>
      <div className="flex gap-4 w-full md:w-auto">
        <div className="flex-1 md:w-32 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{counts.masons}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Masons</p>
        </div>
        <div className="flex-1 md:w-32 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
          <p className="text-3xl font-black text-violet-600 dark:text-violet-400 leading-none">{counts.helpers}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Helpers</p>
        </div>
      </div>
    </div>
  );
};

export default ActiveWorkforceSummary;
