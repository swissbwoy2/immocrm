import { Fragment } from 'react';
import { Link } from 'react-router-dom';

const RE = /(https?:\/\/[^\s]+|\/(?:annonces\/|candidat\/)[^\s]*)/g;
const trim = (s: string) => { const m = s.match(/[.,;:!?)\]»]+$/); return m ? [s.slice(0, -m[0].length), m[0]] : [s, '']; };

/** Rend un texte en rendant cliquables les URLs http et les chemins internes (/annonces/…, /candidat/…). */
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(RE);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        const [url, tail] = trim(p);
        const cls = 'underline underline-offset-2 break-all font-medium';
        return (
          <Fragment key={i}>
            {url.startsWith('/')
              ? <Link to={url} className={cls} onClick={(e) => e.stopPropagation()}>{url}</Link>
              : <a href={url} target="_blank" rel="noopener noreferrer" className={cls} onClick={(e) => e.stopPropagation()}>{url}</a>}
            {tail}
          </Fragment>
        );
      })}
    </>
  );
}
