> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M0 átadási jelentés

**Állapot: PASS — M0 lezárható. M1–M6 fejlesztés nem kezdődött el.**

Dátum: 2026-11-14. Végső funkcionális ellenőrzés: 13:59–14:00, Europe/Budapest (UTC+01:00).
Kiinduló commit: `4dafec21df5a175a766ef510c002928d05f29abe`.
Az ellenőrzött munkafa pontos forráslenyomata: M0-source-snapshot.json (privát archívum: `M0-source-snapshot.json`).
A tesztkörnyezet és az egyes böngészős eredmények: M0-results.json (privát archívum: `M0-results.json`).
A teljes sikeres kapu konzolkimenete: M0-verification.log (privát archívum: `M0-verification.log`).

## Megvalósított funkciók

- A négy irányadó dokumentum teljes olvasása és belső összhangvizsgálata; nincs M0-blokkoló ellentmondás.
- Tiszta npm workspaces alap: öt WDF-modulhely, külön referenciaalkalmazás-hely.
- Önállóan induló React + TypeScript + Vite indítási oldal. Ez M0-próba, még nem Task Manager.
- Rögzített közvetlen függőségek és lockfile, Node/npm verziók, strict típusellenőrzés.
- Formázás, lint, specifikációlenyomat-ellenőrzés, tényleges React-renderelési teszt, produkciós build.
- Valódi Chromium ellenőrzés fejlesztői és produkciós előnézetben, öt-öt szélességen.
- GitHub Actions ellenőrzési workflow és helyi bizonyítékkimenetek; távoli workflow-futtatás nélkül.
- Dokumentált modulfelelősségek, tervezett függőségek és gépi szerződéshelyek; ADR-0001.

## Módosított területek

Minden implementációs fájl új. Az eredeti négy specifikáció byte-szinten változatlan.
Korábbi WDF-kódot nem vettünk át.

| Terület                                               | Tényleges tartalom                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gyökérkonfigurációk                                   | `package.json`, `package-lock.json`, `.npmrc`, `.node-version`, TypeScript-, ESLint-, Prettier-, Vitest- és Playwright-konfiguráció, ignore fájlok |
| `apps/task-manager/`                                  | Vite/React belépés, átmeneti statikus indítási oldal és CSS, 1 renderelési teszt                                                                   |
| `packages/{foundation,core,adapter-react,ui-lab,qa}/` | Csomagonként kizárólag package.json és felelősségleírás; nincs WDF-funkció vagy publikus API                                                       |
| `tools/check-spec.mjs`                                | Az eredeti specifikációk SHA-256 ellenőrzése                                                                                                       |
| `tests/browser/bootstrap.spec.ts`                     | 5 viewport × 2 szerverkörnyezet, geometria, billentyűzet és axe                                                                                    |
| `.github/workflows/check.yml`                         | Node/npm telepítés, npm ci, Playwright Chromium, M0-kapu, artifact-mentés                                                                          |
| `README.md`, `DESIGN.md`, `docs/`                     | Indítás, parancsok, összhangvizsgálat, architektúra, ADR, eredmények és bizonyíték                                                                 |

## Tényleges ellenőrzések

Környezet: Linux x86_64, Node **24.22.1**, npm **11.9.0**,
Chromium **156.0.8078.79**, Playwright **1.65.1**, Vitest **5.1.0**, axe-core **4.14.0**.
A böngésző headless módban, `hu-HU` locale-lal, `Europe/Budapest` időzónával,
csökkentett animációs beállítással futott. A pontos OS-adat a JSON-jelentésben található.

