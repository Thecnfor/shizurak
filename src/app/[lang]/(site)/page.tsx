import { RouteTransition } from "@/components/fx/route-transition";
import { getDictionary } from "../dictionaries";
import { Hero } from "./hero";

export default async function HomePage() {
  const dict = await getDictionary();
  return (
    <RouteTransition>
      <main>
        <Hero
          title={dict.site.title}
          tagline={dict.site.tagline}
          kicker={dict.home.heroKicker}
        />
      </main>
    </RouteTransition>
  );
}
