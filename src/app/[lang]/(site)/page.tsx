import { getDictionary } from "../dictionaries";

export default async function HomePage() {
  const dict = await getDictionary();
  return (
    <main className="mx-auto max-w-[var(--container-max)] p-6">
      <h1 className="text-[length:var(--text-h1-size)]">{dict.site.title}</h1>
      <p className="text-ink-muted">{dict.home.heroKicker}</p>
    </main>
  );
}
