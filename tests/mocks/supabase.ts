export const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  order: jest.fn().mockReturnThis(),
  
  // For standard chained execution returning an array or single value without .single()
  then: jest.fn().mockImplementation((callback) => {
    return Promise.resolve({ data: [], error: null }).then(callback);
  }),
  
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'mocked_url' } })
    })
  }
};

// Reset all mocks between tests
export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
  // Provide default successful responses so tests don't crash by default
  mockSupabase.single.mockResolvedValue({ data: null, error: null });
  mockSupabase.then.mockImplementation((callback) => Promise.resolve({ data: [], error: null }).then(callback));
};

