// components/Icons.jsx
// Zero-dependency icon set — every icon is a plain inline SVG that inherits
// currentColor and takes a `size` prop. Nothing to install.

function Svg({ size = 24, strokeWidth = 1.75, className = "", children, ...rest }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconChat(props) {
  return (
    <Svg {...props}>
      <path d="M20.8 11.6a8.3 8.3 0 0 1-12.2 7.4L3.6 20.4l1.4-4.8A8.3 8.3 0 1 1 20.8 11.6Z" />
      <path d="M8.6 11.6h.01M12 11.6h.01M15.4 11.6h.01" />
    </Svg>
  );
}

export function IconQuiz(props) {
  return (
    <Svg {...props}>
      <path d="M9 4H7.5A1.5 1.5 0 0 0 6 5.5v14A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 16.5 4H15" />
      <rect x="9" y="2.5" width="6" height="3.6" rx="1.2" />
      <path d="m9.2 13.2 2 2 3.6-3.8" />
    </Svg>
  );
}

export function IconExam(props) {
  return (
    <Svg {...props}>
      <path d="M2.6 8.6 12 4.1l9.4 4.5L12 13.1 2.6 8.6Z" />
      <path d="M6.6 10.7V16c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-5.3" />
      <path d="M21.4 8.6v5.1" />
    </Svg>
  );
}

export function IconCards(props) {
  return (
    <Svg {...props}>
      <rect x="7.4" y="3" width="12.6" height="14.4" rx="2.2" />
      <path d="M4.6 6.7A2.1 2.1 0 0 0 3 8.7v9.1A3.2 3.2 0 0 0 6.2 21h7.2" />
    </Svg>
  );
}

export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path d="M7.5 3.5h9v5.2a4.5 4.5 0 0 1-9 0V3.5Z" />
      <path d="M7.5 5.6H5A2.9 2.9 0 0 0 7.9 9.5" />
      <path d="M16.5 5.6H19a2.9 2.9 0 0 1-2.9 3.9" />
      <path d="M12 13.2V17" />
      <path d="M9.6 17 8.7 20.5" />
      <path d="M14.4 17l.9 3.5" />
      <path d="M8.4 20.5h7.2" />
    </Svg>
  );
}

export function IconMedal(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="15" r="5.8" />
      <path d="M8.3 9.6 5.7 3h4.4L12 7.8" />
      <path d="M15.7 9.6 18.3 3h-4.4L12 7.8" />
    </Svg>
  );
}

export function IconBook(props) {
  return (
    <Svg {...props}>
      <path d="M4 19.5v-14A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19v4H6.5A2.5 2.5 0 0 1 4 19.5Z" />
    </Svg>
  );
}

export function IconGlobe(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15.3 15.3 0 0 1 0 18 15.3 15.3 0 0 1 0-18Z" />
    </Svg>
  );
}

export function IconUser(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" />
    </Svg>
  );
}

export function IconHome(props) {
  return (
    <Svg {...props}>
      <path d="m4 10.2 8-6.5 8 6.5" />
      <path d="M6.2 9.4V20h11.6V9.4" />
      <path d="M10 20v-4.6h4V20" />
    </Svg>
  );
}

export function IconRefresh(props) {
  return (
    <Svg {...props}>
      <path d="M4 12a8 8 0 0 1 13.3-6" />
      <path d="M20 12a8 8 0 0 1-13.3 6" />
      <path d="M17.3 2.4v3.9h-3.9" />
      <path d="M6.7 21.6v-3.9h3.9" />
    </Svg>
  );
}

export function IconArrowLeft(props) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </Svg>
  );
}

export function IconArrowRight(props) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </Svg>
  );
}

export function IconSparkle(props) {
  return (
    <Svg {...props}>
      <path d="m12 3.4 2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2 2-5.6Z" />
    </Svg>
  );
}

export function IconFlag(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 3v18" />
      <path d="M5.5 4.4h11.9l-2.2 4 2.2 4H5.5" />
    </Svg>
  );
}

export function IconLightbulb(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.2a5.6 5.6 0 0 0-3.3 10.1c.6.5 1 1.2 1 2v.5h4.6v-.5c0-.8.4-1.5 1-2A5.6 5.6 0 0 0 12 3.2Z" />
      <path d="M9.8 18.7h4.4" />
      <path d="M10.6 21h2.8" />
    </Svg>
  );
}