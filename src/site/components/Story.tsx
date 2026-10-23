import { gallery, wedding } from '../../config/wedding';
import { useI18n } from '../../i18n/I18nProvider';
import { ZoomablePhoto } from './Lightbox';
import { SectionHeading } from './SectionHeading';

export function Story() {
  const { t } = useI18n();
  return (
    <section className="section story" id="story" aria-labelledby="story-title">
      <div className="container">
        <SectionHeading id="story-title" title={t.story.title} intro={t.story.intro} />
        <div className="story__layout">
          <figure className="story__photo">
            <span className="story__photo-frame" aria-hidden="true" />
            <ZoomablePhoto photo={wedding.photos.story} gallery={gallery} className="story__photo-img" sizes="(max-width: 860px) 86vw, 420px" />
          </figure>

          <ol className="timeline">
            {t.story.entries.map((entry) => (
              <li className="timeline__item" key={entry.title}>
                <span className="timeline__dot" aria-hidden="true" />
                <div className="timeline__card">
                  <p className="timeline__year">{entry.year}</p>
                  <h3 className="timeline__title">{entry.title}</h3>
                  <p className="timeline__body">{entry.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
