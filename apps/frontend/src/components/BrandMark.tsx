export function BrandMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="55 90 402 376"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* open ring (未央 = not yet closed) */}
      <path
        d="M 256 118 C 154 118 82 190 82 277 C 82 369 159 435 256 435 C 353 435 430 369 430 277 C 430 231 410 190 379 164"
        stroke="currentColor"
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* rising check */}
      <path
        d="M 169 246 L 246 328 L 374 159"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
