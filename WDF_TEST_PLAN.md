# WDF — Reference Project & Acceptance Test Plan

**Státusz:** Kötelező elfogadási szerződés  
**Referenciaprojekt:** Task Manager  
**Technológia:** React + TypeScript + Vite

## 1. A tesztelés alapelve

A WDF csak akkor tekinthető működő rendszernek, ha a tényleges Task Manager alkalmazáson keresztül minden kötelező felhasználói folyamat és Project Contract-interfész megfelelően működik.

A teszteknek valódi implementációt kell ellenőrizniük.

Minden teszthez rögzíteni kell:

- Azonosító és ellenőrzött követelmény.
- Tesztelési módszer.
- Elvárt eredmény.
- Tényleges eredmény.
- Ellenőrzött verzió és környezet.
- Státusz és szükség esetén hibaazonosító.

A tesztek státuszai: PASS, FAIL, ERROR, NOT_RUN, STALE.

## 2. Kötelező end-to-end tesztek

| ID | Teszt | Kötelező eredmény |
|---|---|---|
| T01 | Lab indítása a projektből | A megfelelő projekt automatikusan betöltődik |
| T02 | Első indítás | Initial Reference létrejön jóváhagyás nélkül |
| T03 | Accent szín módosítása | Az érintett UI-elemek ténylegesen frissülnek |
| T04 | Spacing preset | Az összes érintett token a preset értékeit veszi fel |
| T05 | Preset Undo | A teljes művelet egy lépésben visszavonható |
| T06 | Komponensvariáns módosítása | Az összes megfelelő előfordulás változik |
| T07 | Component Studio | Valódi React-komponensek és fixture-ök jelennek meg |
| T08 | Reszponzív előnézet | A projekt valódi viewportviselkedése látható |
| T09 | A/B összehasonlítás | Ugyanazon forráskód két designkonfigurációja jelenik meg |
| T10 | Foundation-szabálysértés | A rendszer pontos hibát észlel |
| T11 | Audit-javítás elfogadása | Csak a kiválasztott javítás kerül a Draftba |
| T12 | Audit-javítás elutasítása | Nem módosul a Draft |
| T13 | Lab újraindítása | A Working Draft visszatölthető |
| T14 | Jóváhagyás | Sikeres QA után létrejön az új Approved Baseline |
| T15 | Sikertelen véglegesítés | Az előző elfogadott konfiguráció sértetlen |
| T16 | Külső kódmódosítás | Kompatibilitás- és QA-érvényességi ellenőrzés történik |

## 3. Project Contract-tesztek

| ID | Teszt | Kötelező eredmény |
|---|---|---|
| C01 | Hibás Contract-verzió | Szerkesztés blokkolva, pontos diagnosztika |
| C02 | Nem létező tokenreferencia | Validációs hiba |
| C03 | Körkörös tokenfüggőség | A rendszer felismeri a függőségi ciklust |
| C04 | Hibás komponensfixture | Lokalizált hiba, a többi komponens használható |
| C05 | Globális vs. variánsszintű token | A szerkesztési hatókörök nem keverednek |
| C06 | Reszponzív tokeneltérés | Csak deklarált eltérés alkalmazható |
| C07 | Audit-javítás | Elfogadás után egyetlen Undo-műveletként visszavonható |
| C08 | Elavult QA | Nem használható véglegesítéshez |
| C09 | Külső React-módosítás | Nincs csendes Draft-felülírás |
| C10 | Produkciós build | A Lab futtatókörnyezete nem szükséges a kész alkalmazáshoz |

## 4. Vizuális invariánsteszt

### R01 — Változtatás nélküli megjelenés

Az első UI Lab-indítás önmagában nem módosíthatja a Task Manager megjelenését.

Az alkalmazást azonos böngészőben, viewporton, tartalommal és fontbetöltési állapotban kell ellenőrizni a Labon kívül és a Lab előnézetében.

A jelentős eltérések hibának számítanak. A képösszehasonlítás toleranciáját és a dinamikus tartalom kizárását előre dokumentálni kell.

### R02 — Kártya belső térköz

A Compact, Comfortable és Spacious presetek rendre 16, 24 és 32 CSS px standard tartalmi insetet biztosítanak.

A teszt a tényleges renderelt geometriát ellenőrzi, nem kizárólag a tokenértéket.

### R03 — Mobilos Spacious

A Spacious preset mobilnézetben nem válthat automatikusan kisebb standard kártyapaddingre.

Eltérés kizárólag külön deklarált és validált reszponzív szabály esetén fogadható el.

### R04 — Ikon és szöveg igazítása

A Button és más releváns komponensek ikon–szöveg igazítása több szöveghosszon és viewporton megfelelő.

A geometriai ellenőrzést vizuális review egészíti ki.

