# ADR-0007 — M5 Change Manager, mentés és véglegesítés

- Dátum: 2026-11-14, Europe/Budapest.
- Kiindulópont: `25320d3`, az elfogadott M4 #5 merge-je.
- Forrás: M5 felhasználói megbízás; Blueprint §5.5–7; T02/T04/T05/T09–T16, C07–C09.

## Döntés

Az M4 `App.config` tulajdonlása a helyi `ChangeManager` szolgáltatáshoz kerül.
A Lab `useChangeManager` kliense kizárólag ennek visszaigazolt konfigurációját
rendereli. Nincs localStorage-designmásolat, második tokenszerkesztő vagy Draft-ág.
Az editor beviteli szövege lehet átmenetileg hibás; ez nem alkalmazott konfiguráció.
A gyors műveletek sorban futnak, a preview csak a tartós mentés visszaigazolása után
frissül. Függő/hibás kérésnél nincs mentettnek feltüntetett optimista design.

A három állapot egyetlen checksumolt `wdf-change@1` állományban található:
`<projekt>/.wdf-lab/<project-id>/state.json`. A formátum és a Contract külön
verziózott. Projekt- és Contract-eltérés blokkol; nem készítünk helyette másik Draftot.
A `WDF_LAB_STORAGE_DIR` kizárólag megbízható indítási környezeti beállítás,
elszigetelt tesztekhez; a böngésző nem választhat tárolót vagy fájlútvonalat.

- Initial Reference: az első sikeresen elindított Lab hiteles konfigurációjának
  egyszeri snapshotja. Sikeres listen előtt új referencia még nem kerül lemezre.
  Soha nem jóváhagyási rekord, és soha nem írjuk felül.
- Approved Baseline: kezdetben `null`; csak aktuális Approval QA és külön
  felhasználói megerősítés után cserélhető. A teljes QA-rekord, konfiguráció-,
  forrás-/környezetazonosság, idő és a megerősített művelet UUID-ja megmarad.
- Working Draft: egyetlen aktív `EditableTokenConfig`, strukturált történettel
  és cursorral. Website és Studio ugyanazt használja.

A history-elemek a műveletet, scope-onkénti értékeltéréseket és előtte/utána
snapshotot rögzítik. Undo/Redo a teljes logikai műveletet mozgatja; új szerkesztés
levágja a Redo-ágat. A globális Spacing preset minden globális spacinghelyet,
a már deklarált responsive értékeket is lecseréli; a komponensvariánsok szerződése
nem változik mellékhatásként. Egy Audit-javítás egyetlen history-elem.
A jóváhagyás nem jelenik meg automatikus szerkesztésnek vagy Git-műveletnek.

## Tartósság és helyreállítás

A következő könyvtár-fsync szerződés Linuxra vonatkozik. A natív Windows eltérő,
láthatóan jelzett tartóssági korlátját az [ADR-0009](0009-m5-platform-storage.md)
rögzíti; Windows alatt áramszünet utáni azonos garanciát nem állítunk.

A normál mentés egy könyvtáron belüli exkluzív ideiglenes fájlba ír, fsynceli,
rename-mel cseréli az állapotot, majd fsynceli a könyvtárat. A checksum, strict séma,
cursor, history-lánc, eltéréslista és aktuális Draft egyezése újratöltéskor ellenőrzött.
Sérülés esetén a fájl megmarad, a CLI diagnosztikával megáll. Nincs alapértékre
visszaesés és nincs automatikus adatelvetés.

A véglegesítés négy zárt célpontot érint: a Manifestből feloldott tokenforrást,
az M1 konvenció szerinti `src/generated/tokens.css` és `tokens.ts` kimenetet,
valamint a mentési állapotot. A tartalom ugyanabból az M1 generátorból és a
meglévő Prettier-beállításokkal készül, mint a `generate:tokens` kimenete.

Az fsyncelt, checksumolt `transaction.json` a négy cél régi és új tartalmát
tartalmazza, útvonalak helyett zárt célazonosítókkal. Az állapotfájl a legutolsó
commit-marker. Előtte megszakadva visszaállítjuk mind a négy régi fájlt; utána
a teljes új állapotot tartjuk meg. Ismeretlen külső fájlváltozás vagy sérült journal
blokkolja a helyreállítást. Nincs találgató felülírás. Az olvasást kiszolgáló Vite
nem többfájlos fájlrendszer-tranzakciós olvasó; a szolgáltatás műveletei viszont
szerializáltak, és csak teljes commit után igazolnak jóváhagyást.

A journal helyreállítása az adapter létrehozása előtt történik; így a preview már
a visszaállított hiteles konfigurációból indul. A folyamatlock egyszerre egy
helyi tulajdonost enged. Elhalt PID lockja újraindításkor elengedhető; élő vagy
nem ellenőrizhető tulajdonost nem írunk felül.

## Forrásváltozás és A/B

A fingerprintek külön kezelik a Contract/integrációt, tokenstruktúrát, hiteles
tokenértékeket, React/CSS-forrást és QA-környezetet. React-/CSS-változás kompatibilis
forrásváltozás: a Draft és history megmarad, QA elavul. Manifest-, Registry-,
preview-/Vite-integráció vagy hiteles tokeneltérés konfliktus: írás blokkolva,
diagnosztika és ellenőrzött újraindítás szükséges. Nincs automatikus rebase vagy merge.

Az A/B ugyanazon mounted preview-ban kizárólag a meglévő Preview 1.1.0 design
snapshotját váltja. A = Baseline, ennek hiányában Initial Reference; B = Draft.
Mindkettő a jelenlegi React-forrást használja. A referencia csak olvasható,
nem menthető vissza a Draftba. Inkompatibilis/érvénytelen referencia nem alkalmazható;
az elavult referencia és az aktuális forrás használata szövegesen jelzett.

## Következmények

A teljes snapshot-history tudatosan egyszerű helyi v1-megoldás; nagy projektekhez
később mérhető tömörítés kellhet. Nincs TTL vagy automatikus takarítás: a felhasználó
munkaadatait lezárt Lab mellett, mentett másolat után lehet archiválni.
A helyreállítás és a biztonsági modell részletei: [M5 API](../M5-CHANGE-QUALITY-API.md),
[ADR-0008](0008-m5-local-security-qa.md).

## Megszakított folyamat tulajdonlása

Linuxon a lock a PID mellett boot-/folyamatkezdési azonosságot és egyedi lease-ID-t
rögzít. A `/proc` kizárólag rögzített folyamat-életciklus-metaadatának olvasására
szolgál; a böngésző nem választhat PID-et vagy fájlt. A zombi tulajdonos már nem
végezhet írást akkor sem, ha a `kill(pid, 0)` még sikeres. PID-újrafelhasználásnál
a folyamatkezdési azonosság különbözik. Bizonytalan azonosságnál nem vesszük át a lockot.

Az elhalt lease visszavételét exkluzív, append-only `reclaim-<lease>.json` claim
szerializálja. Két egyidejű újraindítás nem törölheti egymás frissen létrehozott
lockját. Megszakadt reclaim újabb, ellenőrzött claimmel folytatható; a kisméretű
metaadatok a diagnosztikához megmaradnak az archiválásig. A tesztfuttató normál
leállításkor SIGTERM-et és időkorlátos graceful shutdownt használ.
