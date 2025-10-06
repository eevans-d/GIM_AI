/**
 * Supabase Client Mock
 * Used for unit testing
 */

const mockData = {
  members: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      nombre: 'Juan Pérez',
      telefono: '+5491122334455',
      codigo_qr: 'GYM-ABCD-1234',
      estado: 'activo'
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      nombre: 'Ana García',
      telefono: '+5491122334466',
      codigo_qr: null,
      estado: 'activo'
    },
    {
      id: '323e4567-e89b-12d3-a456-426614174002',
      nombre: 'Carlos López',
      telefono: '+5491122334477',
      codigo_qr: 'GYM-EFGH-5678',
      estado: 'inactivo'
    }
  ],
  classes: [
    {
      id: '423e4567-e89b-12d3-a456-426614174003',
      nombre: 'Yoga Matutino',
      fecha_hora: '2025-10-10T08:00:00Z',
      instructor_id: '623e4567-e89b-12d3-a456-426614174005',
      capacidad_maxima: 20
    },
    {
      id: '523e4567-e89b-12d3-a456-426614174004',
      nombre: 'Spinning',
      fecha_hora: '2025-10-10T17:00:00Z',
      instructor_id: '723e4567-e89b-12d3-a456-426614174006',
      capacidad_maxima: 15
    }
  ]
};

// Mock implementations for Supabase
const mockFrom = (table) => {
  if (!mockData[table]) {
    throw new Error(`Table ${table} not found in mock data`);
  }

  let query = [...mockData[table]];
  let conditions = {};
  let singleResult = false;

  return {
    select: (columns) => {
      // This is a simplified mock, we're not actually filtering columns
      return {
        eq: (column, value) => {
          conditions[column] = value;
          return {
            single: () => {
              singleResult = true;
              return {
                eq: (column2, value2) => {
                  conditions[column2] = value2;
                  return {
                    single: () => {
                      singleResult = true;
                      return handleResult();
                    },
                    is: (column3, value3) => {
                      conditions[column3] = value3;
                      return handleResult();
                    }
                  };
                },
                is: (column2, value2) => {
                  conditions[column2] = value2;
                  return handleResult();
                }
              };
            },
            is: (column2, value2) => {
              conditions[column2] = value2;
              return handleResult();
            }
          };
        },
        is: (column, value) => {
          conditions[column] = value;
          return handleResult();
        },
        single: () => {
          singleResult = true;
          return handleResult();
        }
      };
    },
    update: (updateData) => {
      return {
        eq: (column, value) => {
          // Find and update the item
          let updated = false;
          query.forEach((item, index) => {
            if (item[column] && item[column].toString() === value.toString()) {
              query[index] = { ...item, ...updateData };
              updated = true;
            }
          });

          return {
            data: updated ? [query.find(item => item[column] && item[column].toString() === value.toString())] : [],
            error: updated ? null : new Error('Item not found')
          };
        }
      };
    },
    insert: (insertData) => {
      // For array or single object
      const dataToInsert = Array.isArray(insertData) ? insertData : [insertData];
      query = [...query, ...dataToInsert];

      return {
        data: dataToInsert,
        error: null
      };
    },
    delete: () => {
      return {
        eq: (column, value) => {
          const itemsToDelete = query.filter(item => item[column] && item[column].toString() === value.toString());
          query = query.filter(item => !(item[column] && item[column].toString() === value.toString()));

          return {
            data: itemsToDelete,
            error: itemsToDelete.length ? null : new Error('Item not found')
          };
        }
      };
    }
  };

  function handleResult() {
    // Apply all conditions
    Object.keys(conditions).forEach(column => {
      const value = conditions[column];
      
      if (value === null) {
        query = query.filter(item => item[column] === null);
      } else {
        query = query.filter(item => item[column] && item[column].toString() === value.toString());
      }
    });

    if (singleResult) {
      return {
        data: query.length ? query[0] : null,
        error: query.length ? null : new Error('Item not found')
      };
    }

    return {
      data: query,
      error: null
    };
  }
};

// Mock the createClient function
const createClient = jest.fn().mockImplementation(() => ({
  from: mockFrom,
  storage: {
    from: () => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' } }),
      getPublicUrl: jest.fn().mockReturnValue({ publicURL: 'https://example.com/test-path' })
    })
  },
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    session: jest.fn().mockReturnValue(null)
  }
}));

module.exports = {
  createClient,
};