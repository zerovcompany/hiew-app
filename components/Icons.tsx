type IconProps = { className?: string };

const base = "h-5 w-5";

export function IconSearch({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconHome({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBag({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 8V6a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="8" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconRoute({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="18" r="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7c4 0 3 8 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconUser({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconBasket({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 9h16l-1.6 9.4a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6L4 9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 9 12 3l4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13v4M15 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconShieldCheck({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3.5 5 6v6c0 4.4 3 7.6 7 8.5 4-.9 7-4.1 7-8.5V6l-7-2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLogout({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 16l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronDown({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSpinner({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconEmptyBox({ className = "h-14 w-14" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path d="M10 24 32 14l22 10-22 10-22-10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.55" />
      <path d="M10 24v18l22 10 22-10V24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.55" />
      <path d="M32 34v18" stroke="currentColor" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}
