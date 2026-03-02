import { redirect } from 'next/navigation';

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};

  const hasAuthParams =
    typeof params.code === 'string' ||
    typeof params.token === 'string' ||
    typeof params.token_hash === 'string';

  if (hasAuthParams) {
    const callbackParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => callbackParams.append(key, item));
      } else if (typeof value === 'string') {
        callbackParams.set(key, value);
      }
    });

    // Fallback: when Supabase lands on '/' with ?code=... from recovery,
    // force recovery type so callback can route to reset-password screen.
    if (!callbackParams.get('type')) {
      callbackParams.set('type', 'recovery');
    }

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  redirect('/staff/login');
}