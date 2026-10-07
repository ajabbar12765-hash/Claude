import * as React from 'react';

export interface TagProps {
  /** Tag meaning. Use highlight at most once per screen. */
  tone?: 'neutral' | 'highlight' | 'danger';
  children: React.ReactNode;
}

/** A small uppercase label for categorizing or flagging a note. */
export function Tag({ tone = 'neutral', children }: TagProps) {
  return <span className={`fn-tag fn-tag--${tone}`}>{children}</span>;
}
