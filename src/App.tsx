import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as d3 from "d3"

import breathCurtainCsv from "@/data/processed/breath_curtain_chl_daily.csv?raw"
import regionalCsv from "@/data/processed/regional_daily_surface_bgc_2024-03-01_2024-06-30.csv?raw"
import hemisphereWeeklyCsv from "@/data/processed/northern_hemisphere_chl_weekly_snapshots_1deg_2024-01-01_2024-06-30.csv?raw"

import ovalDiatomImg from "@/assets/phytoplankton/transparent/Oval_Diatom.png"
import roundCellImg from "@/assets/phytoplankton/transparent/Round_Cell.png"
import spikyRadialCellImg from "@/assets/phytoplankton/transparent/Spiky_Radial_Cell.png"
import chainColonyImg from "@/assets/phytoplankton/transparent/Chain_Colony.png"
import crescentCellImg from "@/assets/phytoplankton/transparent/Crescent_Cell.png"
import starClusterImg from "@/assets/phytoplankton/transparent/Star_Cluster.png"
import particleCloudImg from "@/assets/phytoplankton/transparent/Particle_Cloud.png"
import spiralFilamentImg from "@/assets/phytoplankton/transparent/Spiral_Filament.png"

import chlIllustration from "@/assets/act3/transparent/Chlorophyll_A.png"
import phycIllustration from "@/assets/act3/transparent/Phytoplankton_Carbon_Biomass.png"
import nppvIllustration from "@/assets/act3/transparent/Net_Primary_Production.png"
import no3Illustration from "@/assets/act3/transparent/Nitrate.png"
import o2Illustration from "@/assets/act3/transparent/Dissolved_Oxygen.png"

import exhalePathwayImg from "@/assets/act4/transparent/phytoplankton_flows_and_oxygen_exchange.png"

type BreathCurtainRow = {
  time: Date
  latitude: number
  chl: number
}

type RegionalRow = {
  time: Date
  chl: number
  phyc: number
  nppv: number
  o2: number
  no3: number
  zooc?: number
  dissic: number
  spco2: number
}

type HemisphereWeeklyRow = {
  snapshot: string
  weekStart: string
  weekEnd: string
  latitude: number
  longitude: number
  chl: number
  isLand: boolean
}

type MicroVariableKey = "chl" | "phyc" | "nppv" | "no3" | "o2"

type MicroVariable = {
  key: MicroVariableKey
  label: string
  shortLabel: string
  unit: string
  role: string
  whatItMeans: string
  whyItMatters: string
  howItAppears: string
  metaphor: string
}

const MICRO_VARIABLES: MicroVariable[] = [
  {
    key: "chl",
    label: "Chlorophyll-a",
    shortLabel: "Green signal",
    unit: "mg m⁻³",
    role: "The visible green signal",
    whatItMeans:
      "Chlorophyll-a is the photosynthetic pigment that allows phytoplankton to capture light.",
    whyItMatters:
      "Because chlorophyll changes the color of surface waters, it lets us detect blooms in ocean data.",
    howItAppears:
      "In this project, chlorophyll-a is the main green signal: it shapes the hemisphere map and the North Atlantic breath curtain.",
    metaphor:
      "The color of the breath — the trace that lets us see microscopic life from above.",
  },
  {
    key: "phyc",
    label: "Phytoplankton carbon biomass",
    shortLabel: "Living carbon",
    unit: "mmol m⁻³",
    role: "The living matter",
    whatItMeans:
      "Phytoplankton carbon biomass estimates the living carbon held in phytoplankton cells.",
    whyItMatters:
      "It connects the green signal to actual microscopic life: cells growing, dividing, and becoming part of the marine food web.",
    howItAppears:
      "In this project, biomass shows how the bloom becomes living ocean matter, not just a change in color.",
    metaphor:
      "The body of the breath — tiny cells multiplying into an ocean-scale pulse.",
  },
  {
    key: "nppv",
    label: "Net primary production",
    shortLabel: "New growth",
    unit: "mg C m⁻³ day⁻¹",
    role: "The rate of new growth",
    whatItMeans:
      "Net primary production estimates how quickly phytoplankton create new organic carbon through photosynthesis.",
    whyItMatters:
      "It is the bloom’s engine: sunlight is converted into new biomass that can feed ecosystems and enter carbon pathways.",
    howItAppears:
      "In this project, production helps explain when the bloom is actively generating new living matter.",
    metaphor: "The engine of the breath — sunlight becoming new living carbon.",
  },
  {
    key: "no3",
    label: "Nitrate",
    shortLabel: "Fuel",
    unit: "mmol m⁻³",
    role: "The winter-stocked fuel",
    whatItMeans: "Nitrate is a key nutrient that phytoplankton need to grow.",
    whyItMatters:
      "Winter mixing can replenish surface waters with nutrients. When spring light returns, phytoplankton consume that fuel.",
    howItAppears:
      "In this project, nitrate helps show the preparation and drawdown behind the spring bloom.",
    metaphor:
      "The fuel of the breath — stored below, lifted upward, then consumed by life.",
  },
  {
    key: "o2",
    label: "Dissolved oxygen",
    shortLabel: "Breath trace",
    unit: "mmol m⁻³",
    role: "The breath connection",
    whatItMeans: "Dissolved oxygen is the oxygen present in seawater.",
    whyItMatters:
      "Photosynthesis produces oxygen, but surface oxygen is also shaped by temperature, mixing, and air-sea exchange.",
    howItAppears:
      "In this project, oxygen is treated as part of the wider breathing system, not as a simple one-to-one output of the bloom.",
    metaphor:
      "The echo of the breath — biology and physics shaping oxygen conditions together.",
  },
]

const PHYTO_ILLUSTRATIONS = {
  ovalDiatom: ovalDiatomImg,
  roundCell: roundCellImg,
  spikyRadialCell: spikyRadialCellImg,
  chainColony: chainColonyImg,
  crescentCell: crescentCellImg,
  starCluster: starClusterImg,
  particleCloud: particleCloudImg,
  spiralFilament: spiralFilamentImg,
}

type PhytoIllustrationKey = keyof typeof PHYTO_ILLUSTRATIONS

const MICRO_VARIABLE_IMAGES: Record<MicroVariableKey, string> = {
  chl: chlIllustration,
  phyc: phycIllustration,
  nppv: nppvIllustration,
  no3: no3Illustration,
  o2: o2Illustration,
}

function useResponsiveSvgWidth(
  ref: React.RefObject<HTMLElement | null>,
  maxWidth: number,
  minWidth = 320
) {
  const [width, setWidth] = useState(maxWidth)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width
      setWidth(Math.max(minWidth, Math.min(maxWidth, nextWidth)))
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [ref, maxWidth, minWidth])

  return width
}