| ID / parancs                                                                                                 | Módszer és elvárt eredmény                                         | Tényleges eredmény                                                                      | Státusz                   |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------- |
| M0-A01 / `npm run check:spec`                                                                                | 4 dokumentum SHA-256 lenyomata egyezzen                            | 4/4 egyezés                                                                             | PASS                      |
| M0-A02–A04 / dokumentum- és workspace-review                                                                 | Minimális modulhatárok, függőségek és tervezett szerződéshelyek    | ARCHITECTURE és 6 workspace metaadata összhangban; működő rendszernek jelölt stub nincs | PASS                      |
| M0-A05 / `npm ci`                                                                                            | Lockfile-ból, peer-kényszerítés nélkül települjön                  | Kilépés 0, 153 telepített csomag                                                        | PASS                      |
| `npm run format:check`                                                                                       | Minden ellenőrzött fájl formázott                                  | Kilépés 0                                                                               | PASS                      |
| `npm run lint`                                                                                               | Nulla lint hiba/figyelmeztetés                                     | Kilépés 0                                                                               | PASS                      |
| `npm run typecheck`                                                                                          | Strict TS az appra, tesztekre és konfigurációkra                   | Kilépés 0                                                                               | PASS                      |
| M0-U01 / `npm run test:unit`                                                                                 | A valódi App renderelhető a TSX/React eszközláncon                 | 1/1 teszt, 1/1 fájl sikeres                                                             | PASS                      |
| `npm run build`                                                                                              | Önálló statikus alkalmazás build                                   | Kilépés 0, 16 modul; HTML + CSS + JS a dist könyvtárban                                 | PASS                      |
| M0-B320/B390/B768/B1024/B1440 / `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser` | Valódi render, geometria, billentyűzet és axe mindkét környezetben | 10/10 sikeres; 0 kihagyott, 0 váratlan hibás, 0 flaky; 10,8 s                           | PASS                      |
| M0-A06 / ADR- és konfigurációreview                                                                          | Dokumentált alapértelmezések egyezzenek a megvalósítással          | Node/npm, verziók, cache, ESM, határok és kompatibilitási döntés rögzítve               | PASS                      |
| M0-A07 / `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run verify:m0`                           | A teljes helyi kapu megszakítás nélkül végigfusson                 | Kilépés 0; statikus, unit, build és browser szakasz sikeres                             | PASS                      |
| `npm ls --depth=0`                                                                                           | A telepített gráf konzisztens legyen                               | Kilépés 0; érvénytelen/hiányzó függőség nincs                                           | PASS                      |
| `npm ls --omit=dev --all`                                                                                    | Az app tényleges runtime függősége áttekinthető legyen             | React, React DOM, scheduler; a WDF-workspace-ek csak privát metaadathelyek              | PASS, korlátozott hatókör |
| `git diff --exit-code -- AGENTS.md WDF_IMPLEMENTATION_BLUEPRINT.md WDF_TEST_PLAN.md CODEX_START_PROMPT.md`   | Az irányadó dokumentumok változatlanok                             | Kilépés 0                                                                               | PASS                      |
| `git diff --check`                                                                                           | Követett diff whitespace-ellenőrzése                               | Kilépés 0; az új fájlok formázását külön a Prettier ellenőrizte                         | PASS, korlátozott hatókör |

A teljes kapu a fenti részparancsokat ténylegesen futtatta. A reprodukcióhoz a README
előfeltételeit kell követni; külön browser-futtatás előtt build szükséges.

Kiegészítő UI-eszközellenőrzés: `python3 /tmp/wdf-premium-audit.py apps/task-manager --mode strict --output docs/reports/M0-ui-static-audit.json`
→ kilépés 0, nulla találat. Ez a betöltött UI-skill ideiglenesen kihelyezett statikus
ellenőrzője volt, nem a WDF QA Engine-je és nem a repository reprodukálható M0-kapujának függősége.
`npx --yes --package @google/design.md designmd lint DESIGN.md` → kilépés 0, nulla hiba,
egy figyelmeztetés: nincs YAML-tokenblokk. Ez szándékos: a korlátozott M0-kontextus
nem vezet be a majdani tokenrendszerrel párhuzamos konfigurációt.

## Böngészős bizonyíték

Minden viewport **900 px magasságú** volt. Mind a tíz esetben:

- A valós oldal címe, magyar nyelve, főcíme és indítási szövege megjelent.
- Nem volt váratlan vízszintes túlcsordulás; a main a viewporton belül maradt.
- Nem volt ismétlődő HTML ID, oldal-/konzol-/hálózati hiba.
- Valódi Tab fókuszálta a látható tartalomra ugró linket; Enter után a main kapta a fókuszt.
- A link outline-ja megjelent; az axe releváns WCAG 2/2.1/2.2 A/AA szabálycímkéi nulla találatot adtak.

