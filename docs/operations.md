# UniRadar — üzemeltetési jegyzet

## Adatforrás és működés

- GitHub: FasiSandor/uniradar, main.
- Vercel: meglévő uniradar production projekt.
- Neon projekt: UniRadar (dry-rice-83296469), Frankfurt.
- Adatbázis táblák: public.uniradar_courses (szakadatlapok), public.uniradar_offerings (év szerinti meghirdetések).
- A `DATABASE_URL` kizárólag a Vercel titkos környezeti változója. GitHub-fájlokba ne kerüljön.
- `GET /api/catalog` jelzi a forrást a `source` mezőben: `neon` vagy `not-configured`.
- A korábbi statikus katalógus csak hibatűrő tartalék.
- Az érvényes meghirdetés forrás URL-hez, évhez és dátumhoz kötött; az üres meghirdetéslista nem jelenti azt, hogy az adott évben nincs képzés.

## Ellenőrzés élesítés után

1. `/api/catalog` válaszában `source: "neon"`, a `courses` mezőben rekordok.
2. A webes képzéskereső ezeket jeleníti meg, a régi, statikus adatokkal csak hiba esetén működik.
3. A Vercel production deploy READY, és ugyanaz a main commit van rajta.
4. A heti hivatalosforrás-figyelő csak változásokat jelöl, nem publikál automatikusan felvételi tényeket.

## Kiadási elv

Több összefüggő változtatásból egy GitHub release-commit és egy Vercel production build készüljön.
