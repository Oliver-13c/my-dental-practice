import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const defaultLocale = locale || 'en';
  return {
    messages: (await import(`../messages/${defaultLocale}.json`)).default,
  };
});
