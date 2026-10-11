import { cn } from '@/lib/utils'
import { useTheme } from '@/themes'

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

// Brand badge: the app-icon squircle, theme-aware — light mode shows the
// indigo glyph on white, dark mode on #0f1115. The PNG carries the rounded
// shape and transparent corners, so no tile/rounding classes here. Generated
// by scripts/generate-brand-assets.py; size via className (default size-14).
export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  const { renderedMode } = useTheme()
  const dark = renderedMode === 'dark'

  return (
    <span className={cn('inline-flex size-14 shrink-0 items-center justify-center', className)} {...props}>
      <img alt="" className="size-full object-contain" src={assetPath(dark ? 'brand-mark-dark.png' : 'brand-mark.png')} />
    </span>
  )
}
