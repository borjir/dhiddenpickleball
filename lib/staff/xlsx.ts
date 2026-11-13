/**
 * Minimal, dependency-free XLSX writer for the staff operations report.
 *
 * An .xlsx file is a ZIP of XML parts. Building it by hand keeps the Worker
 * bundle small (the free-plan limit is already tight) and lets the report use
 * the club's favourite colours, currency format, print layout, and filters.
 * Only the parts this one-sheet workbook needs are written.
 */

const BRAND = "D-HIDDEN PICKLEBALL COURT & BISTRO";

type ReportDay = {
  dateId: string;
  courtBookings: number;
  courtHours: number;
  openPlayPlaces: number;
  collected: number;
  cancellations: number;
  noShows: number;
};

export type OperationsReportData = {
  from: string;
  to: string;
  days: ReportDay[];
  totals: {
    courtBookings: number;
    courtHours: number;
    openPlayPlaces: number;
    collected: number;
    outstanding: number;
    occupancy: number;
    cancellations: number;
    noShows: number;
  };
};

const S = {
  title: 1,
  accent: 2,
  subtitle: 3,
  metaLeft: 4,
  metaRight: 5,
  section: 6,
  metricLabel: 7,
  metricNumber: 8,
  metricHours: 9,
  metricCurrency: 10,
  metricText: 11,
  tableHeader: 12,
  cellText: 13,
  cellTextAlt: 14,
  cellNumber: 15,
  cellNumberAlt: 16,
  cellHours: 17,
  cellHoursAlt: 18,
  cellCurrency: 19,
  cellCurrencyAlt: 20,
  totalLabel: 21,
  totalNumber: 22,
  totalHours: 23,
  totalCurrency: 24,
  note: 25,
  footerTitle: 26,
  footerText: 27,
} as const;

const textEncoder = new TextEncoder();

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function textCell(ref: string, value: string, style: number) {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(ref: string, value: number, style: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `<c r="${ref}" s="${style}"><v>${safe}</v></c>`;
}

function rowXml(row: number, height: number, cells: string) {
  return `<row r="${row}" ht="${height}" customHeight="1">${cells}</row>`;
}

function longDate(dateId: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${dateId}T12:00:00+08:00`));
}

function shortDate(dateId: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${dateId}T12:00:00+08:00`));
}