function FloatingPhytoIllustrations() {
  const organisms: {
    key: PhytoIllustrationKey
    x: string
    y: string
    size: string
    opacity: number
    delay: string
    dx: string
    dy: string
    rot: string
  }[] = [
    {
      key: "roundCell",
      x: "42%",
      y: "21%",
      size: "clamp(64px, 13vw, 150px)",
      opacity: 0.3,
      delay: "-3.4s",
      dx: "-14px",
      dy: "14px",
      rot: "-10deg",
    },
    {
      key: "spikyRadialCell",
      x: "55%",
      y: "38%",
      size: "clamp(72px, 14vw, 170px)",
      opacity: 0.24,
      delay: "-5.1s",
      dx: "-18px",
      dy: "-10px",
      rot: "12deg",
    },
    {
      key: "spiralFilament",
      x: "38%",
      y: "55%",
      size: "clamp(72px, 14vw, 170px)",
      opacity: 0.24,
      delay: "-4.3s",
      dx: "-16px",
      dy: "18px",
      rot: "16deg",
    },
    {
      key: "ovalDiatom",
      x: "24%",
      y: "43%",
      size: "clamp(62px, 12vw, 145px)",
      opacity: 0.26,
      delay: "-1.2s",
      dx: "18px",
      dy: "-12px",
      rot: "8deg",
    },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {organisms.map((organism) => (
        <img
          key={`${organism.key}-${organism.x}-${organism.y}`}
          src={PHYTO_ILLUSTRATIONS[organism.key]}
          alt=""
          aria-hidden="true"
          className="animate-floating-phyto absolute select-none"
          style={
            {
              left: organism.x,
              top: organism.y,
              width: organism.size,
              opacity: organism.opacity,
              "--delay": organism.delay,
              "--dx": organism.dx,
              "--dy": organism.dy,
              "--rot": organism.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

function PhytoCurrent({ variant }: { variant: "green" | "cyan" }) {
  const stroke =
    variant === "green" ? "rgba(43,182,115,0.24)" : "rgba(89,188,211,0.2)"

  const organisms: {
    key: PhytoIllustrationKey
    x: number
    y: number
    size: number
    opacity: number
    rot: number
  }[] =
    variant === "green"
      ? [
          {
            key: "roundCell",
            x: 95,
            y: 30,
            size: 44,
            opacity: 0.28,
            rot: -8,
          },
          {
            key: "ovalDiatom",
            x: 270,
            y: 12,
            size: 58,
            opacity: 0.28,
            rot: 18,
          },
          {
            key: "chainColony",
            x: 465,
            y: 28,
            size: 82,
            opacity: 0.28,
            rot: -4,
          },
          {
            key: "spiralFilament",
            x: 665,
            y: 14,
            size: 66,
            opacity: 0.28,
            rot: 12,
          },
          {
            key: "starCluster",
            x: 815,
            y: 22,
            size: 54,
            opacity: 0.28,
            rot: -10,
          },
        ]
      : [
          {
            key: "particleCloud",
            x: 105,
            y: 24,
            size: 62,
            opacity: 0.5,
            rot: 0,
          },
          {
            key: "crescentCell",
            x: 290,
            y: 8,
            size: 60,
            opacity: 0.28,
            rot: -14,
          },
          {
            key: "roundCell",
            x: 495,
            y: 35,
            size: 48,
            opacity: 0.28,
            rot: 10,
          },
          {
            key: "spikyRadialCell",
            x: 690,
            y: 10,
            size: 58,
            opacity: 0.28,
            rot: 8,
          },
          {
            key: "spiralFilament",
            x: 820,
            y: 28,
            size: 62,
            opacity: 0.28,
            rot: -8,
          },
        ]

  return (
    <div className="pointer-events-none mx-auto grid h-16 w-[min(1440px,calc(100%-32px))] place-items-center opacity-100 sm:h-20 sm:w-[min(1440px,calc(100%-40px))] lg:h-32">
      <svg
        viewBox="0 0 980 100"
        className="h-16 w-full max-w-5xl overflow-visible sm:h-20 lg:h-28"
        aria-hidden="true"
      >
        <path
          d={
            variant === "green"
              ? "M40 60 C170 16 250 92 390 50 C555 0 680 92 890 42"
              : "M70 38 C205 82 326 20 460 58 C594 98 692 18 900 54"
          }
          fill="none"
          stroke={stroke}
          strokeWidth={1.2}
          strokeLinecap="round"
        />

        {organisms.map((organism, index) => (
          <g
            key={`${variant}-${organism.key}-${organism.x}`}
            className="animate-current-phyto"
            style={
              {
                "--delay": `${index * -2.2}s`,
                "--dx": `${index % 2 === 0 ? 10 : -12}px`,
                "--dy": `${index % 2 === 0 ? -6 : 8}px`,
                "--rot": `${organism.rot}deg`,
              } as React.CSSProperties
            }
          >
            <image
              href={PHYTO_ILLUSTRATIONS[organism.key]}
              x={organism.x}
              y={organism.y}
              width={organism.size}
              height={organism.size}
              opacity={organism.opacity}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

function parseBreathCurtain(): BreathCurtainRow[] {
  return d3.csvParse(breathCurtainCsv, (d) => ({
    time:
      d3.timeParse("%Y-%m-%d")(d.time as string) ?? new Date(d.time as string),
    latitude: Number(d.latitude),
    chl: Number(d.chl),
  }))
}

function parseRegional(): RegionalRow[] {
  return d3.csvParse(regionalCsv, (d) => {
    const zoocValue =
      d.zooc === undefined || d.zooc === "" ? undefined : Number(d.zooc)

    return {
      time:
        d3.timeParse("%Y-%m-%d")(d.time as string) ??
        new Date(d.time as string),
      chl: Number(d.chl),
      phyc: Number(d.phyc),
      nppv: Number(d.nppv),
      o2: Number(d.o2),
      no3: Number(d.no3),
      zooc: zoocValue,
      dissic: Number(d.dissic),
      spco2: Number(d.spco2),
    }
  })
}

function parseHemisphereWeekly(): HemisphereWeeklyRow[] {
  return d3.csvParse(hemisphereWeeklyCsv, (d) => ({
    snapshot: d.snapshot as string,
    weekStart: d.week_start as string,
    weekEnd: d.week_end as string,
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    chl: d.chl === "" ? NaN : Number(d.chl),
    isLand: d.is_land === "True" || d.is_land === "true",
  }))
}

function formatDateShort(date: Date) {
  return d3.timeFormat("%b %-d")(date)
}

function formatMetric(value: number) {
  if (!Number.isFinite(value)) return "—"

  if (Math.abs(value) >= 100) {
    return d3.format(".0f")(value)
  }

  if (Math.abs(value) >= 10) {
    return d3.format(".1f")(value)
  }

  return d3.format(".2f")(value)
}

function App() {
  const breathCurtainData = useMemo(() => parseBreathCurtain(), [])
  const regionalData = useMemo(() => parseRegional(), [])
  const hemisphereWeeklyData = useMemo(() => parseHemisphereWeekly(), [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8f3] text-[#123238]">
      <OceanBackground />
      <SiteHeader />
      <div aria-hidden="true" className="h-[32px] sm:h-10 lg:h-14" />
      <HeroSection />
      <SourceSection />
      <BloomSection data={hemisphereWeeklyData} />

      <div className="my-3 sm:my-5 lg:my-12">
        <PhytoCurrent variant="green" />
      </div>

      <NorthAtlanticInhaleSection data={breathCurtainData} />

      <div className="my-1 sm:my-2 lg:my-6">
        <PhytoCurrent variant="green" />
      </div>

      <InsideBreathSection data={regionalData} />

      <div className="my-3 sm:my-5 lg:my-12">
        <PhytoCurrent variant="green" />
      </div>

      <ExhaleSection data={regionalData} />
      <EndingSection />

      <Footer />
    </main>
  )
}

function SectionIntro({
  eyebrow,
  scope,
  title,
  titleAccent,
  lead,
  body,
  secondaryBody,
  rightAside,
  compact = false,
  className = "mb-14",
}: {
  eyebrow: string
  scope?: string
  title: React.ReactNode
  titleAccent?: React.ReactNode
  lead?: React.ReactNode
  body: React.ReactNode
  secondaryBody?: React.ReactNode
  rightAside?: React.ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={`grid items-start gap-8 md:gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:items-end lg:gap-12 ${className}`}
    >
      <div>
        <div className="mb-5">
          <p className="text-xs font-bold tracking-[0.18em] text-[#2bb673] uppercase">
            {eyebrow}
          </p>

          {scope ? (
            <p className="mt-3 text-xs font-bold tracking-[0.14em] text-[#5d7c7c] uppercase">
              {scope}
            </p>
          ) : null}
        </div>

        <h2
          className={
            compact
              ? "font-serif text-[clamp(2.1rem,10vw,3.6rem)] leading-[0.94] tracking-[-0.045em] text-[#123238]"
              : "text-[clamp(2.7rem,5.6vw,5.6rem)] leading-[0.92] tracking-[-0.06em] text-[#123238]"
          }
        >
          {title}
          {titleAccent ? (
            <span className="block text-[#2bb673]">{titleAccent}</span>
          ) : null}
        </h2>

        {lead ? (
          <p
            className={
              compact
                ? "mt-5 max-w-xl font-serif text-[clamp(1.05rem,1.25vw,1.3rem)] leading-[1.24] tracking-[-0.015em] text-[#123238]"
                : "mt-7 max-w-2xl font-serif text-[clamp(1.25rem,1.7vw,1.65rem)] leading-[1.18] tracking-[-0.02em] text-[#123238]"
            }
          >
            {lead}
          </p>
        ) : null}
      </div>

      <div className="max-w-xl lg:justify-self-end">
        <p className="text-[15px] leading-8 text-[#45696a]">{body}</p>

        {secondaryBody ? (
          <p className="mt-5 text-[14px] leading-7 text-[#5d7c7c]">
            {secondaryBody}
          </p>
        ) : null}

        {rightAside ? <div className="mt-8">{rightAside}</div> : null}
      </div>
    </div>
  )
}

function OceanBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_4%,rgba(122,231,255,0.18),transparent_34rem),radial-gradient(circle_at_82%_9%,rgba(141,247,180,0.14),transparent_28rem),linear-gradient(180deg,#06151d_0%,#071822_36%,#03080c_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50 [background:linear-gradient(115deg,transparent_0_17%,rgba(100,255,210,0.045)_29%,transparent_43%),repeating-radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),rgba(255,255,255,0.05)_1px,transparent_2px,transparent_18px)]" />
      <div className="pointer-events-none fixed right-[-10vw] -bottom-[20vh] left-[-10vw] -z-10 h-[44vh] blur-2xl [background:radial-gradient(ellipse_at_center,rgba(61,217,138,0.15),transparent_65%),linear-gradient(180deg,transparent,rgba(4,10,14,0.95))]" />
    </>
  )
}

function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#123238]/8 bg-[#f4f8f3]/75 backdrop-blur-xl">
      <div className="mx-auto w-[min(1440px,calc(100%-32px))] sm:w-[min(1440px,calc(100%-40px))]">
        <div className="flex h-9 items-center justify-between gap-4 sm:h-14 sm:gap-6">
          <a
            href="#top"
            className="flex items-center gap-2 text-[10px] tracking-[0.12em] text-[#45696a] uppercase sm:gap-3 sm:text-xs sm:tracking-[0.14em]"
          >
            <img
              src={starClusterImg}
              alt=""
              aria-hidden="true"
              className="-ml-1 h-4 w-4 object-contain opacity-80 sm:-ml-2 sm:h-5 sm:w-5 sm:opacity-100"
            />
            <span>Every Second Breath</span>
          </a>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-4 text-[12px] text-[#345c5d] sm:flex md:gap-6 md:text-sm"
          >
            <a href="#bloom" className="transition hover:text-[#2bb673]">
              Bloom
            </a>
            <a href="#evidence" className="transition hover:text-[#2bb673]">
              North Atlantic
            </a>
            <a href="#inside" className="transition hover:text-[#2bb673]">
              Inside
            </a>
            <a href="#exhale" className="transition hover:text-[#2bb673]">
              Exhale
            </a>
            <a href="#meaning" className="transition hover:text-[#2bb673]">
              Meaning
            </a>
          </nav>
        </div>

        <nav
          aria-label="Mobile navigation"
          className="flex items-center gap-3 overflow-x-auto border-t border-[#123238]/8 py-2 text-[10px] tracking-[0.02em] text-[#345c5d] sm:hidden"
        >
          <a href="#bloom" className="shrink-0 transition hover:text-[#2bb673]">
            Bloom
          </a>
          <a
            href="#evidence"
            className="shrink-0 transition hover:text-[#2bb673]"
          >
            North Atlantic
          </a>
          <a
            href="#inside"
            className="shrink-0 transition hover:text-[#2bb673]"
          >
            Inside
          </a>
          <a
            href="#exhale"
            className="shrink-0 transition hover:text-[#2bb673]"
          >
            Exhale
          </a>
          <a
            href="#meaning"
            className="shrink-0 transition hover:text-[#2bb673]"
          >
            Meaning
          </a>
        </nav>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section
      id="top"
      className="mx-auto grid min-h-[58svh] w-[min(1440px,calc(100%-32px))] items-center pt-0 pb-0 sm:min-h-[58svh] sm:w-[min(1440px,calc(100%-40px))] sm:pt-2 md:min-h-[62svh] md:pt-4 lg:min-h-[72svh] lg:pt-16"
    >
      <div className="relative grid min-h-[min(560px,calc(100svh-150px))] items-center">
        <div className="pointer-events-none absolute top-4 right-0 aspect-square w-[min(62vw,790px)] min-w-[420px] translate-x-[24%] rounded-full opacity-80 max-md:right-[-20vw] max-md:w-[95vw] max-md:min-w-0 max-md:translate-x-0 max-md:opacity-45">
          <div className="absolute inset-[11%] animate-slow-turn rounded-full opacity-45 blur-xl [background:radial-gradient(circle_at_42%_45%,rgba(141,247,180,0.34),transparent_26%),radial-gradient(circle_at_52%_55%,rgba(122,231,255,0.11),transparent_58%),conic-gradient(from_30deg,rgba(141,247,180,0.11),rgba(122,231,255,0.07),rgba(255,245,214,0.08),rgba(141,247,180,0.11))]" />
          <div className="absolute inset-[21%] animate-breathe rounded-full border border-[#2bb673]/8 opacity-55 shadow-[0_0_70px_rgba(141,247,180,0.18),inset_0_0_70px_rgba(122,231,255,0.07)]" />
          <FloatingPhytoIllustrations />
        </div>

        <div className="relative z-10 max-w-5xl -translate-y-6 self-center max-md:translate-y-0">
          <div className="mb-5 text-xs font-bold tracking-[0.18em] text-[#2bb673] uppercase">
            North Atlantic spring bloom · March–June 2024
          </div>

          <h1 className="font-serif text-[clamp(4.7rem,12vw,12.5rem)] leading-[0.82] tracking-[-0.085em] text-[#123238]">
            <span>Every Second</span>
            <span className="block pl-[clamp(0px,10vw,160px)] text-[#2bb673] max-sm:pl-0">
              Breath
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-7 text-[#45696a]">
            A visual story about the microscopic ocean life behind the air we
            breathe. Each spring, phytoplankton bloom across the North Atlantic:
            invisible as individuals, planetary in consequence.
          </p>

          <p className="mt-10 text-xs font-bold tracking-[0.18em] text-[#2bb673] uppercase">
            Scroll to follow the breath
          </p>
        </div>
      </div>
    </section>
  )
}

function InsideBreathSection({ data }: { data: RegionalRow[] }) {
  return (
    <section
      id="inside"
      className="mx-auto w-[min(1440px,calc(100%-32px))] py-16 sm:w-[min(1440px,calc(100%-40px))] sm:py-20 lg:py-28"
    >
      <SectionIntro
        eyebrow="Act III · Inside the breath"
        scope="North Atlantic focus · daily surface data · March–June 2024"
        title="Inside the breath,"
        titleAccent="a system moves."
        body={
          <>
            The green signal is only the surface trace. Inside it are
            chlorophyll-bearing cells using light, carbon, and nutrients to grow
            and divide.
          </>
        }
        secondaryBody={
          <>
            Click a microscopic layer to reveal the data behind the breath:
            pigment, biomass, production, nutrients, and oxygen.
          </>
        }
      />

      <MicroBloomExplorer data={data} />

      <InsideMechanismStrip />
    </section>
  )
}

function MicroBloomExplorer({ data }: { data: RegionalRow[] }) {
  const [selectedKey, setSelectedKey] = useState<MicroVariableKey>("chl")

  const selectedVariable =
    MICRO_VARIABLES.find((variable) => variable.key === selectedKey) ??
    MICRO_VARIABLES[0]

  const stats = useMemo(() => {
    return MICRO_VARIABLES.map((variable) => {
      const values = data
        .map((row) => row[variable.key])
        .filter((value) => Number.isFinite(value))

      const maxValue = d3.max(values) ?? 0
      const minValue = d3.min(values) ?? 0
      const meanValue = d3.mean(values) ?? 0

      const peakRow = data.reduce<RegionalRow | null>((best, row) => {
        if (!best) return row
        return row[variable.key] > best[variable.key] ? row : best
      }, null)

      return {
        key: variable.key,
        minValue,
        maxValue,
        meanValue,
        peakDate: peakRow ? formatDateShort(peakRow.time) : "—",
      }
    })
  }, [data])

  const selectedStats =
    stats.find((item) => item.key === selectedVariable.key) ?? stats[0]

  return (
    <div className="relative grid items-start gap-10 md:grid-cols-[0.72fr_0.98fr] md:gap-10 lg:ml-10 lg:gap-14">
      <div className="relative min-h-[420px] pt-6 sm:min-h-[460px] md:min-h-[520px] lg:min-h-[560px]">
        <div className="relative z-10 max-w-md text-left">
          <p className="text-xs font-bold tracking-[0.18em] text-[rgba(43,182,115,0.8)] uppercase">
            Explore the microscopic engine
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#5d7c7c]">
            Each illustration represents one layer of the bloom system.
          </p>
        </div>

        <div className="relative -mt-2 w-[min(600px,100%)] max-w-md max-xl:mt-6">
          <MicroIllustrationField
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
          />
        </div>
      </div>

      <div className="relative min-h-0 px-0 pt-6 pb-8 md:min-h-[520px] md:px-6 lg:min-h-[560px] lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold tracking-[0.18em] text-[#2bb673] uppercase">
            Bloom layer
          </p>

          <h3 className="mt-3 text-[clamp(1.8rem,2.7vw,3rem)] leading-[0.98] font-bold tracking-[-0.055em] whitespace-nowrap text-[#123238] max-md:whitespace-normal">
            {selectedVariable.label}
          </h3>

          <p className="mt-3 text-xs text-[#5d7c7c]">
            Unit: {selectedVariable.unit}
          </p>
        </div>

        <p className="text-lg font-bold text-[#123238]">
          {selectedVariable.role}
        </p>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#123238]/10 pt-4 text-sm text-[#45696a]">
          <span>
            <span className="font-bold tracking-[0.12em] text-[#2bb673] uppercase">
              Mean
            </span>{" "}
            {formatMetric(selectedStats.meanValue)}
          </span>

          <span>
            <span className="font-bold tracking-[0.12em] text-[#2bb673] uppercase">
              Max
            </span>{" "}
            {formatMetric(selectedStats.maxValue)}
          </span>

          <span>
            <span className="font-bold tracking-[0.12em] text-[#2bb673] uppercase">
              Peak
            </span>{" "}
            {selectedStats.peakDate}
          </span>
        </div>

        <div className="mt-8 min-h-[190px]">
          <MicroEditorialNote
            title="What it means"
            text={selectedVariable.whatItMeans}
          />

          <MicroEditorialNote
            title="Why it matters"
            text={selectedVariable.whyItMatters}
          />

          <MicroEditorialNote
            title="How it appears here"
            text={selectedVariable.howItAppears}
          />
        </div>

        <div className="mt-8 grid gap-4 border-t border-[#123238]/10 pt-5 sm:grid-cols-[150px_1fr]">
          <p className="m-0 text-xs leading-7 font-bold tracking-[0.16em] text-[#2bb673] uppercase">
            Breath metaphor
          </p>

          <p className="m-0 text-sm leading-7 text-[#45696a]">
            {selectedVariable.metaphor}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[150px_1fr]">
          <p className="m-0 text-xs leading-7 font-bold tracking-[0.16em] text-[#2bb673] uppercase">
            Trace
          </p>

          <div>
            <MiniSparkline
              data={data}
              variableKey={selectedVariable.key}
              color="#2bb673"
            />

            <p className="mt-2 max-w-[520px] pl-[13px] text-[11px] leading-5 text-[#7b9695]">
              Each trace uses its own scale to reveal timing and shape, not
              absolute magnitude.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MicroEditorialNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-[88px] items-start gap-4 border-t border-[#123238]/10 pt-4 sm:grid-cols-[150px_1fr]">
      <p className="m-0 text-xs leading-7 font-bold tracking-[0.16em] text-[#2bb673] uppercase">
        {title}
      </p>

      <p className="m-0 text-sm leading-7 text-[#45696a]">{text}</p>
    </div>
  )
}

function InsideMechanismStrip() {
  const steps = [
    {
      title: "Stored fuel",
      detail: "Nitrate remains near the surface.",
    },
    {
      title: "Returning light",
      detail: "Longer spring days unlock growth.",
    },
    {
      title: "Bloom engine",
      detail: "Production turns light into living carbon.",
    },
    {
      title: "Drawdown",
      detail: "The nutrient store is gradually consumed.",
    },
  ]

  return (
    <div className="mt-14 w-full pt-10 lg:ml-10 lg:w-[calc(100%-2.5rem)]">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] text-[#2bb673] uppercase">
          Mechanism in one breath
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute top-5 right-0 left-0 hidden h-px bg-gradient-to-r from-[#2bb673]/0 via-[#2bb673]/35 to-[#2bb673]/0 sm:block" />

        <div className="grid gap-6 sm:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative pt-10">
              <div className="absolute top-3 left-0 h-4 w-4 rounded-full border border-[#2bb673]/30 bg-[#f4f8f3] shadow-[0_0_22px_rgba(43,182,115,0.18)]" />

              <p className="text-[10px] font-bold tracking-[0.18em] text-[#2bb673] uppercase">
                0{index + 1}
              </p>

              <h4 className="mt-3 text-lg font-bold tracking-[-0.035em] text-[#123238]">
                {step.title}
              </h4>

              <p className="mt-2 text-sm leading-6 text-[#5d7c7c]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MicroIllustrationField({
  selectedKey,
  onSelect,
}: {
  selectedKey: MicroVariableKey
  onSelect: (key: MicroVariableKey) => void
}) {
  const items = MICRO_VARIABLES.map((variable) => ({
    key: variable.key,
    label: variable.label,
    shortLabel: variable.shortLabel,
    image: MICRO_VARIABLE_IMAGES[variable.key],
  }))

  const positions: Record<
    MicroVariableKey,
    {
      x: string
      y: string
      size: string
      rotate: string
      delay: string
    }
  > = {
    chl: {
      x: "50%",
      y: "48%",
      size: "142px",
      rotate: "-4deg",
      delay: "-1.2s",
    },
    phyc: {
      x: "26%",
      y: "34%",
      size: "116px",
      rotate: "8deg",
      delay: "-3.8s",
    },
    nppv: {
      x: "74%",
      y: "34%",
      size: "120px",
      rotate: "-10deg",
      delay: "-5.1s",
    },
    no3: {
      x: "30%",
      y: "70%",
      size: "112px",
      rotate: "-7deg",
      delay: "-2.6s",
    },
    o2: {
      x: "72%",
      y: "70%",
      size: "116px",
      rotate: "11deg",
      delay: "-4.4s",
    },
  }

  const selectedVariable = MICRO_VARIABLES.find(
    (variable) => variable.key === selectedKey
  )

  return (
    <div className="relative z-10">
      <div className="relative mx-auto aspect-square w-[min(520px,100%)] rounded-full">
        <div className="pointer-events-none absolute inset-[4%] rounded-full border border-[rgba(43,182,115,0.11)] bg-[radial-gradient(circle_at_42%_38%,rgba(43,182,115,0.10),transparent_44%),radial-gradient(circle_at_68%_72%,rgba(89,188,211,0.08),transparent_42%)] shadow-[0_0_90px_rgba(141,247,180,0.15),inset_0_0_80px_rgba(122,231,255,0.07)]" />

        <div className="pointer-events-none absolute inset-[20%] rounded-full border border-[rgba(43,182,115,0.08)]" />
        <div className="pointer-events-none absolute inset-[35%] rounded-full bg-[#2bb673]/[0.035]" />

        {items.map((item) => {
          const isSelected = item.key === selectedKey
          const position = positions[item.key]

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-label={`Explore ${item.label}`}
              className={`absolute grid h-[var(--micro-size)] w-[var(--micro-size)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:ring-[#2bb673]/35 focus-visible:outline-none md:h-[calc(var(--micro-size)*0.78)] md:w-[calc(var(--micro-size)*0.78)] xl:h-[var(--micro-size)] xl:w-[var(--micro-size)] ${
                isSelected
                  ? "z-20 scale-110"
                  : "z-10 scale-100 opacity-62 hover:scale-105 hover:opacity-90"
              }`}
              style={
                {
                  left: position.x,
                  top: position.y,
                  "--micro-size": position.size,
                } as React.CSSProperties
              }
            >
              <span
                className={`absolute inset-0 rounded-full transition-all duration-500 ${
                  isSelected
                    ? "bg-white/45 shadow-[0_0_48px_rgba(43,182,115,0.24)] ring-1 ring-[#2bb673]/30"
                    : "bg-white/10 shadow-[0_0_26px_rgba(18,50,56,0.04)]"
                }`}
              />

              <img
                src={item.image}
                alt=""
                aria-hidden="true"
                className="animate-floating-phyto relative z-10 h-full w-full object-contain p-2"
                style={
                  {
                    "--dx": isSelected ? "8px" : "5px",
                    "--dy": isSelected ? "-7px" : "6px",
                    "--rot": position.rotate,
                    "--delay": position.delay,
                  } as React.CSSProperties
                }
              />
            </button>
          )
        })}
      </div>

      <div className="-mt-2 text-center">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#2bb673] uppercase">
          {selectedVariable?.shortLabel}
        </p>
      </div>
    </div>
  )
}

function MiniSparkline({
  data,
  variableKey,
  color,
}: {
  data: RegionalRow[]
  variableKey: MicroVariableKey
  color: string
}) {
  const width = 360
  const height = 90
  const margin = { top: 10, right: 8, bottom: 18, left: 8 }

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.time) as [Date, Date])
    .range([margin.left, width - margin.right])

  const values = data
    .map((d) => d[variableKey])
    .filter((value) => Number.isFinite(value))

  const yScale = d3
    .scaleLinear()
    .domain([d3.min(values) ?? 0, d3.max(values) ?? 1])
    .nice()
    .range([height - margin.bottom, margin.top])

  const line = d3
    .line<RegionalRow>()
    .x((d) => xScale(d.time))
    .y((d) => yScale(d[variableKey]))
    .curve(d3.curveCatmullRom.alpha(0.5))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full"
      role="img"
      aria-label={`Daily trend for ${variableKey}`}
    >
      <path
        d={line(data) ?? ""}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        opacity={0.9}
      />

      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={height - margin.bottom}
        y2={height - margin.bottom}
        stroke="rgba(18,50,56,0.12)"
      />

      <text
        x={margin.left}
        y={height - 2}
        className="fill-[#5d7c7c] text-[10px]"
      >
        Mar
      </text>

      <text
        x={width - margin.right}
        y={height - 2}
        textAnchor="end"
        className="fill-[#5d7c7c] text-[10px]"
      >
        Jun
      </text>
    </svg>
  )
}

function MiniTrace({
  data,
  valueKey,
  label,
  caption,
  footer,
  startDate,
}: {
  data: RegionalRow[]
  valueKey: keyof Pick<RegionalRow, "zooc" | "dissic" | "spco2">
  label: string
  caption: string
  footer: string
  startDate: string
}) {
  const start = new Date(startDate)

  const sparkDataRaw = data
    .filter((d) => {
      const value = d[valueKey]

      return (
        d.time >= start &&
        value !== undefined &&
        value !== null &&
        Number.isFinite(value)
      )
    })
    .map((d) => ({
      date: d.time,
      value: d[valueKey] as number,
    }))

  if (sparkDataRaw.length < 2) return null

  const firstValue = sparkDataRaw[0].value

  const sparkData = sparkDataRaw.map((d) => ({
    date: d.date,
    value: ((d.value - firstValue) / firstValue) * 100,
  }))

  const width = 190
  const height = 42

  const x = d3
    .scaleTime()
    .domain(d3.extent(sparkData, (d) => d.date) as [Date, Date])
    .range([0, width])

  const maxAbs = d3.max(sparkData, (d) => Math.abs(d.value)) ?? 1

  const y = d3
    .scaleLinear()
    .domain([-maxAbs, maxAbs])
    .nice()
    .range([height - 8, 6])

  const line = d3
    .line<(typeof sparkData)[number]>()
    .x((d) => x(d.date))
    .y((d) => y(d.value))
    .curve(d3.curveBasis)

  const area = d3
    .area<(typeof sparkData)[number]>()
    .x((d) => x(d.date))
    .y0(height - 8)
    .y1((d) => y(d.value))
    .curve(d3.curveBasis)

  return (
    <div className="w-[220px] shrink-0 pt-0">
      <p className="text-[10px] font-bold tracking-[0.12em] whitespace-nowrap text-[#2bb673] uppercase">
        {label}
      </p>

      <p className="mt-1 text-[12px] leading-5 text-[#5d7c7c]">{caption}</p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-10 w-[190px] overflow-visible"
        role="img"
        aria-label={`${label}: ${caption}`}
      >
        <path d={area(sparkData) ?? ""} fill="#2bb673" fillOpacity={0.08} />

        <line
          x1={0}
          x2={width}
          y1={y(0)}
          y2={y(0)}
          stroke="#123238"
          strokeOpacity={0.14}
        />

        <path
          d={line(sparkData) ?? ""}
          fill="none"
          stroke="#2bb673"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>

      <p className="mt-1 text-[10px] leading-4 text-[#7b9695]">{footer}</p>
    </div>
  )
}

function ExhaleSection({ data }: { data: RegionalRow[] }) {
  const nodes = [
    {
      title: "Matter moves through life",
      text: "Carbon enters grazers, fish, and marine food webs.",
      trace: {
        valueKey: "zooc" as const,
        label: "Zooplankton response",
        caption: "A grazing layer appears after the peak.",
        footer: "Relative change · 23 Apr–30 Jun",
        startDate: "2024-04-23",
      },
    },
    {
      title: "Matter moves through ocean pathways",
      text: "Some carbon remains dissolved, transformed, or carried through the surface ocean.",
      trace: {
        valueKey: "dissic" as const,
        label: "Dissolved carbon pool",
        caption: "Carbon remains in the seawater system.",
        footer: "Relative change · 23 Apr–30 Jun",
        startDate: "2024-04-23",
      },
    },
    {
      title: "Breath connects outward",
      text: "At the surface, ocean carbon conditions meet the atmosphere above.",
      trace: {
        valueKey: "spco2" as const,
        label: "Air–sea CO₂ context",
        caption: "The surface holds an exchange signal.",
        footer: "Relative change · 23 Apr–30 Jun",
        startDate: "2024-04-23",
      },
    },
  ]

  return (
    <section
      id="exhale"
      className="m:pb-16 mx-auto w-[min(1440px,calc(100%-32px))] py-16 pb-12 sm:w-[min(1440px,calc(100%-40px))] sm:py-20 lg:py-28 lg:pb-22"
    >
      <SectionIntro
        eyebrow="Act IV · Exhale"
        scope="North Atlantic focus · daily surface data · 23 April–30 June 2024"
        title="The breath leaves"
        titleAccent="a living trace."
        body={
          <>
            The spring bloom does not simply disappear. As nutrients are drawn
            down and grazers catch up, the green signal softens — but the matter
            it created keeps moving.
          </>
        }
        secondaryBody={
          <>
            Some of that living carbon enters food webs. Some remains dissolved
            or transformed within the ocean&apos;s carbon system. And at the
            surface, seawater CO₂ conditions connect the bloom back to the
            atmosphere above.
          </>
        }
      />

      <div className="relative mt-8 overflow-visible py-4 sm:py-6 lg:py-8">
        <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_24%_48%,rgba(43,182,115,0.12),transparent_24%),radial-gradient(circle_at_78%_55%,rgba(89,188,211,0.07),transparent_28%)] md:block" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:gap-12">
          <div className="relative -mt-4 lg:-mt-10 lg:-mr-16">
            <img
              src={exhalePathwayImg}
              alt="Illustration showing bloom matter moving through food webs, ocean carbon pathways, and the atmosphere connection."
              className="mr-auto w-full max-w-none object-contain opacity-65 lg:w-[calc(100%+64px)]"
            />
          </div>

          <div className="max-w-xl space-y-14 self-center lg:justify-self-end">
            {nodes.map((node) => (
              <div
                key={node.title}
                className="grid items-start gap-8 sm:grid-cols-[minmax(0,1fr)_210px]"
              >
                <div className="min-w-0">
                  <h3 className="text-[13px] leading-tight font-bold tracking-[-0.02em] text-[#123238]/90">
                    {node.title}
                  </h3>

                  <p className="mt-2 text-[13px] leading-6 text-[#5d7c7c]">
                    {node.text}
                  </p>
                </div>

                <MiniTrace
                  data={data}
                  valueKey={node.trace.valueKey}
                  label={node.trace.label}
                  caption={node.trace.caption}
                  footer={node.trace.footer}
                  startDate={node.trace.startDate}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function NorthAtlanticInhaleSection({ data }: { data: BreathCurtainRow[] }) {
  return (
    <section
      id="evidence"
      className="mx-auto w-[min(1440px,calc(100%-32px))] pt-20 pb-12 sm:w-[min(1440px,calc(100%-40px))] sm:pt-22 sm:pb-14 lg:pt-28 lg:pb-16"
    >
      <SectionIntro
        eyebrow="Act II · The North Atlantic inhales"
        scope="North Atlantic focus · daily surface data · March–June 2024"
        title="The inhale moves"
        titleAccent="north."
        body={
          <>
            The hemisphere view showed a planetary pulse. Here, the story
            narrows to the North Atlantic and unfolds through time: each column
            is a day, each row is latitude, and the bright band reveals spring
            moving northward. Read left to right as time, and bottom to top as
            the bloom moving north through spring.
          </>
        }
        secondaryBody={
          <>
            The regional chlorophyll-a peak arrives on 24 April 2024, while the
            bright band continues to tilt toward higher latitudes as spring
            unfolds.
          </>
        }
      />

      <div className="relative overflow-hidden px-0 py-7 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <BreathCurtainChart data={data} />
        </div>
      </div>
    </section>
  )
}

function BreathCurtainChart({ data }: { data: BreathCurtainRow[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const width = useResponsiveSvgWidth(containerRef, 920)
  const isSmallScreen = width < 640

  const chartHeight =
    width < 520
      ? Math.max(250, Math.round(width * 0.62))
      : width < 760
        ? Math.max(340, Math.round(width * 0.58))
        : 500

  const height = chartHeight + (isSmallScreen ? 54 : 0)

  const margin = {
    top: width < 520 ? 34 : 36,
    right: width < 520 ? 18 : 28,
    bottom: isSmallScreen ? 112 : 78,
    left: width < 520 ? 48 : 62,
  }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const { cells, xScale, yScale, colorScale, months, latTicks } =
    useMemo(() => {
      const times = Array.from(new Set(data.map((d) => +d.time)))
        .sort((a, b) => a - b)
        .map((d) => new Date(d))

      const latitudes = Array.from(new Set(data.map((d) => d.latitude))).sort(
        (a, b) => a - b
      )

      const x = d3
        .scaleTime()
        .domain(d3.extent(times) as [Date, Date])
        .range([0, innerWidth])

      const y = d3
        .scaleLinear()
        .domain(d3.extent(latitudes) as [number, number])
        .range([innerHeight, 0])

      const values = data.map((d) => d.chl)
      const colorDomain: [number, number] = [
        d3.quantile(values, 0.02) ?? 0,
        d3.quantile(values, 0.98) ?? 1.6,
      ]
      const color = d3
        .scaleSequential<string>()
        .domain(colorDomain)
        .interpolator((t) =>
          d3.interpolateRgbBasis([
            "#edf7f2",
            "#c9eddc",
            "#8bd9aa",
            "#2bb673",
            "#087a58",
          ])(t)
        )

      const timeStep = innerWidth / times.length
      const latStep = innerHeight / latitudes.length

      return {
        cells: data.map((d) => ({
          ...d,
          x: x(d.time),
          y: y(d.latitude),
          width: timeStep + 1,
          height: latStep + 1,
          fill: color(d.chl),
        })),
        xScale: x,
        yScale: y,
        colorScale: color,
        months:
          d3.timeMonth
            .every(1)
            ?.range(times[0], d3.timeDay.offset(times.at(-1)!, 1)) ?? [],
        latTicks: [35, 45, 55, 65],
      }
    }, [data, innerHeight, innerWidth])

  const timeLabelX = xScale(months[0] ?? new Date("2024-03-01")) - 9
  const timeLabelY = innerHeight + 64

  const legendX = isSmallScreen ? timeLabelX - 18 : innerWidth - 250
  const legendY = isSmallScreen ? timeLabelY + 18 : innerHeight - 42

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full max-w-full"
        role="img"
        aria-label="Breath curtain showing daily chlorophyll-a by latitude"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          <rect
            width={innerWidth}
            height={innerHeight}
            rx={18}
            fill="#edf7f2"
          />

          {cells.map((cell, i) => (
            <rect
              key={i}
              x={cell.x}
              y={cell.y}
              width={cell.width}
              height={cell.height}
              fill={cell.fill}
              opacity={0.92}
            />
          ))}

          {latTicks.map((lat) => (
            <text
              key={lat}
              x={-14}
              y={yScale(lat) + 4}
              textAnchor="end"
              className="fill-[#5d7c7c] text-[11px]"
            >
              {lat}°N
            </text>
          ))}

          {months.map((month) => (
            <text
              key={month.toISOString()}
              x={xScale(month)}
              y={innerHeight + 34}
              textAnchor="middle"
              className="fill-[#5d7c7c] text-[11px]"
            >
              {d3.timeFormat("%b")(month)}
            </text>
          ))}

          <text
            x={timeLabelX}
            y={timeLabelY}
            textAnchor="start"
            className="fill-[#45696a] text-[10px] tracking-[0.16em] uppercase"
          >
            TIME IN SPRING 2024
          </text>

          <text
            transform={`translate(${-54},${yScale(65) + 4}) rotate(-90)`}
            dx="0.9em"
            textAnchor="end"
            className="fill-[#45696a] text-[10px] tracking-[0.16em] uppercase"
          >
            LATITUDE
          </text>

          <ColorLegend
            colorScale={colorScale}
            x={legendX}
            y={legendY}
            transparent={isSmallScreen}
          />
        </g>
      </svg>
    </div>
  )
}

function ColorLegend({
  colorScale,
  x,
  y,
  transparent = false,
}: {
  colorScale: d3.ScaleSequential<string>
  x: number
  y: number
  transparent?: boolean
}) {
  const steps = d3.range(0, 1.001, 0.1)
  const [minValue, maxValue] = colorScale.domain()

  return (
    <g transform={`translate(${x},${y})`}>
      {!transparent ? (
        <rect
          width={250}
          height={36}
          rx={18}
          fill="rgba(255,255,255,0.28)"
          stroke="rgba(18,50,56,0.04)"
        />
      ) : null}

      {steps.map((t, i) => {
        const value = minValue + t * (maxValue - minValue)

        return (
          <rect
            key={i}
            x={18 + i * 10}
            y={13}
            width={8}
            height={10}
            fill={colorScale(value)}
          />
        )
      })}

      <text x={145} y={23} className="fill-[#45696a] text-[11px]">
        more chlorophyll
      </text>
    </g>
  )
}

function BloomSection({ data }: { data: HemisphereWeeklyRow[] }) {
  return (
    <section id="bloom" className="w-full pt-20 pb-16">
      <div className="mx-auto w-[min(1440px,calc(100%-40px))]">
        <SectionIntro
          eyebrow="Act I · Planetary context"
          scope="Northern Hemisphere context · weekly snapshots · January–June 2024"
          title={
            <>
              The ocean breathes
              <span className="block">at hemispheric scale.</span>
            </>
          }
          body={
            <>
              Weekly chlorophyll-a snapshots turn daily Copernicus Marine data
              into a slow seasonal rhythm. This wide view is the cinematic
              opening: across the Northern Hemisphere, surface life gathers as
              winter gives way to spring.
            </>
          }
        />

        <HemisphereBloomMap data={data} />
      </div>
    </section>
  )
}

const formatSnapshotDate = d3.timeFormat("%-d %b")

function formatWeekRange(start: string, end: string) {
  const parse = d3.timeParse("%Y-%m-%d")
  const startDate = parse(start)
  const endDate = parse(end)

  if (!startDate || !endDate) return `${start} – ${end}`

  return `${formatSnapshotDate(startDate)} – ${formatSnapshotDate(endDate)}`
}

function HemisphereBloomMap({ data }: { data: HemisphereWeeklyRow[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rasterRef = useRef<HTMLCanvasElement | null>(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const width = useResponsiveSvgWidth(containerRef, 1600)

  const height =
    width < 640
      ? Math.max(310, Math.round(width * 0.76))
      : width < 1100
        ? Math.max(450, Math.round(width * 0.41))
        : Math.round(width * 0.475)
  const mapOffsetY = width < 640 ? 52 : 72

  const margin = {
    top: width < 640 ? 58 : 70,
    right: width < 640 ? 24 : 36,
    bottom: width < 640 ? 96 : width < 1100 ? 104 : 92,
    left: width < 640 ? 24 : 36,
  }

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom - mapOffsetY

  const groupedSnapshots = useMemo(() => {
    const grouped = d3.group(data, (d) => d.snapshot)

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([snapshot, rows]) => ({
        key: snapshot,
        weekStart: rows[0]?.weekStart ?? "",
        weekEnd: rows[0]?.weekEnd ?? "",
        rows,
      }))
  }, [data])

  const activeSnapshot = groupedSnapshots[activeIndex]
  const activeRows = activeSnapshot?.rows ?? []

  const rasterGrid = useMemo(() => {
    const longitudes = Array.from(
      new Set(activeRows.map((d) => d.longitude))
    ).sort((a, b) => a - b)

    const latitudes = Array.from(
      new Set(activeRows.map((d) => d.latitude))
    ).sort((a, b) => a - b)

    const lonIndex = new Map(longitudes.map((d, i) => [d, i]))
    const latIndex = new Map(latitudes.map((d, i) => [d, i]))

    const values = new Float32Array(longitudes.length * latitudes.length).fill(
      NaN
    )

    activeRows.forEach((d) => {
      const x = lonIndex.get(d.longitude)
      const y = latIndex.get(d.latitude)

      if (x === undefined || y === undefined) return

      const flippedY = latitudes.length - 1 - y
      values[flippedY * longitudes.length + x] = d.chl
    })

    const finiteValues = activeRows
      .map((d) => d.chl)
      .filter((v) => Number.isFinite(v))

    const colorScale = d3
      .scaleSequential<string>()
      .domain([
        d3.quantile(finiteValues, 0.03) ?? 0,
        d3.quantile(finiteValues, 0.98) ?? 2.5,
      ])
      .interpolator((t) =>
        d3.interpolateRgbBasis([
          "#edf7f2",
          "#cfeee0",
          "#a8e6b1",
          "#59c98a",
          "#2bb673",
        ])(t)
      )

    return {
      longitudes,
      latitudes,
      values,
      colorScale,
    }
  }, [activeRows])

  useEffect(() => {
    const canvas = rasterRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.round(innerWidth * dpr)
    canvas.height = Math.round(innerHeight * dpr)
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, innerWidth, innerHeight)

    const cols = rasterGrid.longitudes.length
    const rows = rasterGrid.latitudes.length

    if (cols === 0 || rows === 0) return

    const sourceCanvas = document.createElement("canvas")
    sourceCanvas.width = cols
    sourceCanvas.height = rows

    const sourceCtx = sourceCanvas.getContext("2d")
    if (!sourceCtx) return

    const imageData = sourceCtx.createImageData(cols, rows)

    for (let i = 0; i < rasterGrid.values.length; i++) {
      const value = rasterGrid.values[i]
      const offset = i * 4

      if (!Number.isFinite(value)) {
        imageData.data[offset] = 255
        imageData.data[offset + 1] = 255
        imageData.data[offset + 2] = 255
        imageData.data[offset + 3] = 190
        continue
      }

      const c = d3.color(rasterGrid.colorScale(value))?.rgb()
      if (!c) continue

      imageData.data[offset] = c.r
      imageData.data[offset + 1] = c.g
      imageData.data[offset + 2] = c.b
      imageData.data[offset + 3] = 210
    }

    sourceCtx.putImageData(imageData, 0, 0)

    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.filter = "blur(1.2px)"
    ctx.globalAlpha = 0.92

    ctx.drawImage(sourceCanvas, 0, 0, cols, rows, 0, 0, innerWidth, innerHeight)

    ctx.restore()
  }, [rasterGrid, innerWidth, innerHeight])

  useEffect(() => {
    if (!isPlaying || groupedSnapshots.length <= 1) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= groupedSnapshots.length - 1) {
          return 0
        }

        return current + 1
      })
    }, 1200)

    return () => window.clearInterval(timer)
  }, [isPlaying, groupedSnapshots.length])

  const colorScale = useMemo(() => {
    const values = data
      .map((d) => d.chl)
      .filter((value) => Number.isFinite(value))

    return d3
      .scaleSequential<string>()
      .domain([
        d3.quantile(values, 0.03) ?? 0,
        d3.quantile(values, 0.985) ?? 2.5,
      ])
      .interpolator((t) =>
        d3.interpolateRgbBasis([
          "#edf7f2",
          "#cfeee0",
          "#a8e6b1",
          "#59c98a",
          "#2bb673",
        ])(t)
      )
  }, [data])

  const sliderProgress =
    groupedSnapshots.length > 1
      ? activeIndex / (groupedSnapshots.length - 1)
      : 0

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full max-w-full"
          role="img"
          aria-label="Weekly chlorophyll-a across the Northern Hemisphere"
        >
          <defs>
            <linearGradient id="fade-left" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f4f8f3" stopOpacity="1" />
              <stop offset="100%" stopColor="#f4f8f3" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="fade-right" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f4f8f3" stopOpacity="0" />
              <stop offset="100%" stopColor="#f4f8f3" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="fade-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f4f8f3" stopOpacity="1" />
              <stop offset="100%" stopColor="#f4f8f3" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="fade-bottom" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f4f8f3" stopOpacity="0" />
              <stop offset="100%" stopColor="#f4f8f3" stopOpacity="1" />
            </linearGradient>
          </defs>

          <rect width={width} height={height} fill="#f4f8f3" />

          <foreignObject
            x={margin.left}
            y={margin.top + mapOffsetY}
            width={innerWidth}
            height={innerHeight}
          >
            <canvas
              ref={rasterRef}
              className="h-full w-full rounded-[18px]"
              style={{ display: "block" }}
            />
          </foreignObject>

          <g
            transform={`translate(${margin.left},${margin.top + mapOffsetY})`}
            pointerEvents="none"
          >
            <rect
              x={0}
              y={0}
              width={130}
              height={innerHeight}
              fill="url(#fade-left)"
            />

            <rect
              x={innerWidth - 130}
              y={0}
              width={130}
              height={innerHeight}
              fill="url(#fade-right)"
            />

            <rect
              x={0}
              y={0}
              width={innerWidth}
              height={90}
              fill="url(#fade-top)"
            />

            <rect
              x={0}
              y={innerHeight - 90}
              width={innerWidth}
              height={90}
              fill="url(#fade-bottom)"
            />
          </g>

          <g transform={`translate(${margin.left},${margin.top})`}>
            <text
              x={0}
              y={-26}
              className="fill-[#2bb673] text-xs font-bold tracking-[0.18em] uppercase"
            >
              Northern Hemisphere chlorophyll-a
            </text>

            <text
              x={0}
              y={8}
              className="fill-[#123238] text-[28px] font-bold tracking-[-0.04em]"
            >
              {activeSnapshot
                ? formatWeekRange(
                    activeSnapshot.weekStart,
                    activeSnapshot.weekEnd
                  )
                : "Weekly snapshots"}
            </text>

            <text x={0} y={48} className="fill-[#45696a] text-[13px]">
              Weekly snapshots, January–June 2024
            </text>

            <g transform={`translate(0,${mapOffsetY + innerHeight + 42})`}>
              <rect
                width={260}
                height={38}
                rx={18}
                fill="rgba(255,255,255,0.28)"
                stroke="rgba(18,50,56,0.04)"
              />

              {d3.range(0, 1.001, 0.125).map((t, i) => {
                const [minValue, maxValue] = colorScale.domain()
                const value = minValue + t * (maxValue - minValue)

                return (
                  <rect
                    key={i}
                    x={18 + i * 12}
                    y={14}
                    width={9}
                    height={10}
                    rx={2}
                    fill={colorScale(value)}
                    opacity={0.95}
                  />
                )
              })}

              <text x={150} y={23} className="fill-[#45696a] text-[11px]">
                more chlorophyll
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div className="mt-4 px-0 sm:pr-[36px] sm:pl-[32px]">
        <div className="flex items-start gap-4 max-md:flex-col max-md:items-stretch">
          <button
            type="button"
            onClick={() => setIsPlaying((current) => !current)}
            className="shrink-0 rounded-full border border-[#123238]/15 bg-white/70 px-3 py-1 text-sm text-[#2f6767] backdrop-blur"
          >
            {isPlaying ? "Pause bloom" : "Play bloom"}
          </button>

          <div className="flex flex-1 items-start gap-3">
            <span className="pt-2 text-xs text-[#45696a]">Jan</span>

            <div className="relative flex-1 pt-1 pb-7">
              <input
                type="range"
                min={0}
                max={Math.max(0, groupedSnapshots.length - 1)}
                value={activeIndex}
                onChange={(event) => {
                  setActiveIndex(Number(event.target.value))
                  setIsPlaying(false)
                }}
                className="w-full accent-[#2bb673]"
                aria-label="Choose weekly chlorophyll snapshot"
              />

              <div
                className="pointer-events-none absolute top-8 -translate-x-1/2 text-xs whitespace-nowrap text-[#45696a]"
                style={{
                  left: `${sliderProgress * 100}%`,
                }}
              >
                {activeSnapshot
                  ? formatWeekRange(
                      activeSnapshot.weekStart,
                      activeSnapshot.weekEnd
                    )
                  : ""}
              </div>
            </div>

            <span className="pt-2 text-xs text-[#45696a]">Jun</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SourceSection() {
  return (
    <section
      id="source"
      className="mx-auto w-[min(1440px,calc(100%-32px))] pt-8 pb-16 sm:w-[min(1440px,calc(100%-40px))] sm:pt-14 sm:pb-18 lg:pt-24 lg:pb-20"
    >
      <div className="border-y border-[#123238]/8 py-12">
        <SectionIntro
          compact
          className="mb-0"
          eyebrow="The invisible source"
          title={
            <>
              The ocean wakes
              <span className="block">in spring.</span>
            </>
          }
          lead={
            <>
              The bloom is not simply “green water.” It is sunlight becoming
              living matter.
            </>
          }
          body={
            <>
              In winter, storms mix the North Atlantic and replenish surface
              waters with nutrients. But short days and deep mixing limit
              phytoplankton growth.
            </>
          }
          secondaryBody={
            <>
              When spring returns, longer days and a more stable surface layer
              allow a rapid bloom to unfold.
            </>
          }
          rightAside={
            <div className="border-l border-[#2bb673]/25 pl-6">
              <p className="text-xs font-bold tracking-[0.16em] text-[#2bb673] uppercase">
                Reading frame
              </p>

              <p className="mt-3 text-sm leading-7 text-[#5d7c7c]">
                Chlorophyll-a is the visible clue. It is the pigment that allows
                phytoplankton to capture sunlight — and it lets us see the bloom
                from ocean data.
              </p>
            </div>
          }
        />
      </div>
    </section>
  )
}

function EndingSection() {
  return (
    <section
      id="meaning"
      className="mx-auto w-[min(1440px,calc(100%-32px))] pt-20 pb-28 sm:w-[min(1440px,calc(100%-40px))]"
    >
      <SectionIntro
        eyebrow="Every Second Breath"
        title="And the breath"
        titleAccent="returns to us."
        body={
          <>
            What begins as microscopic life becomes part of the air above the
            sea.
          </>
        }
        secondaryBody={
          <>
            The bloom is brief, seasonal, and microscopic — yet it belongs to
            the same planetary system as the air we breathe.
          </>
        }
      />

      <p className="mt-4 max-w-5xl text-[clamp(2.1rem,4vw,4.4rem)] leading-[1.08] tracking-[-0.045em] text-[#123238]">
        Every second breath carries an ocean story.
      </p>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mx-auto w-[min(1440px,calc(100%-40px))] border-t border-[#123238]/10 pt-10 pb-14">
      <div className="grid gap-10 lg:grid-cols-[0.55fr_0.45fr] lg:gap-16">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#2bb673] uppercase">
            Every Second Breath
          </p>

          <p className="mt-3 max-w-xl text-sm leading-7 text-[#5d7c7c]">
            A Copernicus Marine data visualization about the North Atlantic
            phytoplankton spring bloom.
          </p>
        </div>

        <div className="grid max-w-xl gap-8 sm:grid-cols-2 lg:justify-self-end">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#2bb673] uppercase">
              Source notes
            </p>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5d7c7c]">
              <li>Chlorophyll-a as proxy for phytoplankton biomass.</li>
              <li>Daily surface layer, March–June 2024.</li>
              <li>
                Variables: chlorophyll-a, nitrate, net primary production,
                dissolved oxygen.
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#2bb673] uppercase">
              Credits
            </p>

            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5d7c7c]">
              <li>Data: Copernicus Marine Service.</li>
              <li>Design, analysis, and implementation: Jessica Bosch.</li>
              <li>
                Illustrations generated with AI and edited for this story.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default App
