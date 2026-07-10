// ============================================================
// localApi.js — Drop-in Supabase replacement for local LAN mode
// Used when app runs at http://192.168.0.159:3000
// Mirrors the Supabase JS client API: .from().select().eq()...
// ============================================================

class QueryBuilder {
  constructor(base, table) {
    this._base    = base;
    this._table   = table;
    this._op      = "select";
    this._columns = "*";
    this._filters = [];
    this._orderBy = [];
    this._limitN  = null;
    this._data    = null;
    this._conflict= null;
    this._isSingle= false;
  }

  // ── Operations ────────────────────────────────────────────
  // NOTE: .insert().select() is a Supabase pattern meaning "return the row".
  // Do NOT overwrite _op when it's already a write operation.
  select(cols = "*") {
    this._columns = cols;
    if (this._op === "select") this._op = "select";
    // else: write op already set — .select() just means "return data" (which we always do)
    return this;
  }
  insert(data)       { this._op = "insert"; this._data = data; return this; }
  update(data)       { this._op = "update"; this._data = data; return this; }
  delete()           { this._op = "delete"; return this; }
  upsert(data, opts = {}) {
    this._op       = "upsert";
    this._data     = data;
    this._conflict = opts.onConflict || null;
    return this;
  }

  // ── Filters ───────────────────────────────────────────────
  eq(col, val)  { this._filters.push({ col, op: "eq",  val }); return this; }
  neq(col, val) { this._filters.push({ col, op: "neq", val }); return this; }
  gt(col, val)  { this._filters.push({ col, op: "gt",  val }); return this; }
  gte(col, val) { this._filters.push({ col, op: "gte", val }); return this; }
  lt(col, val)  { this._filters.push({ col, op: "lt",  val }); return this; }
  lte(col, val) { this._filters.push({ col, op: "lte", val }); return this; }
  in(col, vals) { this._filters.push({ col, op: "in",  val: Array.isArray(vals) ? vals : [...vals] }); return this; }
  is(col, val)  { this._filters.push({ col, op: "is",  val }); return this; }

  // ── Modifiers ─────────────────────────────────────────────
  order(col, opts = {}) {
    this._orderBy.push({ col, ascending: opts.ascending !== false });
    return this;
  }
  limit(n)  { this._limitN = n; return this; }
  single()  { this._isSingle = true; return this; }

  // ── Make builder await-able (thenable) ────────────────────
  then(resolve, reject) { return this._exec().then(resolve, reject); }
  catch(fn)             { return this._exec().catch(fn); }
  finally(fn)           { return this._exec().finally(fn); }

  async _exec() {
    try {
      const res = await fetch(`${this._base}/api/rpc`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          table:    this._table,
          op:       this._op,
          columns:  this._columns,
          filters:  this._filters,
          order:    this._orderBy,
          limit:    this._limitN,
          data:     this._data,
          conflict: this._conflict,
          single:   this._isSingle,
        }),
      });
      return await res.json();
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
  }
}

// Stub Supabase Realtime channel — app already polls as fallback
const makeStubChannel = () => ({
  on()        { return this; },
  subscribe() { return this; },
});

export function createLocalClient(base = "") {
  return {
    from: (table) => new QueryBuilder(base, table),

    // Realtime stubs (polling in App.jsx handles live updates)
    channel:       () => makeStubChannel(),
    removeChannel: ()  => {},

    // Storage stubs — file uploads use dedicated fetch calls in App.jsx
    storage: {
      from: () => ({
        upload:       async () => ({ error: null }),
        getPublicUrl: ()       => ({ data: { publicUrl: "" } }),
        remove:       async () => ({ error: null }),
      }),
    },
  };
}
