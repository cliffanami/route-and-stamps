import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: "sm" | "md" | "lg";
}

// .card is for genuinely discrete list items (a place, a tip, a budget
// line) — never a generic layout container (CONVENTIONS.md §5b).
export function Card({ elevation, className, ...props }: CardProps) {
  const classes = ["card", elevation && `elev-${elevation}`, className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}

export function CardKicker(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="card-kicker" {...props} />;
}

export function CardTitle(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="card-title" {...props} />;
}

export function CardBody(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p className="card-body" {...props} />;
}

export function CardMeta(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="card-meta" {...props} />;
}
