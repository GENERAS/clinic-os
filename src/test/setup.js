import { vi } from "vitest";

// Mock Supabase client globally
const mockSupabase = createMockSupabase();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", full_name: "Test Doctor" },
    clinic: { id: "test-clinic-id", name: "Test Clinic" },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/services/database/audit.service", () => ({
  getAuditService: () => ({
    log: vi.fn().mockResolvedValue({}),
  }),
}));

export function createMockSupabase() {
  const state = {
    lastTable: null,
    lastQuery: null,
    insertData: null,
    updateData: null,
    deleteData: null,
    eqFilters: {},
    gteFilters: {},
    lteFilters: {},
    orFilter: null,
    inFilters: {},
    notFilters: {},
    selectColumns: null,
    singleResult: null,
    multiResult: [],
    countResult: 0,
    errorResult: null,
    rpcResult: null,
    callLog: [],
  };

  const chainCallLog = [];

  const chain = {
    _state: state,
    _chainCallLog: chainCallLog,
    select: vi.fn(function (cols) { state.selectColumns = cols; chainCallLog.push({ op: "select", args: [cols] }); return chain; }),
    insert: vi.fn(function (data) { state.insertData = data; chainCallLog.push({ op: "insert", args: [data] }); return chain; }),
    update: vi.fn(function (data) { state.updateData = data; chainCallLog.push({ op: "update", args: [data] }); return chain; }),
    delete: vi.fn(function () { chainCallLog.push({ op: "delete" }); return chain; }),
    upsert: vi.fn(function (data) { state.insertData = data; chainCallLog.push({ op: "upsert", args: [data] }); return chain; }),
    eq: vi.fn(function (col, val) { state.eqFilters[col] = val; chainCallLog.push({ op: "eq", col, val }); return chain; }),
    neq: vi.fn(function () { return chain; }),
    gte: vi.fn(function (col, val) { state.gteFilters[col] = val; chainCallLog.push({ op: "gte", col, val }); return chain; }),
    lte: vi.fn(function (col, val) { state.lteFilters[col] = val; chainCallLog.push({ op: "lte", col, val }); return chain; }),
    gt: vi.fn(function () { return chain; }),
    lt: vi.fn(function () { return chain; }),
    or: vi.fn(function (filter) { state.orFilter = filter; return chain; }),
    in: vi.fn(function (col, vals) { state.inFilters[col] = vals; return chain; }),
    not: vi.fn(function () { return chain; }),
    order: vi.fn(function () { return chain; }),
    limit: vi.fn(function () { return chain; }),
    ilike: vi.fn(function () { return chain; }),
    maybeSingle: vi.fn(function () {
      return Promise.resolve({ data: state.singleResult, error: state.errorResult });
    }),
    single: vi.fn(function () {
      if (state.errorResult) return Promise.resolve({ data: null, error: state.errorResult });
      return Promise.resolve({ data: state.singleResult, error: null });
    }),
    then: function (resolve) {
      resolve({
        data: state.multiResult,
        error: state.errorResult,
        count: state.countResult,
      });
    },
  };

  chain[Symbol.toStringTag] = "Promise";
  chain.catch = (fn) => chain;

  const cachedStorageBucket = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.storage/url" } }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://test.storage/signed" }, error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  };

  const mockClient = {
    from: vi.fn(function (table) {
      state.callLog.push({ type: "from", table });
      state.lastTable = table;
      state.eqFilters = {};
      state.gteFilters = {};
      state.lteFilters = {};
      state.inFilters = {};
      state.orFilter = null;
      state.notFilters = {};
      state.insertData = null;
      state.updateData = null;
      state.deleteData = null;
      state.selectColumns = null;
      state.errorResult = null;
      return chain;
    }),
    rpc: vi.fn(function () {
      return Promise.resolve({ data: state.rpcResult, error: state.errorResult });
    }),
    storage: {
      from: vi.fn(() => cachedStorageBucket),
    },
    _state: state,
    _chain: chain,
  };

  return mockClient;
}

export function resetMockState(mockClient) {
  const s = mockClient._state;
  s.lastTable = null;
  s.insertData = null;
  s.updateData = null;
  s.eqFilters = {};
  s.gteFilters = {};
  s.lteFilters = {};
  s.inFilters = {};
  s.singleResult = null;
  s.multiResult = [];
  s.countResult = 0;
  s.errorResult = null;
}
