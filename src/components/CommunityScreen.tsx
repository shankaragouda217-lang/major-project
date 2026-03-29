import { useState } from 'react';
import { Users, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityScreen() {
  const { reports, deleteMultipleHistoryItems } = useApp();

  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  // Toggle select
  const toggleSelect = (id: string) => {
    setSelectedReports(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Select all
  const selectAll = () => {
    setSelectedReports(reports.map(r => r.id));
  };

  // Clear selected
  const clearSelected = () => {
  if (selectedReports.length === 0) return;

  deleteMultipleHistoryItems(selectedReports);
  setSelectedReports([]);
};
  };

  return (
    <div className="pb-24">
      <header className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase">
              Community
            </h1>
            <p className="text-zinc-700 font-medium">
              Real-time updates from local farmers
            </p>

            {/* ✅ NEW BUTTONS */}
            <div className="flex gap-2 mt-3">
              <button 
                onClick={selectAll}
                className="px-3 py-1 text-xs font-bold bg-zinc-900 text-white rounded-lg"
              >
                Select All
              </button>

              <button 
                onClick={clearSelected}
                className="px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-lg"
              >
                Clear Selected
              </button>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {reports.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
            <Users className="mx-auto text-zinc-700 mb-4" size={48} />
            <p className="text-zinc-700 font-bold">No community reports yet</p>
            <p className="text-zinc-800 text-xs mt-1">
              Be the first to share your plant's health!
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <motion.div 
              key={report.id}
              onClick={() => toggleSelect(report.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative cursor-pointer ${
                selectedReports.includes(report.id)
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'bg-white border-2 border-zinc-100'
              } rounded-[32px] overflow-hidden shadow-sm`}
            >
              {/* ✅ Selected Badge */}
              {selectedReports.includes(report.id) && (
                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded">
                  Selected
                </div>
              )}

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                      {report.userName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">
                        {report.userName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-800 font-bold uppercase tracking-widest">
                        <MapPin size={10} /> {report.location}
                        <span className="mx-1">•</span>
                        <Clock size={10} /> {formatDistanceToNow(report.timestamp)} ago
                      </div>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    report.status === 'Healthy' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {report.status}
                  </div>
                </div>
                
                <h3 className="font-bold text-zinc-900 mb-2">
                  {report.plantName}
                </h3>

                <p className="text-sm text-zinc-800 leading-relaxed mb-4">
                  {report.description}
                </p>

                {report.image && (
                  <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                    <img src={report.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-2xl">
                  <AlertTriangle size={16} className="text-orange-500" />
                  <p className="text-[11px] text-zinc-900 font-medium">
                    Reported as a potential threat to nearby {report.plantName} crops.
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
