import { getDictionary } from "../dictionaries";
import { Hero } from "./hero";

export default async function HomePage() {
  const dict = await getDictionary();
  return (
    <main>
      <Hero
        title={dict.site.title}
        tagline={dict.site.tagline}
        kicker={dict.home.heroKicker}
      />
    </main>
  );
}
