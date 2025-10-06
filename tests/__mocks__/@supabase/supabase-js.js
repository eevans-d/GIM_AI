/**
 * Supabase Client Mock
 * Used for unit testing
 */

// Datos mock para testing
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
  ],
  system_logs: [] // Añadido para evitar errores al registrar logs
};

// Mock para Supabase Client
const createClient = jest.fn().mockImplementation(() => {
  // Mock de la función 'from' para acceder a tablas
  const from = (table) => {
    console.log(`[MOCK] Accessing table: ${table}`);
    
    // Si la tabla no existe, creamos un array vacío
    if (!mockData[table]) {
      console.log(`[MOCK] Table ${table} does not exist, creating empty array`);
      mockData[table] = [];
    }
    
    return {
      // Select query
      select: (columns) => {
        console.log(`[MOCK] Selecting columns: ${columns}`);
        
        return {
          // Filtro eq (equals)
          eq: (column, value) => {
            console.log(`[MOCK] Filtering where ${column} = ${value}`);
            
            return {
              // Para un único resultado
              single: () => {
                const result = mockData[table].find(item => 
                  item[column] && item[column].toString() === value.toString()
                );
                
                console.log(`[MOCK] Single result:`, result ? 'found' : 'not found');
                
                return {
                  data: result || null,
                  error: result ? null : new Error(`Item not found in ${table}`)
                };
              },
              
              // Para agregar otro filtro eq
              eq: (column2, value2) => {
                console.log(`[MOCK] Adding filter: ${column2} = ${value2}`);
                
                return {
                  single: () => {
                    const result = mockData[table].find(item => 
                      item[column] && item[column].toString() === value.toString() &&
                      item[column2] && item[column2].toString() === value2.toString()
                    );
                    
                    return {
                      data: result || null,
                      error: result ? null : new Error(`Item not found in ${table}`)
                    };
                  }
                };
              },
              
              // Para otro tipo de filtro (is)
              is: (column2, value2) => {
                console.log(`[MOCK] Adding filter: ${column2} is ${value2}`);
                
                // Filtrar por columna y valor, añadiendo el filtro 'is'
                const filtered = mockData[table].filter(item => {
                  const matchesEq = item[column] && item[column].toString() === value.toString();
                  const matchesIs = value2 === null ? item[column2] === null : 
                    (item[column2] && item[column2].toString() === value2.toString());
                  return matchesEq && matchesIs;
                });
                
                return {
                  data: filtered,
                  error: null
                };
              }
            };
          },
          
          // Filtro is (para null)
          is: (column, value) => {
            console.log(`[MOCK] Filtering where ${column} is ${value}`);
            
            return {
              // Para agregar otro filtro eq
              eq: (column2, value2) => {
                console.log(`[MOCK] Adding filter: ${column2} = ${value2}`);
                
                // Filtrar por columna y valor
                const filtered = mockData[table].filter(item => {
                  const matchesIs = value === null ? item[column] === null : 
                    (item[column] && item[column].toString() === value.toString());
                  const matchesEq = item[column2] && item[column2].toString() === value2.toString();
                  return matchesIs && matchesEq;
                });
                
                return {
                  data: filtered,
                  error: null
                };
              }
            };
          },
          
          // Para obtener un único resultado
          single: () => {
            const result = mockData[table].length > 0 ? mockData[table][0] : null;
            return {
              data: result,
              error: result ? null : new Error(`No records in ${table}`)
            };
          }
        };
      },
      
      // Update query
      update: (updateData) => {
        console.log(`[MOCK] Updating with data:`, updateData);
        
        return {
          eq: (column, value) => {
            console.log(`[MOCK] Updating where ${column} = ${value}`);
            
            let updated = false;
            let updatedData = null;
            
            // Buscar y actualizar el elemento
            mockData[table] = mockData[table].map(item => {
              if (item[column] && item[column].toString() === value.toString()) {
                updated = true;
                updatedData = { ...item, ...updateData };
                return updatedData;
              }
              return item;
            });
            
            return {
              data: updated ? [updatedData] : [],
              error: updated ? null : new Error(`Item not found for update in ${table}`)
            };
          }
        };
      },
      
      // Insert query
      insert: (insertData) => {
        const dataToInsert = Array.isArray(insertData) ? insertData : [insertData];
        console.log(`[MOCK] Inserting ${dataToInsert.length} records`);
        
        // Añadir a los datos existentes
        mockData[table] = [...mockData[table], ...dataToInsert];
        
        return {
          data: dataToInsert,
          error: null
        };
      },
      
      // Delete query
      delete: () => {
        return {
          eq: (column, value) => {
            console.log(`[MOCK] Deleting where ${column} = ${value}`);
            
            const itemsToDelete = mockData[table].filter(item => 
              item[column] && item[column].toString() === value.toString()
            );
            
            mockData[table] = mockData[table].filter(item => 
              !(item[column] && item[column].toString() === value.toString())
            );
            
            return {
              data: itemsToDelete,
              error: itemsToDelete.length ? null : new Error(`Item not found for delete in ${table}`)
            };
          }
        };
      }
    };
  };
  
  // Retornar el cliente mockeado
  return {
    from,
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
  };
});

module.exports = {
  createClient
};