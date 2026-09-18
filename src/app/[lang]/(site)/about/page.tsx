import { getDictionary } from "../../dictionaries";

export default async function AboutPage() {
  const dict = await getDictionary();
  return (
    <main className="mx-auto max-w-[var(--container-max)] px-6 py-24">
      <h1 className="text-[length:var(--text-h1-size)] font-semibold">
        {dict.nav.about}
      </h1>
      <p className="mt-4 text-ink-muted">{dict.home.heroKicker}</p>
    </main>
  );
}
