# A nyilvános CI történeti R05 FAIL-bizonyítékai

Forrás: [GitHub Actions 43825980171](https://github.com/BenHRVTH/web-development-foundation-public/actions/runs/43825980171),
commit `99c649ae5a78bfea0ddb7646247870d3d97b38db`, verzió `0.1.0-rc.1`.
A két job befejezett logjából származó teljes `WDF_R05_RESULT_BEGIN` / `END`
JSON-blokk megmaradt. A log-időbélyegek eltávolítása és JSON-formázás nem módosította
a méréseket; minden eredeti súlypár, computed érték, fontface és PNG-hash megvan.

Mindkét eredeti összesítés **FAIL**. Ezek nem az új algoritmus teszteredményei.
A régi páreredmények nem válhatnak új PASS-szá attól, hogy más képviselő marad
a választóban. A teljes Windows PNG-archívum letöltése proxyhiba miatt nem volt
elérhető: nem állítunk helyben megnyitott történeti Windows-képeket.

## Megőrzési hely és integritás

A teljes JSON-ok gzip-exportja és gépi manifestje az átadott **helyi bizonyíték-
csomagban**, `docs/reports/evidence/m6/r05-history/` alatt található. Ezek a repository
meglévő szabálya szerint figyelmen kívül hagyott QA-artifactok; nem automatikusan
verziózott források. A felülvizsgálatkor a forrás-diff mellett a helyi artifact-
csomagot is meg kell őrizni. Az eredeti privát repository-ból nem került át artifact.
Ez a dokumentum tartósan rögzíti a provenienciát és a lenyomatokat.

### linux — job `133159851190`

Eredeti státusz: **FAIL**; 95 kontextus, 205 összes pár,
55 sikertelen pár. Node v24.22.1, Chromium
159.0.8154.6.

- Fájl: `ci-43825980171-linux.json.gz`
- Gzip SHA-256: `a76e015b7439585c8bff346e674b86aac24cfdc16c6a97ee2045ddd18528d155`
- Kibontott JSON SHA-256: `2177cf735049f13ca25867fb2f23a89e798cd9c4fe1b44cca52ed8b2d0327b6d`

### win32 — job `133159851513`

Eredeti státusz: **FAIL**; 95 kontextus, 205 összes pár,
15 sikertelen pár. Node v24.22.1, Chromium
159.0.8154.6.

- Fájl: `ci-43825980171-windows.json.gz`
- Gzip SHA-256: `2895c413152552d19cce92437aa68bc29478e30b592ff0de165fdecf754ba9d7`
- Kibontott JSON SHA-256: `a795beaffb2d0821e3f11d3f9cbdba037942f3f074c6ac99aceba0531fbaaff0`

A manifest szerinti SHA-256 ellenőrzés és gzip-kibontás után a JSON `status`,
`commit` és minden `projects[].capabilities.roles[].measurements[].comparisons`
érték ellenőrizhető. A régi PNG-útvonalak ideiglenes CI-elérési utak, nem a helyi
képfájlok meglétének ígéretei.

Az új helyi módosítás és eredmények külön dokumentum:
[M6-R05-FINALIZATION](M6-R05-FINALIZATION.md). A régi privát fejlesztési
[M6-R05-CORRECTION](M6-R05-CORRECTION.md) változatlan történeti leírás marad.
