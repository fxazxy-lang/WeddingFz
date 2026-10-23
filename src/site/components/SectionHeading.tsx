import { Finial } from './Ornament';

interface Props {
  id: string;
  title: string;
  intro?: string;
}

export function SectionHeading({ id, title, intro }: Props) {
  return (
    <header className="section-heading">
      <Finial className="section-heading__mark" size={40} />
      <h2 id={id} className="section-heading__title">
        {title}
      </h2>
      {intro ? <p className="section-heading__intro">{intro}</p> : null}
    </header>
  );
}
