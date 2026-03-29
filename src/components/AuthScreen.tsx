import { useState } from 'react';
import { auth } from '../firebase';
import { useApp } from '../AppContext';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthScreen({ onBack }: { onBack: () => void }) {
  const { t } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(t('auth_google_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, email);
        setSuccess(t('auth_reset_sent'));
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/invalid-credential') message = t('auth_invalid_credential');
      if (err.code === 'auth/user-not-found') message = t('auth_user_not_found');
      if (err.code === 'auth/wrong-password') message = t('auth_wrong_password');
      if (err.code === 'auth/email-already-in-use') message = t('auth_email_in_use');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendReset = async () => {
    if (!email) {
      setError(t('auth_enter_email'));
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(t('auth_reset_resent'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pt-12">
      <button 
        onClick={isReset ? () => setIsReset(false) : onBack} 
        className="mb-8 text-emerald-600 flex items-center gap-2 hover:opacity-70 transition-opacity"
      >
        <ArrowLeft size={20} /> {t('auth_back')}
      </button>

      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center overflow-hidden border border-emerald-100 shadow-xl">
          <img
            src="https://iili.io/qD8Qbig.png"
            alt="Logo"
            className="w-20 h-20 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={isReset ? 'reset' : (isLogin ? 'login' : 'signup')}
      >
        <h2 className="text-3xl font-bold mb-2 text-emerald-800">
          {isReset ? t('auth_reset_password') : (isLogin ? t('auth_welcome_back') : t('auth_create_account'))}
        </h2>
        <p className="text-zinc-700 mb-8">
          {isReset 
            ? t('auth_reset_desc') 
            : (isLogin ? t('auth_signin_desc') : t('auth_signup_desc'))}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
          <input
            type="email"
            placeholder={t('auth_email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            required
          />
        </div>

        {!isReset && (
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('auth_password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} className="text-zinc-600" /> : <Eye size={20} className="text-zinc-600" />}
            </button>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-sm font-medium px-1"
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
            >
              <CheckCircle size={18} className="shrink-0" />
              <p>{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {isLogin && !isReset && (
          <div className="flex justify-end px-1">
            <button
              type="button"
              onClick={() => {
                setIsReset(true);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-emerald-600 font-medium hover:underline"
            >
              {t('auth_forgot_password')}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw size={20} className="animate-spin" />
          ) : (
            isReset ? t('auth_send_reset') : (isLogin ? t('auth_signin') : t('auth_signup'))
          )}
        </button>

        {isReset && success && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>
              {t('auth_spam_note')}
            </p>
          </div>
        )}

        {isReset && success && (
          <button
            type="button"
            onClick={handleResendReset}
            disabled={loading}
            className="w-full text-zinc-700 text-sm font-medium py-2 hover:text-emerald-600 transition-colors"
          >
            {t('auth_resend')}
          </button>
        )}

        {!isReset && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-emerald-50 text-zinc-600">{t('auth_or_continue')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white border border-zinc-200 text-zinc-700 font-medium py-4 rounded-2xl shadow-sm hover:bg-zinc-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {t('auth_google')}
            </button>
          </>
        )}
      </form>

      <div className="mt-8 text-center">
        {!isReset && (
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
            className="text-emerald-600 font-medium hover:underline"
          >
            {isLogin ? t('auth_no_account') : t('auth_already_account')}
          </button>
        )}
        {isReset && (
          <button
            onClick={() => {
              setIsReset(false);
              setError('');
              setSuccess('');
            }}
            className="text-emerald-600 font-medium hover:underline"
          >
            {t('auth_back_to_signin')}
          </button>
        )}
      </div>
    </div>
  );
}
