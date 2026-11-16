---
version: alpha
omitted:
  - section: colors
    reason: Runtime ownership is wdf/tokens.json.
  - section: typography
    reason: Runtime ownership is wdf/tokens.json.
  - section: spacing
    reason: Runtime ownership is wdf/tokens.json and WDF Foundation.
  - section: rounded
    reason: Runtime ownership is wdf/tokens.json.
  - section: components
    reason: Registry and src/components.tsx own component behavior.
---

# Hangár · Hallgatószoba

## Overview

Magyar közösségi hallgatószoba; egyetlen feladat a programválasztás és helyfoglalás.
Product felület, nem Task Manager. A jellegzetes elem a műsorrend: bal oldali időpont,
jobbra a program, narancs függőleges kezdővonal. Nincs feladatjelölő, admin-oldalsáv vagy KPI.

## Colors

Kékes papír, sötétkék tinta, rozsdaszínű műveletek és fehér programfelületek.
Az értékek kizárólag a wdf/tokens.json fájlban élnek; az app.css generált WDF-változókat fogyaszt.
A hiba vörös és szöveges. Nincs sötét téma vagy külső fontszolgáltatás.

## Typography

Verdana display, Arial törzsszöveg, monospace időpontok. H1 32/48, H2 22, törzs 16,
címke 14 CSS px; 400 és 700 súly. Magyar karakterek, teljesen tördelhető címek.

## Layout

Egyetlen programlista és helyfoglalási dialógus. Mobilon időpont a cím fölött;
48rem-től két oszlop. Standard kártyainset 16/24/32 px minden viewporton.
A dokumentum görget; dialógusban szükség esetén önálló görgetés. Globális scrollbar baseline.

## Elevation & Depth

Nincs árnyék vagy animáció. A dialógust a natív top layer és áttetsző háttér választja el.

## Shapes

8 px közös sarok, 48 px vezérlőmagasság. Egy következetes nyíl SVG mutatja a műveletet.

## Components

Action, SessionCard, Field és Reservation az alkalmazás és a Registry közös implementációi.
Együtt változnak a family és variant tokenekkel. A fixture-állapot nem másolt komponens.

## Do's and Don'ts

A programot és az időpontot emeld ki; ne vedd át a Task Manager levendula arculatát.
A kanonikus tokenforrás → generate.mjs → src/generated/tokens.css és tokens.ts → app.css
útvonalon nincs kézzel karbantartott második designkonfiguráció. A runtime driftkapu byte-pontos.
