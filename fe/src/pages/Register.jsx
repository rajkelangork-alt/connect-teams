import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register(email, password, fullName);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account. Try a different email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-stone-50 dark:bg-[#0F0F11] transition-colors duration-200">
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 uppercase tracking-widest transition-colors"
      >
        {isDark ? 'Light' : 'Dark'}
      </button>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 font-semibold mb-3">
            C
          </div>
          <h1 className="text-xl font-medium tracking-tight text-stone-900 dark:text-stone-100">
            Create Account
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Get started with Connect Teams
          </p>
        </div>

        <div className="bg-[#FAF9F6] dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 text-xs py-2 px-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Cooper"
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#202023] border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#202023] border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-sm px-3 py-2 bg-white dark:bg-[#202023] border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-md text-sm font-medium bg-stone-900 hover:bg-stone-800 text-stone-100 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Complete Registration'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-stone-500 dark:text-stone-400">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-stone-900 dark:text-stone-200 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}