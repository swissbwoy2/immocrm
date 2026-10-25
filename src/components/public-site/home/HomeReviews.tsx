import { CONTAINER, H2, Reveal } from './homeUi';

/** Avis Google (widget Elfsight), juste après « Nos partenaires de confiance ». */
export function HomeReviews() {
  return (
    <section className="py-14 md:py-20" aria-labelledby="home-reviews-title">
      <div className={CONTAINER}>
        <Reveal>
          <h2 id="home-reviews-title" className={H2}>Ce que disent nos clients</h2>
          <p className="mt-2 text-[16px] text-foreground/80">Avis Google vérifiés</p>
        </Reveal>
        <div className="mt-6 min-h-[200px]">
          <div className="elfsight-app-6edfc233-2b60-465a-9be1-9b16cf306e85" data-elfsight-app-lazy />
        </div>
      </div>
    </section>
  );
}
