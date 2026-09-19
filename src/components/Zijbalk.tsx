import { Menu } from './Menu'

/** Het menu als vaste kolom naast de pagina. Alleen op een breed scherm: op
 *  een telefoon is het menu een pagina op zichzelf (zie pages/Menupagina). */
export function Zijbalk({ opNieuweTaak }: { opNieuweTaak: () => void }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <Menu opNieuweTaak={opNieuweTaak} />
    </aside>
  )
}
