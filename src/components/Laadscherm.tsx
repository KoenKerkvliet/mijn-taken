export function Laadscherm({ tekst = 'Even laden…' }: { tekst?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-3 p-10 text-ink-soft">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-brand" />
      <span className="text-sm">{tekst}</span>
    </div>
  )
}
