import { useState } from 'react';
import { Users, MapPin, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityScreen() {
  const { reports, deleteMultipleReports, t } = useApp();

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
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(r => r.id));
    }
  };

  // Delete selected
  const deleteSelected = () => {
    if (selectedReports.length === 0) return;

    deleteMultipleReports(selectedReports);
    setSelectedReports([]);
  };

  // Clear all
  const clearAll = () => {
    if (reports.length === 0) return;
    deleteMultipleReports(reports.map(r => r.id));
    setSelectedReports([]);
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase">
              {t('community')}
            </h1>
            <p className="text-zinc-700 font-medium">
              {t('realtime_updates')}
            </p>

            {/* ✅ UPDATED BUTTONS */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button 
                onClick={selectAll}
                className="px-3 py-1.5 text-xs font-bold bg-zinc-900 text-white rounded-xl shadow-sm hover:bg-zinc-800 transition-colors"
              >
                {selectedReports.length === reports.length && reports.length > 0 ? t('deselect_all') : t('select_all')}
              </button>

              {selectedReports.length > 0 && (
                <button 
                  onClick={deleteSelected}
                  className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-xl shadow-sm hover:bg-red-600 transition-colors"
                >
                  {t('delete_selected', { count: selectedReports.length })}
                </button>
              )}

              {reports.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs font-bold bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-xl shadow-sm hover:bg-zinc-200 transition-colors"
                >
                  {t('clear_all_btn')}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Community Join Card */}
      <section className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <HelpCircle size={80} />
        </div>
        <h3 className="text-xl font-bold mb-2 relative z-10">{t('still_need_help')}</h3>
        <p className="text-sm text-zinc-600 mb-6 relative z-10">{t('join_community_desc')}</p>
        <button 
          className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all relative z-10"
        >
          {t('join_community_btn')}
        </button>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {reports.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
            <Users className="mx-auto text-zinc-700 mb-4" size={48} />
            <p className="text-zinc-700 font-bold">{t('no_community_reports')}</p>
            <p className="text-zinc-800 text-xs mt-1">
              {t('be_the_first_report')}
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
                  {t('selected')}
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
                        <Clock size={10} /> {formatDistanceToNow(report.timestamp)} {t('ago')}
                      </div>
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    report.status === 'Healthy' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {t(`status_${report.status.toLowerCase().replace(/\s+/g, '_')}`)}
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
                    {t('reported_threat', { plantName: report.plantName })}
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
