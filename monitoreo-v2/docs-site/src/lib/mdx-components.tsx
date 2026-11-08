import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router';

function MdxLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return <a {...props}>{children}</a>;
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  }
  const to = href;
  return <Link to={to} {...props}>{children}</Link>;
}

export function useMDXComponents() {
  return { a: MdxLink };
}
