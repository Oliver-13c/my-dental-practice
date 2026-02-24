export default async function LangHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">
        {lang === 'es' ? 'Bienvenido a Mi Clínica Dental' : 'Welcome to My Dental Practice'}
      </h1>
    </div>
  );
}