function generatedLabel(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(value);
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00"/>
    <numFmt numFmtId="165" formatCode="0.0"/>
  </numFmts>
  <fonts count="12">
    <font><sz val="11"/><color rgb="FF171A1F"/><name val="Calibri"/></font>
    <font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Georgia"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Georgia"/></font>
    <font><sz val="10"/><color rgb="FF667085"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF171A1F"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><color rgb="FF123B78"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF667085"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF123B78"/><name val="Georgia"/></font>
    <font><b/><sz val="11"/><color rgb="FF123B78"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF123B78"/><name val="Georgia"/></font>
    <font><sz val="10"/><color rgb="FF171A1F"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF123B78"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1674D5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAF1"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF78B51B"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE4E8ED"/></left>
      <right style="thin"><color rgb="FFE4E8ED"/></right>
      <top style="thin"><color rgb="FFE4E8ED"/></top>
      <bottom style="thin"><color rgb="FFE4E8ED"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFE4E8ED"/></left>
      <right style="thin"><color rgb="FFE4E8ED"/></right>
      <top style="medium"><color rgb="FF123B78"/></top>
      <bottom style="thin"><color rgb="FFE4E8ED"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="28">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="5" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="7" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="8" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="165" fontId="8" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="164" fontId="8" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="8" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="165" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="165" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="164" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="9" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="9" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="165" fontId="9" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="164" fontId="9" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="11" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1" indent="1"/></xf>
    <xf numFmtId="0" fontId="10" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function sheetXml(report: OperationsReportData, preparedBy: string) {
  const rows: string[] = [];
  const merges: string[] = [];

  let r = 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 34, textCell(`A${r}`, BRAND, S.title)));
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 6, textCell(`A${r}`, "", S.accent)));
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(
    rowXml(
      r,
      22,
      textCell(
        `A${r}`,
        `${longDate(report.from)} to ${longDate(report.to)}  ·  ${report.days.length} day${
          report.days.length === 1 ? "" : "s"
        }`,
        S.subtitle,
      ),
    ),
  );
  r += 1;

  merges.push(`A${r}:D${r}`, `E${r}:H${r}`);
  rows.push(
    rowXml(
      r,
      18,
      textCell(`A${r}`, `Prepared by ${preparedBy}`, S.metaLeft) +
        textCell(
          `E${r}`,
          `Generated ${generatedLabel(new Date())} (Asia/Manila)`,
          S.metaRight,
        ),
    ),
  );
  r += 1;

  rows.push(`<row r="${r}" ht="8" customHeight="1"/>`);
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 24, textCell(`A${r}`, "AT A GLANCE", S.section)));
  r += 1;

  const metrics: Array<{
    left: { label: string; value: number | string; style: number };
    right: { label: string; value: number | string; style: number };
  }> = [
    {
      left: {
        label: "Court bookings",
        value: report.totals.courtBookings,
        style: S.metricNumber,
      },
      right: {
        label: "Court hours",
        value: Number(report.totals.courtHours.toFixed(1)),
        style: S.metricHours,
      },
    },
    {
      left: {
        label: "Open-play places",
        value: report.totals.openPlayPlaces,
        style: S.metricNumber,
      },
      right: {
        label: "Collected (PHP)",
        value: report.totals.collected,
        style: S.metricCurrency,
      },
    },
    {
      left: {
        label: "Outstanding (PHP)",
        value: report.totals.outstanding,
        style: S.metricCurrency,
      },
      right: {
        label: "Court occupancy",
        value: `${report.totals.occupancy}%`,
        style: S.metricText,
      },
    },
    {
      left: {
        label: "Cancellations",
        value: report.totals.cancellations,
        style: S.metricNumber,
      },
      right: {
        label: "No-shows",
        value: report.totals.noShows,
        style: S.metricNumber,
      },
    },
  ];

  for (const metric of metrics) {
    merges.push(`A${r}:C${r}`, `E${r}:G${r}`);
    const leftValue =
      typeof metric.left.value === "number"
        ? numberCell(`D${r}`, metric.left.value, metric.left.style)
        : textCell(`D${r}`, metric.left.value, metric.left.style);
    const rightValue =
      typeof metric.right.value === "number"
        ? numberCell(`H${r}`, metric.right.value, metric.right.style)
        : textCell(`H${r}`, metric.right.value, metric.right.style);

    rows.push(
      rowXml(
        r,
        24,
        textCell(`A${r}`, metric.left.label, S.metricLabel) +
          textCell(`B${r}`, "", S.metricLabel) +
          textCell(`C${r}`, "", S.metricLabel) +
          leftValue +
          textCell(`E${r}`, metric.right.label, S.metricLabel) +
          textCell(`F${r}`, "", S.metricLabel) +
          textCell(`G${r}`, "", S.metricLabel) +
          rightValue,
      ),
    );
    r += 1;
  }

  rows.push(`<row r="${r}" ht="10" customHeight="1"/>`);
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 24, textCell(`A${r}`, "DAILY ACTIVITY", S.section)));
  r += 1;

  const headerRow = r;
  rows.push(
    rowXml(
      r,
      30,
      textCell(`A${r}`, "Date", S.tableHeader) +
        textCell(`B${r}`, "Day", S.tableHeader) +
        textCell(`C${r}`, "Court bookings", S.tableHeader) +
        textCell(`D${r}`, "Court hours", S.tableHeader) +
        textCell(`E${r}`, "Open-play places", S.tableHeader) +
        textCell(`F${r}`, "Collected (PHP)", S.tableHeader) +
        textCell(`G${r}`, "Cancellations", S.tableHeader) +
        textCell(`H${r}`, "No-shows", S.tableHeader),
    ),
  );
  r += 1;

  for (const [index, day] of report.days.entries()) {
    const alt = index % 2 === 1;
    const textStyle = alt ? S.cellTextAlt : S.cellText;
    const numberStyle = alt ? S.cellNumberAlt : S.cellNumber;
    const hoursStyle = alt ? S.cellHoursAlt : S.cellHours;
    const currencyStyle = alt ? S.cellCurrencyAlt : S.cellCurrency;

    rows.push(
      rowXml(
        r,
        19,
        textCell(`A${r}`, day.dateId, textStyle) +
          textCell(`B${r}`, shortDate(day.dateId), textStyle) +
          numberCell(`C${r}`, day.courtBookings, numberStyle) +
          numberCell(`D${r}`, Number(day.courtHours.toFixed(1)), hoursStyle) +
          numberCell(`E${r}`, day.openPlayPlaces, numberStyle) +
          numberCell(`F${r}`, day.collected, currencyStyle) +
          numberCell(`G${r}`, day.cancellations, numberStyle) +
          numberCell(`H${r}`, day.noShows, numberStyle),
      ),
    );
    r += 1;
  }

  const lastDataRow = r - 1;

  merges.push(`A${r}:B${r}`);
  rows.push(
    rowXml(
      r,
      22,
      textCell(`A${r}`, "TOTAL", S.totalLabel) +
        textCell(`B${r}`, "", S.totalLabel) +
        numberCell(`C${r}`, report.totals.courtBookings, S.totalNumber) +
        numberCell(`D${r}`, Number(report.totals.courtHours.toFixed(1)), S.totalHours) +
        numberCell(`E${r}`, report.totals.openPlayPlaces, S.totalNumber) +
        numberCell(`F${r}`, report.totals.collected, S.totalCurrency) +
        numberCell(`G${r}`, report.totals.cancellations, S.totalNumber) +
        numberCell(`H${r}`, report.totals.noShows, S.totalNumber),
    ),
  );
  r += 1;

  rows.push(`<row r="${r}" ht="10" customHeight="1"/>`);
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 22, textCell(`A${r}`, "WHAT THESE NUMBERS MEAN", S.section)));
  r += 1;

  const notes = [
    "Collected counts only payments verified by staff or manually recorded within the selected dates.",
    "Outstanding is the current total for upcoming unpaid bookings, not limited to the selected range.",
    "Court occupancy is booked court hours out of 2 courts × 17 open hours per day across the selected dates.",
  ];

  for (const note of notes) {
    merges.push(`A${r}:H${r}`);
    rows.push(rowXml(r, 24, textCell(`A${r}`, note, S.note)));
    r += 1;
  }

  rows.push(`<row r="${r}" ht="12" customHeight="1"/>`);
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 22, textCell(`A${r}`, "D-Hidden Pickleball Court & Bistro", S.footerTitle)));
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(
    rowXml(
      r,
      18,
      textCell(
        `A${r}`,
        "Bung-aw, Pondol, Balamban, Cebu 6041 · 0956 167 0905 · gracemilan87@gmail.com",
        S.footerText,
      ),
    ),
  );
  r += 1;

  merges.push(`A${r}:H${r}`);
  rows.push(rowXml(r, 4, textCell(`A${r}`, "", S.accent)));
  const lastRow = r;

  return {
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:H${lastRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="12" customWidth="1"/>
    <col min="2" max="2" width="17" customWidth="1"/>
    <col min="3" max="3" width="15" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="17" customWidth="1"/>
    <col min="6" max="6" width="17" customWidth="1"/>
    <col min="7" max="7" width="15" customWidth="1"/>
    <col min="8" max="8" width="12" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <autoFilter ref="A${headerRow}:H${lastDataRow}"/>
  <mergeCells count="${merges.length}">${merges
    .map((ref) => `<mergeCell ref="${ref}"/>`)
    .join("")}</mergeCells>
  <pageMargins left="0.35" right="0.35" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
  <headerFooter>
    <oddHeader>&amp;L&amp;"Georgia,Bold"D-HIDDEN PICKLEBALL&amp;R&amp;D</oddHeader>
    <oddFooter>&amp;LOperations report&amp;RPage &amp;P of &amp;N</oddFooter>
  </headerFooter>
</worksheet>`,
    headerRow,
  };
}

function coreXml(preparedBy: string) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>D-Hidden operations report</dc:title>
  <dc:creator>${escapeXml(preparedBy)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(preparedBy)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
</cp:coreProperties>`;
}

function workbookXml(headerRow: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Operations report" sheetId="1" r:id="rId1"/></sheets>
  <definedNames>
    <definedName name="_xlnm.Print_Titles" localSheetId="0">'Operations report'!$${headerRow}:$${headerRow}</definedName>
  </definedNames>
</workbook>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>D-Hidden Operations Desk</Application>
  <Company>D-Hidden Pickleball Court &amp; Bistro</Company>
</Properties>`;
}

// --- ZIP -------------------------------------------------------------------

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zip(entries: Array<{ name: string; xml: string }>) {
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate =
    ((Math.max(1980, now.getFullYear()) - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = textEncoder.encode(entry.name);
    const data = textEncoder.encode(entry.xml);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);

    offset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concat([...localParts, ...centralParts, end]);
}

export function buildOperationsWorkbook(
  report: OperationsReportData,
  preparedBy: string,
) {
  const sheet = sheetXml(report, preparedBy);

  return zip([
    { name: "[Content_Types].xml", xml: contentTypesXml() },
    { name: "_rels/.rels", xml: rootRelsXml() },
    { name: "docProps/app.xml", xml: appXml() },
    { name: "docProps/core.xml", xml: coreXml(preparedBy) },
    { name: "xl/workbook.xml", xml: workbookXml(sheet.headerRow) },
    { name: "xl/_rels/workbook.xml.rels", xml: workbookRelsXml() },
    { name: "xl/styles.xml", xml: stylesXml() },
    { name: "xl/worksheets/sheet1.xml", xml: sheet.xml },
  ]);
}
