'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<{
    email: string;
    role: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: email || '',
    password: '',
    confirmPassword: '',
    token: token || '',
  });
  
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: '',
  });

  // Validate the token on page load
  useEffect(() => {
    if (!token) {
      setValidatingToken(false);
      setIsTokenValid(false);
      toast.error('No invitation token provided');
      router.push('/auth/signin');
      return;
    }

    // Validate token with API
    const validateToken = async () => {
      try {
        setValidatingToken(true);
        
        const response = await fetch(`/api/auth/validate-token?token=${encodeURIComponent(token)}${email ? `&email=${encodeURIComponent(email)}` : ''}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setIsTokenValid(true);
          setInvitationDetails({
            email: data.invitation.email,
            role: data.invitation.role,
          });
          
          // Update the email in the form if it's not already set
          if (!formData.email && data.invitation.email) {
            setFormData(prev => ({
              ...prev,
              email: data.invitation.email
            }));
          }
        } else {
          setIsTokenValid(false);
          toast.error(data.message || 'Invalid or expired invitation token');
          setTimeout(() => {
            router.push('/auth/signin');
          }, 3000);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setIsTokenValid(false);
        toast.error('Failed to validate invitation token');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token, email, router, formData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const checkPasswordStrength = (password: string) => {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const strengthScore = [hasLowerCase, hasUpperCase, hasDigit, hasSpecialChar, isLongEnough].filter(Boolean).length;

    if (password.length === 0) return { score: 0, label: '', color: '' };
    
    if (strengthScore <= 2) {
      return { score: 1, label: 'Weak', color: 'text-red-500' };
    } else if (strengthScore <= 4) {
      return { score: 2, label: 'Moderate', color: 'text-yellow-500' };
    } else {
      return { score: 3, label: 'Strong', color: 'text-green-500' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!formData.email) {
      toast.error('Please enter your email');
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      console.log('Submitting registration with email:', formData.email);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          token: formData.token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      console.log('Registration successful:', data);
      toast.success('Registration successful');
      
      // Sign in the user automatically
      console.log('Attempting to sign in with newly registered account:', formData.email);
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      
      console.log('Sign in result:', result);
      
      if (result?.error) {
        console.error('Error signing in after registration:', result.error);
        toast.error('Registration successful, but failed to sign in automatically. Please try signing in manually.');
        router.push('/auth/signin?email=' + encodeURIComponent(formData.email));
      } else {
        console.log('Sign in successful, redirecting to dashboard');
        // The user will be redirected to change-password page by MainLayout
        // if requirePasswordChange is true
        toast.success('Signed in successfully. You will now be redirected.');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              The invitation token is invalid or has expired.
            </p>
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/auth/signin')}
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Return to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            You've been invited to join as a {invitationDetails?.role}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="John Doe"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={!!email} // Disable if email was provided in URL
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:dark:bg-gray-600 disabled:text-gray-500 disabled:dark:text-gray-400"
                placeholder="you@example.com"
              />
              {!!email && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Email address is pre-filled from your invitation
                </p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                minLength={8}
              />
              {formData.password && (
                <p className={`mt-1 text-xs ${passwordStrength.color}`}>
                  Password strength: {passwordStrength.label}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
                minLength={8}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </div>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 