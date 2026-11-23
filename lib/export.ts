/** CSV metni: UTF-8 BOM, ";" ayırıcı ve virgüllü ondalık (Türkçe Excel), tırnaklı hücreler, formül enjeksiyonu koruması. */
export function toCsv(rows: (string | number)[][]): string {
  return (
    "﻿" +
    [["TEMSİLİ DEMO VERİSİ — Gerçek şirket kaydı değildir."], ...rows]
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              (typeof v === "string" && /^[=+@\-\t\r]/.test(v)
                ? "'" + v
                : typeof v === "number"
                  ? String(v).replace(".", ",")
                  : String(v)
              ).replaceAll('"', '""') +
              '"',
          )
          .join(";"),
      )
      .join("\r\n")
  );
}
export function csvDownload(rows: (string | number)[][], name: string) {
  const url = URL.createObjectURL(
    new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
