# Mason AI Day 2025 poster (HTML)

Single-file poster: open `index.html` in Chrome, Edge, or Firefox.

## Printing to PDF (36 × 48 in)

1. Open `index.html` in your browser (double-click or **File → Open**).
2. Press **Ctrl+P** (Windows) or **Cmd+P** (macOS).
3. Choose **Save as PDF** / **Microsoft Print to PDF** as the printer.
4. Set **Paper size** to **36 × 48 in** if your print dialog exposes a custom size. If that size is not listed, use **A0** (841 × 1189 mm) as a common large-format close substitute, or define a custom page size in the PDF/printer driver.
5. Enable **Background graphics** / **Print backgrounds** so Mason green, gold accents, and chart colors appear correctly.
6. Set **Margins** to **None** or **Minimum** if available, then save.

The stylesheet sets `@page { size: 36in 48in; }` and `print-color-adjust: exact` so browsers that honor those properties will target poster dimensions and preserve brand colors.

## Screen preview

The layout is constrained to **900px** max width for on-screen reading. For a larger on-screen mock of the printed poster, use the browser zoom (e.g. 150–200%) or temporarily remove the `max-width` on `.poster-wrap` in developer tools.

## Content updates

The repository README lists authors only as the **Smart Inspection** capstone team. Replace the author strip and footer in `index.html` with full names, roles, and emails when you have them. Swap the QR placeholder for an embedded image or generated QR pointing to your demo or repo URL.
