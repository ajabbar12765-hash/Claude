import * as React from 'react';

export interface NoteProps {
  /** Note title. */
  title: string;
  /** Short body text. */
  children?: React.ReactNode;
  /** Timestamp shown in monospace under the body. */
  timestamp?: string;
  /** Highlights the note with the tint background. */
  selected?: boolean;
}

/** A raised card holding one note: title, short body and timestamp. */
export function Note({ title, children, timestamp, selected = false }: NoteProps) {
  return (
    <article className={`fn-note${selected ? ' fn-note--selected' : ''}`}>
      <h2 className="fn-note__title">{title}</h2>
      <p className="fn-note__body">{children}</p>
      {timestamp ? <time className="fn-note__time">{timestamp}</time> : null}
    </article>
  );
}
