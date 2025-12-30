// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AuthCardWrapper } from '@/components/shared/auth-card-wrapper';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    try {
      // BetterAuth will be integrated here
      console.log('Login data:', data);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <AuthCardWrapper
      title="Sign in to your account"
      description="Enter your credentials to access the portal"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <div className="relative">
              <Input
                startIcon={<Mail />}
                {...register('email')}
                id="email"
                type="email"
                placeholder="you@school.edu"
                className="pl-10"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
              />
            </div>
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <Input
              startIcon={<Lock />}
                {...register('password')}
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-10 pr-10"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
              />        
            </div>
            <FieldError errors={[errors.password]} />
          </Field>

          <div className="flex items-center justify-between">
            <Field orientation="horizontal">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setValue('rememberMe', checked as boolean)}
                disabled={isSubmitting}
              />
              <FieldLabel htmlFor="rememberMe" className="font-normal cursor-pointer">
                Remember me
              </FieldLabel>
            </Field>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </FieldGroup>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <p>
          Need help?{' '}
          <Link
            href="/support"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium transition-colors"
          >
            Contact Support
          </Link>
        </p>
      </div>
    </AuthCardWrapper>
  );
}