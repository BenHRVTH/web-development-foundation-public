> TISZTA NYILVÁNOS ELŐKÉSZÍTÉS — Git-előzmény és régi artifact nélkül. A [közzétételi útmutató](docs/PUBLICATION.md) tartalmazza a biztonsági/licencelési feltételeket és a pontos lépéseket. Az eredeti nyilvános CI R05 FAIL-ját a helyi javítás nem írja át; friss Windows- és teljes M6-ellenőrzés még szükséges. A történeti átadások nem az új repository tesztbizonyítékai.

# Web Development Foundation — 0.1.0-rc.1

React + TypeScript + Vite projektek helyi design-, Audit- és QA-eszköze.
Két munkaterület: a tényleges alkalmazás Website View nézete és a saját React-
komponenseket használó Component Studio. Egy közös, tartós Working Draft,
Undo/Redo, design A/B, egyenként elfogadható Audit-javítások és tényleges Approval QA.
A hiteles tokenforrást csak külön megerősített jóváhagyás írja át.

**Release candidate szakmai felülvizsgálatra. Nincs nyilvános npm-release,
GitHub Release vagy végleges tag.** Az aktuális teljesítés, bizonyítékok és nyitott
korlátok az [M6 átadásban](docs/reports/M6-HANDOFF.md) találhatók.

**M6 kiadás: BLOKKOLT; az R05 javítása helyi felülvizsgálaton.** A jóváhagyott
szabály az aktuális deklarált CSS-súlyképviselőt részesíti előnyben. Az összeolvadó
600/700 nem két választható megjelenés; minden eredeti súlypár mérése megmarad.
A rendszerfontok, arculatok és meglévő tokenértékek változatlanok.
[Új helyi átadás, eredmények és Windows-korlát](docs/reports/M6-R05-FINALIZATION.md).
A [korábbi sikertelen mérések](docs/reports/M6-R05-CORRECTION.md) és az
[eredeti nyilvános CI FAIL-bizonyítéka](docs/reports/M6-R05-HISTORY.md)
megmaradtak. A teljes Linux/Windows-kapu és a kötelező kézi hiányok lezárása még
szükséges; nincs release-jóváhagyás.

## Indítás a referenciaprojekttel

Node **24.22.1**, npm **11.9.0**:

```sh
npm ci
npm run dev
# Külön terminálban:
npm run ui-lab
```

Task Manager: `http://127.0.0.1:5173`; Lab: `http://127.0.0.1:5175`.
Ctrl+C leállítja a szolgáltatásokat. Önálló app: `npm run build`, `npm run preview`.
A Task Manager nem perzisztens referenciaadatokat használ; a Lab Draftja ettől
különálló helyi fejlesztői adat. A produkciós app nem igényli a WDF futtatókörnyezetét.

## Valódi csomagok és tiszta fogyasztó

```sh
npm run build:packages
npm run install:consumer
```

Az öt `.tgz` a `artifacts/packages` könyvtárba kerül, SHA-256 inventoryval.
A telepítő új, **monorepón kívüli** könyvtárba telepíti a csomagokat, saját lockfile-ból
újratelepít, és Contract-, típus- és buildellenőrzést futtat. Nincs workspace-alias
vagy symlink. A kiírt könyvtárban `npm run dev`, illetve `npm run ui-lab` indítja a
Hangár hallgatószoba saját, a Task Managertől eltérő arculatú alkalmazását és Labját.

## Dokumentáció

- [Getting Started](docs/GETTING-STARTED.md): előfeltételek, telepítés, minimális integráció, első használat.
- [Developer Guide](docs/DEVELOPER-GUIDE.md): modulhatárok, tokenek, Registry, preview, projekt-QA és Change Manager.
- [Release Guide](docs/RELEASE-GUIDE.md): build/pack, telepítési próba, CI, platformok és rollback.
- [M6 átadás és elfogadási mátrix](docs/reports/M6-HANDOFF.md).
- [Csomagolási ADR](docs/adr/0010-m6-packaged-release.md), [Windows tartóssági szerződés](docs/adr/0009-m5-platform-storage.md).
- Részletes [M1](docs/M1-API.md), [M2](docs/M2-API.md), [M4](docs/M4-API.md), [M5](docs/M5-CHANGE-QUALITY-API.md) API-k.

A korábbi mérföldkő-átadások történeti bizonyítékok; az M6-tól a fenti útmutatók
írják le az aktuális csomagolt rendszert. Az eredeti négy specifikáció változatlan.

## Ellenőrzés

```sh
npx playwright install --with-deps chromium
npm run verify:m6
```

Linuxon teljes M0–M5 regresszió, statikus/unit/build/browser/visual/a11y kapu,
majd öt csomag packje, tiszta fogyasztótelepítés, két workspace és teljes tényleges
Approval-folyamat. Windows alatt a hordozható tárolási/journal tesztek és a csomagból
telepített fogyasztó integrációja fut. Mindkettőhöz push/PR GitHub Actions job tartozik.

Meglévő Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m6`
Linuxon. További célzott parancsok: `npm run check`, `npm run test:m5:storage`,
`npm run test:m6`, `npm run check:generated`. A tesztek saját szervereket indítanak;
a kézzel nyitott Labot előtte állítsd le.

Kimenetek: `test-results`, `artifacts/packages`, `artifacts/evidence`,
`docs/reports/evidence/m6`. A CI az artifactokat és lenyomataikat megőrzi.
Az axe sikere nem teljes WCAG-tanúsítás. A nem futtatott manuális/platform-
ellenőrzések státusza külön szerepel; a Windows könyvtár-fsync korlátja megmarad.

## Felhasználási feltételek

A saját WDF-kód [UNLICENSED / minden jog fenntartva](LICENSE). A függőségekre a [saját licenceik](THIRD_PARTY_NOTICES.md) vonatkoznak; a nyilvános tárolás nem nyílt forrású licenc.
