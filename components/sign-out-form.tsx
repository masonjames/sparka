import Form from 'next/form';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

import { redirect } from 'next/navigation';
export const SignOutForm = () => {
  return (
    <Form
      className="w-full"
      action={async () => {
        'use server';

        await auth.api.signOut({ headers: await headers() });
        // Redirect manually after server sign-out
        redirect('/');
      }}
    >
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        Sign out
      </button>
    </Form>
  );
};
