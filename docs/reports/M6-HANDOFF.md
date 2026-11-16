> Aktuális helyi R05-javítás és még hiányzó ellenőrzések:
> [M6-R05-FINALIZATION](M6-R05-FINALIZATION.md). Az alábbi történeti eredmények
> változatlanok; nem az új ág teszteredményei.

> TÖRTÉNETI DOKUMENTUM — az alábbi eredmények a privát fejlesztési archívumhoz tartoznak. A nyers bizonyítékok nem kerültek át; ez nem a tiszta export vagy az új repository CI-teljesítésének igazolása. Aktuális határok: [nyilvános előkészítés](../PUBLICATION.md).

# M6 átadás — integrációs QA és release candidate

Dátum: 2026-11-15, Europe/Budapest. Ág: `feat/m6-release-qa`.
PR: [#7](https://github.com/BenHRVTH/web-development-foundation/pull/7).
Végső tesztelt commit: `027b3922a36e3917d72250bfce25fc0a7109072f`.
Kiadási jelölt: **0.1.0-rc.1**, öt együtt telepítendő, SHA-256-tal azonosított artifact.

**Release readiness: BLOKKOLT.** A projektszintű tipográfiai képességkezelés
megvalósult, de a megőrzött Task Manager 600-as alapértékei a konzervatív
képviselőszabály mellett továbbra R05 FAIL-t adnak. A teljes kézi R10-mátrix és
a siker utáni repack NOT_RUN. Nincs nyilvános publikálás vagy beolvasztás.

A teljes módosítási, teszt-, csomag-, hiba- és rollback-átadás:
[M6-TYPOGRAPHY-HANDOFF](M6-TYPOGRAPHY-HANDOFF.md).
A [korábbi M6-átadás](M6-HANDOFF-before-typography.md) és a
[korábbi R05-korrekció minden sikertelen mérése](M6-R05-CORRECTION.md)
történeti bizonyítékként változatlanul megmarad; azok nem aktuális kapueredmények.

## Végleges csomagarchitektúra

| Csomag               | Felelősség és nyilvános határ                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `@wdf/foundation`    | Változatlan LOCKED szabályok; függőségmentes ESM és deklaráció                                   |
| `@wdf/core`          | Contract, tokenfeloldás/generálás, Audit/Change és a saját verziójú tipográfiai profil/validáció |
| `@wdf/adapter-react` | Valódi React Registry/fixture, Website/Studio preview és Vite-integráció                         |
| `@wdf/qa`            | Fejlesztői böngészős Approval QA, axe, geometria, billentyűzet és valódi fontképesség-mérés      |
| `@wdf/ui-lab`        | Helyi CLI, két munkaterület, egy tartós Draft, Review és tranzakciós jóváhagyás                  |

Pontos exportok, típusok, bin/files, függőségek, fájllista és SHA-256:
végső inventory (privát archívum: `M6-TYPOGRAPHY-package-inventory.json`).
[ADR-0010](../adr/0010-m6-packaged-release.md): TypeScript-fordító, ESM és npm pack.
[ADR-0011](../adr/0011-m6-typography-capabilities.md): projekt által deklarált,
WDF által ténylegesen mért tipográfiai képességek. Nincs új fontkészlet,
kötelező WDF-arculat vagy Foundation-módosítás.

A privát source-workspace 0.0.0 manifestjeiből a build pontos 0.1.0-rc.1
kiadási manifesteket készít. Mind az öt artifact együtt és a saját lockfile-jával
használandó; külön futások azonos RC-verziójú csomagjait ne keverd. A telepített
csomagok ESM-belépései és TypeScript-deklarációi valóban ellenőrzöttek,
a nem exportált deep importok elutasítottak. Runtime HTML/CSS bekerül,
workspace/app/teszt/munkaadat/secret nem. Nincs kötelező központi szolgáltatás.

## Független telepítés és alkalmazások

A Hangár saját projektazonosítóval, Contracttal, tokenekkel, arculattal és
négy saját valódi Registry-komponenssel működik. Tényleges `.tgz` telepítés,
saját lockfile-os újratelepítés, generálási check és önálló production build
PASS. Nincs workspace-alias, symlink vagy belső forrásimport.

A fogyasztó saját könyvtárából indított `npm run ui-lab`, Website/Studio,
global/family/variant szerkesztés, Draft/restart, Undo/Redo, A/B, Audit,
hétcheckes tényleges Approval QA, explicit megerősítés és token/CSS/TS
tranzakció PASS Linuxon és Windowson. A production alkalmazás nem importál
WDF fejlesztői runtime-ot. A Task Manager és a Hangár `src`/alaptoken fájljai
az elfogadott `d39adb7` referencia óta változatlanok.

## Teljes követelményalapú eredmény

[Olvasható mátrix](M6-ACCEPTANCE-MATRIX.md),
gépi mátrix minden konkrét tesztcím/status egyezésével (privát archívum: `M6-acceptance-matrix.json`).
T01–T16, C01–C10, R01–R10, negatív, csomagolási és teljes E2E sorok:
**50 PASS, 1 FAIL, 2 NOT_RUN**, 53 sor, az új polling-regresszióval együtt.

| Környezet                                                 | Eredmény                                                                  | Kapu |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | ---- |
| Debian 13, Node 24.22.1/npm 11.9.0, Chromium 159.0.8154.6 | 216 unit/integrációs + 144 browser PASS; 1 R05 FAIL; sourceIntegrity true | FAIL |
| Ubuntu 26.04.1 LTS, azonos eszközverziók                  | 216 unit/integrációs + 144 browser PASS; 1 R05 FAIL                       | FAIL |
| Windows Server 2025, azonos eszközverziók                 | 20 tárolási/journal + 5 M6 browser PASS; 1 R05 FAIL                       | FAIL |

Teljes natív CI és artifactok (privát archívum: `M6-TYPOGRAPHY-ci.json`),
[végső Actions-futás](https://github.com/BenHRVTH/web-development-foundation/actions/runs/43755049117).
A CI head 027b392, a szintetikus teszt-merge-ref 4843d82; a PR nincs merge-elve.
A nyers fontadatok minden jelöltpárt megtartanak. Windowson a Segoe UI valódi
600-as súlya igazolt lehet; a utility Consolas 600/700 párja összeolvad.
Linuxon az eredeti utility/action 600 érték nem igazolt. A Hangár R05 PASS.

Az R01 25 képpáron, változatlan 8 pixel/1 csatornaérték küszöbbel és nulla
geometriai eltéréssel PASS; a részleges raszterezés javítása megmaradt.
Axe, valódi automatizált billentyűzet/fókusz, öt szélesség, állapotok és reflow
ellenőrzött. A végső natív 200%-os célzott megfigyelés (privát archívum: `M6-TYPOGRAPHY-native-zoom.json`)
is megtörtént mindkét production builden, majd a nagyítás 100%-ra visszaállt.
A teljes kézi R10-mátrix/tartós natív PNG-export továbbra NOT_RUN; képernyőolvasó
szintén NOT_RUN. Nem állítunk teljes WCAG-megfelelőséget scannereredményből.

## Biztonság, platformkorlátok és visszaállítás

[Biztonsági jelentés](M6-SECURITY.md): 0 high/critical, 7 ismert moderate dev-lint
jelzés; a friss telepített fogyasztó auditja 0 sérülékenység. Az exact
Host/Origin/session/project/scope és fájlelérési korlátok regressziói megmaradtak.
A Lab nem végez automatikus Git-műveletet. Átmeneti olvasási hiba után csak
friss GET oldja fel a felületet; bizonytalan írás nem ismétlődik automatikusan.

Windows: helyi NTFS, látható directory-fsync korláttal; áramszünet/OS-crash
után nincs Linuxszal azonos tartóssági ígéret. Hálózati/felhőszinkronizált
tároló, többgépes lock és nem támogatott böngésző nem kapott igazolatlan PASS-t.
Régi Contract/Draft-konfliktusnál a munka megmarad, írás blokkolt;
automatikus adat- vagy súlymigráció nincs.

Rollback előtt állítsd le a Labot, archiváld együtt a teljes `.wdf-lab`
könyvtárat, hiteles tokenforrást és CSS/TS kimenetet. Külön checkoutban a
`d39adb7` a tipográfiai változás előtti referencia; teljes csomagkészletre és
hozzá illő lockfile-ra válts. Régi és új engine/bizonyíték vegyes használata nem
igazolt. A korábbi R05 FAIL visszaállítástól sem válik PASS-szá.

Használat: [Getting Started](../GETTING-STARTED.md),
[Developer Guide](../DEVELOPER-GUIDE.md), [Release Guide](../RELEASE-GUIDE.md).
Az M6 kiadása a megmaradó R05/kézi hiányok szakmai feloldásáig blokkolt.
Az átadás független felülvizsgálatra szól; nincs merge, npm-publikálás,
GitHub Release, végleges tag vagy M7-fejlesztés.
