/** Het tikje en het toontje bij het afvinken van een taak.
 *
 *  Het geluid wordt ter plekke gemaakt met de Web Audio API in plaats van uit
 *  een bestand geladen: twee korte tonen zijn een paar regels code, en zo komt
 *  er niets bij wat gedownload en in de cache gehouden moet worden.
 *
 *  Beide staan in localStorage en niet bij je account - of je app geluid mag
 *  maken hangt af van waar je bent, niet van wie je bent. */

export interface Feedback {
  geluid: boolean
  trillen: boolean
}

const SLEUTEL = 'mijn-taken:feedback'

export function leesFeedback(): Feedback {
  try {
    const ruw = localStorage.getItem(SLEUTEL)
    if (ruw) {
      const bewaard = JSON.parse(ruw) as Partial<Feedback>
      return {
        geluid: bewaard.geluid !== false,
        trillen: bewaard.trillen !== false,
      }
    }
  } catch {
    // Onleesbaar of geblokkeerd: dan maar met alles aan.
  }
  return { geluid: true, trillen: true }
}

export function bewaarFeedback(feedback: Feedback): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(feedback))
  } catch {
    // Niet kunnen onthouden is geen reden om te stoppen.
  }
}

/** Trillen kan alleen waar de browser het kent. Safari op de iPhone doet dit
 *  niet, hoe je het ook vraagt; dat hoort de instelling eerlijk te zeggen in
 *  plaats van een knop te tonen die niets doet. */
export function kanTrillen(): boolean {
  return typeof navigator.vibrate === 'function'
}

let context: AudioContext | null = null

/** Een browser laat geluid pas toe na een aanraking of klik. Afvinken is er
 *  een, dus wordt de context pas op dat moment gemaakt. */
function geefContext(): AudioContext | null {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

/** Twee tonen, de tweede hoger dan de eerste: dat klinkt als iets dat af is.
 *  Kort, zacht, en met een vloeiend begin en einde - een blokgolf die
 *  abrupt start geeft een klik die je door de speaker hoort. */
export function speelAfgerond(): void {
  const ctx = geefContext()
  if (!ctx) return

  const nu = ctx.currentTime
  const tonen = [880, 1318.5]

  tonen.forEach((hz, i) => {
    const bron = ctx.createOscillator()
    const volume = ctx.createGain()
    const begin = nu + i * 0.075

    bron.type = 'sine'
    bron.frequency.value = hz

    volume.gain.setValueAtTime(0.0001, begin)
    volume.gain.exponentialRampToValueAtTime(0.09, begin + 0.012)
    volume.gain.exponentialRampToValueAtTime(0.0001, begin + 0.17)

    bron.connect(volume)
    volume.connect(ctx.destination)
    bron.start(begin)
    bron.stop(begin + 0.2)
  })
}

/** Alles wat er gebeurt als je een taak afvinkt. Leest de instelling opnieuw,
 *  zodat een wijziging meteen geldt zonder dat er iets doorgegeven hoeft te
 *  worden. */
export function vierAf(): void {
  const feedback = leesFeedback()
  if (feedback.geluid) speelAfgerond()
  if (feedback.trillen && kanTrillen()) navigator.vibrate(18)
}
