# Every Second Breath

**Every Second Breath** is an editorial data visualization about the North Atlantic phytoplankton spring bloom — a seasonal pulse of microscopic life that appears each spring as light returns, surface waters stabilize, and nutrients become available.

The project translates Copernicus Marine Service biogeochemical data into an interactive visual narrative for a non-specialist audience. It treats the bloom as **the ocean’s breath**: not as a literal one-to-one mechanism, but as a poetic frame for understanding how microscopic ocean life is connected to oxygen, carbon, food webs, and the atmosphere above the sea.

## Live project

https://jessi88.github.io/ocean-bloom/

## Story concept

The visualization follows a four-act narrative:

1. **A planetary signal:**
   A wide Northern Hemisphere chlorophyll view introduces the seasonal greening of the ocean.

2. **The North Atlantic inhales:**
   A time–latitude chlorophyll curtain narrows the story to the North Atlantic spring bloom from March to June 2024.

3. **Inside the breath:**
   Small multiples and microscopic illustrations connect chlorophyll-a to phytoplankton biomass, nitrate, net primary production, and dissolved oxygen.

4. **Exhale:**
   The story follows what comes after the bloom: zooplankton carbon, dissolved inorganic carbon, and surface pCO₂ as contextual signals within the wider ocean–atmosphere system.

## Data

The project uses Copernicus Marine Service model outputs for the North Atlantic and Northern Hemisphere during the 2024 spring season.

Main variables used:

| Variable | Meaning                                     |   Display unit |
| -------- | ------------------------------------------- | -------------: |
| `chl`    | Chlorophyll-a concentration                 |         mg m⁻³ |
| `phyc`   | Phytoplankton carbon biomass                |       mmol m⁻³ |
| `nppv`   | Net primary production                      | mg C m⁻³ day⁻¹ |
| `no3`    | Nitrate                                     |       mmol m⁻³ |
| `o2`     | Dissolved oxygen                            |       mmol m⁻³ |
| `zooc`   | Total zooplankton carbon                    |       mmol m⁻³ |
| `dissic` | Dissolved inorganic carbon                  |        mol m⁻³ |
| `spco2`  | Surface partial pressure of CO₂ in seawater |             Pa |

The central North Atlantic focus uses daily surface data from approximately:

```txt
Longitude: -60° to -10°
Latitude:   35° to 65°
Period:     2024-03-01 to 2024-06-30
Depth:      surface model layer, ~0.49 m
```

## Design approach

The project is designed as an editorial scrollytelling piece rather than a scientific dashboard. The visual system emphasizes:

* soft oceanic color gradients rather than saturated rainbow scales;
* readable annotations and hover states for exact values;
* restrained motion, used only where it helps reveal trends;
* generous whitespace and a calm typographic hierarchy;
* scientific caution in the language around oxygen, carbon, and air–sea exchange.

## Interactions

The visualization includes:

* a weekly chlorophyll map with play and slider controls;
* hover/tap tooltips for coordinates and chlorophyll-a values;
* a time–latitude breath curtain with date, latitude, and concentration tooltips;
* selectable microscopic bloom indicators;
* scroll-triggered line animations for small trend traces;
* tooltip comparisons for relative change, current value, and baseline value.

## Built with

* React
* TypeScript
* Vite
* D3.js
* Tailwind CSS
* SVG and Canvas

## Local development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project structure

This project currently keeps the main visualization logic in a single `App.tsx` file.

```txt
src/
  App.tsx
  index.css
  main.tsx
  assets/
  data/
```

The single-file structure was kept intentionally during the design and iteration phase, so the narrative, data transformations, and visual components could be refined together quickly. In the next phase, I plan to break the code into a more modular structure, separating shared components, chart components, data parsing utilities, constants, and narrative sections into dedicated files.

## Scientific framing

This project uses the phrase **Every Second Breath** as an accessible narrative metaphor. The visualization does not claim that a single bloom directly produces every second breath we take. Instead, it shows how phytoplankton blooms are part of the planetary systems that connect ocean biology, oxygen production, carbon cycling, food webs, and the atmosphere.

Dissolved oxygen, carbon, and pCO₂ are interpreted cautiously: they are influenced by biology, mixing, temperature, circulation, and exchange processes. The project therefore treats them as contextual signals within a larger marine system rather than as simple one-cause, one-effect outputs.

## Credits

Data source: Copernicus Marine Service biogeochemical products.

Design, analysis, and development: Jessica Bosch.
