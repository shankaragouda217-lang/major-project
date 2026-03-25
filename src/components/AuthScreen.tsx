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
      setError('Google sign-in failed. Please try again.');
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
        setSuccess('Password reset link sent! Please check your email (and Spam folder).');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let message = err.message;
      if (err.code === 'auth/invalid-credential') message = 'Incorrect email or password. If you haven\'t signed up yet, please switch to the Sign Up tab.';
      if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (err.code === 'auth/email-already-in-use') message = 'This email is already registered.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendReset = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Reset link resent successfully!');
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={isReset ? 'reset' : (isLogin ? 'login' : 'signup')}
      >
        <h2 className="text-3xl font-bold mb-2 text-emerald-800">
          {isReset ? t('auth_reset_password') : (isLogin ? t('auth_welcome_back') : t('auth_create_account'))}
        </h2>
        <p className="text-zinc-500 mb-8">
          {isReset 
            ? t('auth_reset_desc') 
            : (isLogin ? t('auth_signin_desc') : t('auth_signup_desc'))}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
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
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
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
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
              If you don't see the email within 2 minutes, check your <strong>Spam or Junk</strong> folder. 
              The sender will be from your Firebase project domain.
            </p>
          </div>
        )}

        {isReset && success && (
          <button
            type="button"
            onClick={handleResendReset}
            disabled={loading}
            className="w-full text-zinc-500 text-sm font-medium py-2 hover:text-emerald-600 transition-colors"
          >
            Didn't receive the link? Resend
          </button>
        )}

        {!isReset && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-emerald-50 text-zinc-400">{t('auth_or_continue')}</span>
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