### R05 — Tipográfiai opciók

A felkínált betűvastagságok és tipográfiai variánsok ténylegesen a deklarált fontadatokkal és renderelt megjelenéssel működnek.

Ha egy opció a támogatott környezetben nem különbözik érdemben, nem jelenhet meg megtévesztő választási lehetőségként.

### R06 — Szemantikus színek

A projekt- és accent színek módosítása a megfelelő szemantikus szerepekre hat.

A hiba-, figyelmeztetés- és sikerjelzések jelentése nem változhat meg véletlenül.

### R07 — HTML-azonosítók

A tesztelt oldalak DOM-jában nem lehetnek hibásan ismétlődő HTML ID-k.

### R08 — Túlcsordulás és görgetés

Ne alakuljon ki váratlan vízszintes túlcsordulás, szövegátfedés, levágott vezérlő vagy indokolatlan, egymásba ágyazott görgetési felület.

A szándékosan görgethető komponenseket külön kell kezelni.

### R09 — Komponensállapotok

A Button, TextInput, Dialog és más releváns komponensek fókusz-, hibás, tiltott, betöltési és egyéb deklarált állapotai megfelelően működnek.

A Hover és Focus vizsgálatához valódi böngészőállapotot is elő kell idézni.

### R10 — Akadálymentesség

A releváns WCAG 2.2 AA ellenőrzéseket automatizált és manuális módszerekkel is vizsgálni kell.

Az automatikus scanner sikere nem helyettesíti a billentyűzetes, fókuszkezelési és szükség szerinti képernyőolvasós ellenőrzést.

## 5. Kötelező viewportok

A releváns UI-t az alábbi szélességeken ellenőrizni kell:

320, 390, 768, 1024, 1440 CSS px.

Ezek nem kötelező breakpointok, hanem ellenőrzési szélességek.

A Task Manager ellenőrzése tartalmazzon normál, üres, hosszú tartalmú, hibás és egyéb releváns állapotokat.

## 6. Negatív tesztek

A rendszer minőségellenőrző képességét szándékosan előidézett hibákkal is bizonyítani kell.

Kötelező példák:

- Foundation-skálán kívüli 19 px-es spacingérték.
- Nem létező tokenhivatkozás.
- Körkörös tokenfüggőség.
- Hibás komponensregisztráció.
- Ismétlődő HTML-azonosító.
- Nem megfelelő szövegkontraszt.
- Mobilos tartalmi túlcsordulás.
- Elavult, korábbi Draftból származó QA-eredmény.
- Sikertelen véglegesítés.
- Váratlan külső forráskódmódosítás.

A negatív tesztek nem kerülhetnek be észrevétlenül a végleges referenciaprojektbe. A hibainjektálás reprodukálható, elszigetelt tesztkörnyezetben történjen.

## 7. QA-futtatási szintek

**Static:** Formátumellenőrzés, lint, TypeScript, Contract és tokenvalidáció.

**Unit:** Tokenfeloldás, presetek, Undo, függőségek, állapotkezelés.

**Integration:** Registry, adapter, preview-kommunikáció, generált konfiguráció.

**Browser:** Valódi renderelés, navigáció, űrlapok, geometriák, viewportok.

**Visual:** Reprodukálható screenshotok és vizuális regresszió.

**Accessibility:** Automatizált ellenőrzés és szükséges manuális tesztek.

**End-to-end:** Teljes Working Draft → Audit → javítás → QA → jóváhagyás folyamat.

## 8. Mérföldkő-kapuk

M0: A fejlesztési projekt és az ellenőrzési infrastruktúra működik.

M1: A Foundation és a Project Contract szerződéses tesztjei sikeresek.

M2: A Task Manager működési és komponensvizsgálatai sikeresek.

M3: A Website View és az alapvető globális szerkesztés bizonyított.

M4: A Component Studio valódi komponenseket, variánsokat és fixture-öket kezel.

M5: A Draft, az Audit, a javaslatok és a véglegesítés teljes folyamatban bizonyított.

M6: A teljes kötelező tesztkészlet sikeres, a release dokumentált.

## 9. Kötelező bizonyíték

Minden tesztjelentés tartalmazza a tényleges futtatási eredményeket.

Az elvárt eredmény nem helyettesíti a végrehajtás bizonyítékát.

Sikertelen vagy nem futtatott ellenőrzés esetén a megfelelő státuszt kell jelenteni.

Kötelező blocker fennállásakor a kapcsolódó mérföldkő nem tekinthető késznek.

A végső kiadás előtt minden kötelező, az aktuális verzióra érvényes ellenőrzésnek teljesülnie kell, vagy a dokumentált, megengedett kivételkezelési folyamat szerint kell eljárni.
