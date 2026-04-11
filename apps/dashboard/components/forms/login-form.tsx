'use client';

import { useLogin } from '@/hooks/use-auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.email({ error: 'Địa chỉ email không hợp lệ.' }),
  password: z.string().min(1, { error: 'Mật khẩu không được để trống.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useLogin();

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values, {
      onError: (err: Error) => {
        form.setError('root', { message: err.message });
      },
    });
  };

  const {
    formState: { errors },
  } = form;

  const isPending = loginMutation.isPending;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            <Image src="/images/logo.png" alt="Logo" width={150} height={150} className="mb-4" />
            Đăng nhập vào hệ thống quản lý
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {errors.root ? (
                <Field data-invalid>
                  <FieldError errors={[errors.root]} />
                </Field>
              ) : null}
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  disabled={isPending}
                  {...form.register('email')}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  disabled={isPending}
                  {...form.register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <Field>
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
                <FieldDescription className="text-center">
                  Không có tài khoản?{' '}
                  <span className="cursor-pointer text-blue-500">Liên hệ quản lý</span>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
