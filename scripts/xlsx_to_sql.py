"""Convert the legacy workbook "IT Asset & Records v2.xlsx" into an idempotent SQL import for schema `it`.

    python scripts/xlsx_to_sql.py "path/to/IT Asset & Records v2.xlsx" > data/import.sql

The output contains real company data, so it goes to data/ (git-ignored) and is run with
psql / the Supabase SQL editor. Re-running is safe: assets are upserted by (sheet, row),
lists by key, documents by (doc_no, rev).
"""
import datetime as dt
import json
import sys

import openpyxl

ASSET_SHEETS = ['Desktop-Laptop', 'Monitor', 'Software', 'Accessories', 'Other', 'Internet', 'Plan']

# Lists sheet column -> list_key (row 4.. = values); label column for priority definitions
LIST_COLS = {
    'A': 'type', 'B': 'status', 'C': 'priority', 'E': 'system', 'F': 'dept', 'G': 'user',
    'H': 'okng', 'I': 'passfail', 'L': 'escalation', 'M': 'handover', 'N': 'condition',
    'O': 'backup', 'P': 'doc_status',
}
LIST_LABEL = {'C': 'D'}

# header (lower-cased, trimmed) -> it.assets column; first match wins
FIELD_HEADERS = {
    'asset_tag': ['asset tag (ac)', 'asset tag'],
    'serial': ['serial no', 'serial'],
    'name': ['asset name', 'com name', 'name'],
    'model': ['model'],
    'category': ['category'],
    'manufacturer': ['manufacturer'],
    'user_name': ['user name', 'user', 'username'],
    'department': ['department'],
    'location': ['current location', 'location'],
    'status': ['status'],
}


def q(v):
    if v is None:
        return 'null'
    return "'" + str(v).replace("'", "''") + "'"


def clean(v):
    if isinstance(v, (dt.datetime, dt.date)):
        return v.date().isoformat() if isinstance(v, dt.datetime) else v.isoformat()
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def upsert(table, cols, rows, conflict, update_cols=None, extra=''):
    """One multi-row insert per table; update_cols=None -> do nothing on conflict."""
    if not rows:
        return []
    action = ('do update set ' + ', '.join(f'{c} = excluded.{c}' for c in update_cols) + extra) if update_cols else 'do nothing'
    body = ',\n  '.join('(' + ', '.join(r) + ')' for r in rows)
    return [f"insert into {table} ({', '.join(cols)}) values\n  {body}\non conflict ({conflict}) {action};"]


def assets_sql(wb):
    cols = ['source_sheet', 'source_row', *FIELD_HEADERS.keys(), 'raw']
    rows = []
    for name in ASSET_SHEETS:
        if name not in wb.sheetnames:
            continue
        ws = wb[name]
        headers = [str(c.value).strip() if c.value is not None else None for c in ws[1]]
        lower = [h.lower() if h else None for h in headers]
        for r in range(2, ws.max_row + 1):
            vals = [clean(c.value) for c in ws[r][:len(headers)]]
            raw = {h: v for h, v in zip(headers, vals) if h and v is not None}
            if not raw:                      # blank, or only stray cells outside the header columns
                continue
            row = {}
            for field, candidates in FIELD_HEADERS.items():
                for cand in candidates:
                    if cand in lower:
                        v = vals[lower.index(cand)]
                        if v is not None:
                            row[field] = str(v)
                            break
            if not row:                      # legend/notes rows (e.g. status key under the table)
                continue
            rows.append([q(name), str(r), *(q(row.get(f)) for f in FIELD_HEADERS),
                         q(json.dumps(raw, ensure_ascii=False)) + '::jsonb'])
    return upsert('it.assets', cols, rows, 'source_sheet, source_row', cols[2:], ', imported_at = now()')


def lists_sql(wb):
    ws = wb['Lists']
    items = []
    for col, key in LIST_COLS.items():
        sort = 0
        for r in range(4, 61):
            v = clean(ws[f'{col}{r}'].value)
            if v is None:
                continue
            sort += 1
            label = clean(ws[f'{LIST_LABEL[col]}{r}'].value) if col in LIST_LABEL else None
            items.append([q(key), q(v), q(label), str(sort)])
    out = upsert('it.list_items', ['list_key', 'value', 'label', 'sort'], items, 'list_key, value',
                 ['label', 'sort'], ', active = true')
    maint, sort = [], 0
    for r in range(4, 61):
        t, m = clean(ws[f'J{r}'].value), clean(ws[f'K{r}'].value)
        if t is None:
            continue
        sort += 1
        maint.append([q(t), str(int(m)), str(sort)])
    out += upsert('it.maint_types', ['name', 'every_months', 'sort'], maint, 'name', ['every_months', 'sort'])
    hol = [[q(clean(ws[f'U{r}'].value))] for r in range(4, 61) if isinstance(ws[f'U{r}'].value, (dt.datetime, dt.date))]
    out += upsert('it.holidays', ['day'], hol, 'day')
    sat = clean(ws['S4'].value) or 'Y'
    out += upsert('it.settings', ['key', 'value'], [[q('work_saturday'), q(sat)]], 'key', ['value'])
    return out


def documents_sql(wb):
    ws = wb['Doc_List']
    cols = ['doc_no', 'title_en', 'title_th', 'title_cn', 'rev', 'effective', 'prepared_by', 'approved_by', 'status', 'remark']
    rows = []
    for r in range(4, ws.max_row + 1):
        vals = [clean(ws.cell(r, c).value) for c in range(1, 11)]
        if vals[0] is None:
            continue
        vals[4] = str(vals[4]) if vals[4] is not None else '00'
        rows.append([q(v) for v in vals])
    return upsert('it.documents', cols, rows, 'doc_no, rev')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
    print('-- generated by scripts/xlsx_to_sql.py – contains real data, do not commit')
    print('begin;')
    for line in lists_sql(wb) + assets_sql(wb) + documents_sql(wb):
        print(line)
    print('commit;')


if __name__ == '__main__':
    main()
