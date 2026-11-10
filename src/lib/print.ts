/** Open a print-friendly window with the given inner HTML and trigger print. */
export function printHtml(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=900,height=650");
  if (!win) return;
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 32px; }
  h1 { font-size: 20px; margin: 0; }
  .muted { color: #64748b; font-size: 12px; }
  .brand { display:flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
  .brand .logo { font-size: 22px; font-weight: 800; color: #059669; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color:#475569; }
  td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
  .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 32px; margin: 8px 0 4px; font-size: 13px; }
  .meta div span { color:#64748b; display:inline-block; min-width: 130px; }
  .totals { margin-top: 16px; text-align: right; font-size: 14px; font-weight: 700; }
  .right { text-align: right; }
  .footer { margin-top: 48px; display:flex; justify-content: space-between; font-size: 12px; color:#64748b; }
</style>
</head>
<body>${bodyHtml}
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
  win.document.close();
}
