// app/(auth)/reset-password/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AuthCardWrapper } from '@/components/shared/auth-card-wrapper';
import { useSearchParams } from 'next/navigation';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError('');
    setSuccess(false);

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    try {
      // BetterAuth integration here
      console.log('Reset password data:', { ...data, token });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess(true);
      reset();
    } catch (err) {
      setError('Failed to reset password. The link may have expired. Please request a new one.');
    }
  };

  if (!token) {
    return (
      <AuthCardWrapper
        title="Invalid reset link"
        description="The password reset link is invalid or has expired"
      >
        <FieldGroup>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This password reset link is invalid or has expired. Please request a new password
              reset link to continue.
            </AlertDescription>
          </Alert>

          <Button asChild className="w-full" size="lg">
            <Link href="/forgot-password">Request New Link</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/login">Back to Login</Link>
          </Button>
        </FieldGroup>
      </AuthCardWrapper>
    );
  }

  return (
    <AuthCardWrapper
      title={success ? 'Password reset successful' : 'Create new password'}
      description={
        success
          ? 'Your password has been successfully reset'
          : 'Choose a strong password to secure your account'
      }
    >
      {success ? (
        <FieldGroup>
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Your password has been successfully reset. You can now sign in with your new
              password.
            </AlertDescription>
          </Alert>

          <Button asChild className="w-full" size="lg">
            <Link href="/login">
              Continue to Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </FieldGroup>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  disabled={isSubmitting}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FieldError errors={[errors.password]} />
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  disabled={isSubmitting}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <FieldError errors={[errors.confirmPassword]} />
            </Field>

            <FieldDescription className="text-xs">
              <p className="font-medium mb-2">Password requirements:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
              </ul>
            </FieldDescription>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <Button
              asChild
              variant="ghost"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              <Link href="/login">Back to Login</Link>
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthCardWrapper>
  );
}