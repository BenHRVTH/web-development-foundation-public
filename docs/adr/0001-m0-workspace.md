# ADR-0001 — Minimális npm workspace és M0 eszközlánc

- Dátum: 2026-11-14
- Állapot: M0-ban alkalmazott belső technikai döntés
- Forrás: Blueprint 3., 9., 11. és 13. fejezet; Start Prompt M0 1–7.; AGENTS 2., 8–11.

## Kontextus

Üres implementációból indulunk. A v1 egy React + TypeScript + Vite projektet támogat;
az M0 kizárólag a repositoryt és az ellenőrzési infrastruktúrát készíti elő.

## Döntés

Npm workspaces monorepo, öt felelősség szerint elválasztott WDF-modul és egy alkalmazáshely.
Külön Project Contract-csomag helyett a Core birtokolja a sémákat: ez azonos a Blueprint
felelősségkiosztásával, és nem hoz létre további absztrakciót.
QA külön modul, mert a végrehajtása böngészőt és fejlesztői függőségeket igényelhet;
a közös adatinterfészek a Core-ban maradnak.

Node 24 LTS-vonal és npm 11; konkrét ellenőrzött verzió `.node-version` és `packageManager` szerint.
ESM, strict TypeScript, kizárólag React TSX és Vite; nincs backend vagy meta-framework.
Pontos közvetlen verziók, közös package-lock és reprodukálható `npm ci`.
A runtime React/React DOM az app függősége; minden eszköz gyökérszintű devDependency.
A telepítési cache a repository írási jogával elérhető `.cache/npm`, hogy ne kelljen a
környezeti felhasználó home könyvtárát módosítani.

A TypeScript verziója 6.0.3: a telepítéskor elérhető 7.0.2-t a
typescript-eslint 8.72.2 `>=4.8.4 <6.1.0` peer-tartománya nem támogatja.
Az első telepítési kísérlet ezt ERESOLVE hibával igazolta; `--force` vagy
`--legacy-peer-deps` helyett kompatibilis, pontos verziót választottunk.

Prettier + ESLint + TypeScript, Vitest React SSR indítási próbával,
Playwright Chromium dev és produkciós preview teszttel, axe-core automatizált a11y ellenőrzéssel.
A tesztkód, konfiguráció és alkalmazás egyaránt típusellenőrzött.
Nem használunk `passWithNoTests`-t, sikert elnyelő parancsot vagy üres sikeres Lab-stubot.
A böngészős teszt saját szervereket indít fix loopback portokon, újrahasználat nélkül.
A kiválasztható rendszer-Chromium kizárólag tesztkörnyezeti opció; alapértelmezés a Playwright saját böngészője.

Az M0 alkalmazáshely egy magyar, szemantikus HTML-t használó technikai indítási oldal.
Nincs Task Manager-funkció, Registry, Manifest vagy tokenszerkesztő.
Átmeneti stílusa nem Foundation vagy általános projektarculat; M2-ben lecserélendő.
Nincs betűkészlet-letöltés, ikon, animáció, állapottárolás vagy extra UI-függőség.

## Alternatívák és következmények

Egyetlen csomag egyszerűbb kezdetben, de elmosná az előírt réteghatárokat.
Nx/Turborepo/pnpm és több kiadási pipeline M0-ban szükségtelen többlet.
Az npm workspace elegendő; a csomagokat M6-ig privátan tartjuk.

A csomagok most nem publikálhatók és nincs még WDF publikus API.
A közösen verziózott kiadás, külső projekt telepítése és a production dependency-határ
végleges C10 igazolása M6-kötelezettség marad.
M1-ben a validációs könyvtár és a token-/sémaverzió döntését külön ADR-ben kell indokolni.
