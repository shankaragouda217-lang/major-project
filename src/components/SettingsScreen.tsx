import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useApp } from '../AppContext';
import { Moon, Bell, LogOut, User, Shield, HelpCircle, History, X, Search, Camera, ChevronRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SettingItem = ({ icon: Icon, label, value, onChange, type = 'toggle' }: any) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-2xl mb-3 border border-zinc-100">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-zinc-50 rounded-xl text-zinc-500">
        <Icon size={20} />
      </div>
      <span className="font-medium text-zinc-700">{label}</span>
    </div>
    {type === 'toggle' ? (
      <button 
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-zinc-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-7' : 'left-1'}`} />
      </button>
    ) : (
      <button onClick={onChange} className="text-zinc-400 p-2 hover:bg-zinc-50 rounded-lg transition-colors">
        <ChevronRight size={20} />
      </button>
    )}
  </div>
);

export default function SettingsScreen() {
  const { user, userData, history, clearHistory, deleteMultipleHistoryItems, updateSettings, t } = useApp();
  const [showHistory, setShowHistory] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(userData?.displayName || '');

  const handleUpdateSettings = async (key: string, value: any) => {
    await updateSettings({ [key]: value });
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      await clearHistory();
      setIsSelectionMode(false);
      setSelectedItems([]);
      setShowHistory(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items?`)) {
      await deleteMultipleHistoryItems(selectedItems);
      setSelectedItems([]);
      setIsSelectionMode(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !newDisplayName.trim()) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      displayName: newDisplayName
    });
    setShowEditProfile(false);
  };

  return (
    <div className="p-6 dark:bg-zinc-950 min-h-screen">
      <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mb-8">{t('settings')}</h2>

      <div className="flex items-center gap-4 mb-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl">
        <div className="w-16 h-16 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-200 text-2xl font-bold">
          {userData?.displayName?.[0]}
        </div>
        <div>
          <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-100">{userData?.displayName}</h3>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-4 px-2">Preferences</h4>
        <SettingItem 
          icon={Moon} 
          label={t('dark_mode')} 
          value={userData?.settings?.darkMode} 
          onChange={(val: boolean) => handleUpdateSettings('darkMode', val)}
        />
        <SettingItem 
          icon={Bell} 
          label={t('notifications')} 
          value={userData?.settings?.notifications} 
          onChange={(val: boolean) => handleUpdateSettings('notifications', val)}
        />
      </div>

      <div className="mb-8">
        <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-4 px-2">{t('language')}</h4>
        <SettingItem 
          icon={Shield} 
          label={t('language')} 
          type="action" 
          onChange={() => setShowLanguage(true)} 
        />
      </div>

      <div className="mb-8">
        <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4 px-2">Activity</h4>
        <SettingItem 
          icon={History} 
          label={t('garden_history')} 
          type="action" 
          onChange={() => setShowHistory(true)} 
        />
      </div>

      <div className="mb-8">
        <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4 px-2">Account</h4>
        <SettingItem 
          icon={User} 
          label={t('edit_profile')} 
          type="action" 
          onChange={() => {
            setNewDisplayName(userData?.displayName || '');
            setShowEditProfile(true);
          }} 
        />
        <SettingItem 
          icon={HelpCircle} 
          label={t('help_support')} 
          type="action" 
          onChange={() => setShowHelp(true)} 
        />
      </div>

      <button
        onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
      >
        <LogOut size={20} /> {t('sign_out')}
      </button>

      <div 
        className="mt-12 pt-8 border-t border-zinc-100 text-center pb-8 cursor-pointer active:opacity-50"
        onClick={() => {
          (window as any).showAppDebug = true;
          window.dispatchEvent(new Event('toggle-debug'));
        }}
      >
        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
          Garden Intelligence System
        </p>
        <p className="text-[10px] text-zinc-300 mt-1">
          Build: 20260319-v3.0
        </p>
      </div>

      {/* Language Modal */}
      <AnimatePresence>
        {showLanguage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-md flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-6 pb-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-zinc-900">{t('language')}</h3>
                <button onClick={() => setShowLanguage(false)} className="p-2 bg-zinc-100 rounded-full text-zinc-500">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'en', name: 'English', native: 'English' },
                  { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
                  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
                  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
                  { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      handleUpdateSettings('language', lang.id);
                      setShowLanguage(false);
                    }}
                    className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${userData?.settings?.language === lang.id ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-100 bg-white'}`}
                  >
                    <div className="flex flex-col items-start">
                      <span className={`font-bold ${userData?.settings?.language === lang.id ? 'text-emerald-700' : 'text-zinc-900'}`}>{lang.name}</span>
                      <span className="text-xs text-zinc-400 font-medium">{lang.native}</span>
                    </div>
                    {userData?.settings?.language === lang.id && (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <CheckCircle size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-zinc-900 w-full max-w-md h-[80vh] rounded-t-[40px] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Your History</h3>
                  {history.length > 0 && (
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                      {history.length} total entries
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <div className="flex gap-2 mr-2">
                      {isSelectionMode ? (
                        <>
                          <button 
                            onClick={handleDeleteSelected}
                            disabled={selectedItems.length === 0}
                            className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-200 transition-all disabled:opacity-50"
                          >
                            Delete ({selectedItems.length})
                          </button>
                          <button 
                            onClick={() => {
                              setIsSelectionMode(false);
                              setSelectedItems([]);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-bold hover:bg-zinc-200 transition-all"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setIsSelectionMode(true)}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-bold hover:bg-zinc-200 transition-all"
                          >
                            Select
                          </button>
                          <button 
                            onClick={handleClearHistory}
                            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-red-500 rounded-xl text-[10px] font-bold hover:bg-red-50 transition-all"
                          >
                            Clear All
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setShowHistory(false);
                      setIsSelectionMode(false);
                      setSelectedItems([]);
                    }} 
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pb-8">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-4">
                      <History size={32} />
                    </div>
                    <p className="text-zinc-500 text-sm">No history yet. Start exploring your garden!</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className={`bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border transition-all ${
                        selectedItems.includes(item.id) ? 'border-emerald-500 bg-emerald-50/30' : 'border-zinc-100 dark:border-zinc-800'
                      }`}
                      onClick={() => isSelectionMode && toggleItemSelection(item.id)}
                    >
                      <div className="flex items-start gap-4">
                        {isSelectionMode && (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-2 ${
                            selectedItems.includes(item.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200'
                          }`}>
                            {selectedItems.includes(item.id) && <CheckCircle size={14} />}
                          </div>
                        )}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${['search', 'growth_search'].includes(item.type) ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                          {['search', 'growth_search'].includes(item.type) ? <Search size={20} /> : <Camera size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-zinc-900 dark:text-white truncate">{item.title}</h4>
                            <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap ml-2">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">{item.details}</p>
                          {item.image && (
                            <div className="aspect-video w-full rounded-2xl overflow-hidden mb-2">
                              <img src={item.image} alt="History item" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Removed redundant Clear All button as it's now in the header */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-6 text-center">Edit Profile</h3>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-2 mb-1 block">Display Name</label>
                  <input 
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 p-4 bg-zinc-100 text-zinc-600 font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  className="flex-1 p-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help & Support Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-4 text-center">Help & Support</h3>
              <div className="space-y-4 mb-8 text-center">
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Need help with your garden? You can use the <strong>Ask Garden AI</strong> feature on the home screen for instant advice.
                </p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  For technical issues, contact us at:<br/>
                  <span className="font-bold text-emerald-600">support@gardenintelligence.com</span>
                </p>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full p-4 bg-zinc-900 text-white font-bold rounded-2xl"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