A geometriák és axe-verzió az M0-results.json (privát archívum: `M0-results.json`) esetenkénti adatai.
A 10 tartós képernyőkép az [evidence](evidence/) könyvtárban található.
Az öt produkciós képet, továbbá a 320 és 1440 px-es dev képet vizuálisan is áttekintettem:
a magyar szöveg olvasható, nincs látható átfedés vagy levágás, a tördelés követi a szélességet.
A képek a billentyűzetes navigáció utáni main-fókuszállapotot mutatják, ezért a tartalmat fókuszkeret veszi körül.
Nem készült korábbi designhoz mért pixelregressziós baseline.

Példák: [mobil, 320 px](evidence/production-320.png), [asztali, 1440 px](evidence/production-1440.png).

## Felismert és javított hibák

- Az első npm metadata-lekérdezés a home könyvtár nem írható cache-e miatt hibázott.
  Az ideiglenes lekérdezés `/tmp` cache-t, a projekt repositoryn belüli `.cache/npm` cache-t kapott.
- Az első függőségtelepítés ERESOLVE: TypeScript 7.0.2 nem kompatibilis a typescript-eslint peer-tartományával.
  Javítás: TypeScript 6.0.3, kényszerítés nélkül; részletek ADR-0001.
- Az első Chromium-futás 10/10 FAIL: a böngésző implicit `/favicon.ico` kérése 404-es konzolhibát okozott.
  A trace ezt az URL-t azonosította. Javítás: explicit üres data favicon; a teljes újrafuttatás 10/10 PASS.
- A futtatókörnyezet NO_COLOR/FORCE_COLOR figyelmeztetést írt a terminálra.
  Ez nem alkalmazáskonzol-hiba és nem tett sikertelenné tesztet; a naplóban megmaradt.

## Nyitott hibák és korlátok

**Nyitott M0-blokkoló hiba nincs.**

T01–T16, C01–C10, R01–R10 a Task Manager/UI Lab rendszerre és a WDF-hibainjektálások:
**NOT_RUN**. Nincs még Contract, tokenrendszer, Registry, Task Manager-funkció, Lab,
Draft, Audit vagy jóváhagyás. Ezek hiánya az M0 tudatos határa.

Kizárólag a helyi rendszer-Chromiumot ellenőriztük. A Playwright által letöltött böngészővel
és a távoli GitHub Actions környezetben a futás **NOT_RUN**. Firefox/WebKit, képernyőolvasó,
teljes WCAG 2.2 AA megfelelőségi vizsgálat és kiadási/telepítési C10 igazolás szintén **NOT_RUN**.
Az axe sikere nem teljes akadálymentességi tanúsítás. Nincs korábbi alkalmazás, amelyhez
funkcionális regressziót lehetne mérni; a regressziós alapot most a futó M0-smoke készlet adja.

## Visszaállítás

A kezdeti munkafa tiszta volt, és kizárólag a négy specifikáció létezett. Az M0 új fájljai
elkülöníthetők a forráslenyomat listájából és a `docs/reports/` könyvtárból.
Commit, push, publikálás és automatikus Git-módosítás nem történt.

Az eredeti állapot a jelen munka felülírása nélkül külön checkoutban visszakapható:

```sh
git worktree add --detach /tmp/wdf-before-m0 4dafec21df5a175a766ef510c002928d05f29abe
```

Ez az eredeti, csak specifikációkat tartalmazó repositoryállapot; korábbi működő alkalmazás nem volt.
Ha az aktuális ágban kell visszavonni az M0-t, először a teljes M0-változtatáscsomagot
külön commitba kell menteni, utána annak azonosítójával `git revert <M0-commit>` használható.
Későbbi vagy más munkákat nem szabad blanket `git clean`/`reset --hard` paranccsal törölni.
A nem követett `.cache/`, `node_modules/`, `dist/`, `test-results/` és `playwright-report/`
újragenerálható kimenet; nem hiteles forrás vagy designállapot.

## Következő mérföldkő

M1: Foundation és Project Contract. Belépési feltétele az M0 áttekintése és az új,
kifejezett felhasználói fejlesztési utasítás. M1-ben kell eldönteni és tesztelni a
sémamegoldást, tokenformátumot, verziókompatibilitást és a CSS/TS-generálást.

**A fejlesztés az M0-nál megállt. M1-munkát nem kezdeményeztem.**
