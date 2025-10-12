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
  system_logs: [], // Añadido para evitar errores al registrar logs
  ai_decisions: [
    {
      id: '555e4567-e89b-12d3-a456-426614174005',
      snapshot_id: '123e4567-e89b-12d3-a456-426614174000',
      priority: 1,
      title: 'Implementar campaña de retención inmediata',
      description: 'Con 15% de deuda y solo 85% ocupación promedio',
      category: 'FINANCIAL',
      urgency: 'HIGH',
      impact: 'HIGH',
      actions: ['Contactar miembros morosos', 'Ofrecer planes de pago'],
      created_at: '2025-01-28T10:00:00Z'
    },
    {
      id: '666e4567-e89b-12d3-a456-426614174006',
      snapshot_id: '123e4567-e89b-12d3-a456-426614174000',
      priority: 2,
      title: 'Optimizar horarios de clases populares',
      description: 'Maximizar ocupación con demanda actual',
      category: 'OPERATIONAL',
      urgency: 'MEDIUM',
      impact: 'HIGH',
      actions: ['Analizar horarios pico', 'Añadir clase extra'],
      created_at: '2025-01-28T10:00:00Z'
    }
  ]
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
              
              // Para resultados múltiples
              data: mockData[table].filter(item => 
                item[column] && item[column].toString() === value.toString()
              ),
              error: null,
              
              // Para ordenar después de filtrar
              order: (orderColumn, options = {}) => {
                console.log(`[MOCK] Ordering by ${orderColumn} after eq filter`, options);
                
                const filtered = mockData[table].filter(item => 
                  item[column] && item[column].toString() === value.toString()
                );
                
                const sorted = filtered.sort((a, b) => {
                  const aVal = a[orderColumn] || 0;
                  const bVal = b[orderColumn] || 0;
                  return options.ascending ? aVal - bVal : bVal - aVal;
                });
                
                return {
                  data: sorted,
                  error: null
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
          },
          
          // Para ordenar resultados
          order: (orderColumn, options = {}) => {
            console.log(`[MOCK] Ordering by ${orderColumn}`, options);
            
            const sorted = [...mockData[table]].sort((a, b) => {
              const aVal = a[orderColumn] || 0;
              const bVal = b[orderColumn] || 0;
              return options.ascending ? aVal - bVal : bVal - aVal;
            });
            
            return {
              data: sorted,
              error: null
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
              select: () => ({
                single: () => ({
                  data: updated ? updatedData : { id: value, ...updateData },
                  error: null // Always return success for tests
                })
              }),
              data: updated ? [updatedData] : [{ id: value, ...updateData }],
              error: null // Always return success for tests
            };
          }
        };
      },
      
      // Insert query
      insert: (insertData) => {
        const dataToInsert = Array.isArray(insertData) ? insertData : [insertData];
        console.log(`[MOCK] Inserting ${dataToInsert.length} records`);
        
        // Añadir IDs si no los tienen
        const dataWithIds = dataToInsert.map(item => ({
          id: item.id || `mock-id-${Date.now()}-${Math.random()}`,
          ...item
        }));
        
        // Añadir a los datos existentes
        mockData[table] = [...mockData[table], ...dataWithIds];
        
        return {
          select: () => ({
            single: () => ({
              data: dataWithIds[0] || null,
              error: null
            })
          }),
          data: dataWithIds,
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
    // Mock para remote procedure calls (RPC)
    rpc: (functionName, parameters) => {
      console.log(`[MOCK] Calling RPC function: ${functionName}`, parameters);
      
      // Simular diferentes funciones RPC
      switch (functionName) {
        case 'get_member_dashboard':
          return Promise.resolve({
            data: {
              member_id: parameters?.p_member_id,
              total_checkins: 15,
              monthly_checkins: 8,
              favorite_class: 'Yoga',
              last_checkin: '2025-10-08T10:00:00Z'
            },
            error: null
          });
          
        case 'get_classes_availability':
          return Promise.resolve({
            data: [
              {
                class_id: '423e4567-e89b-12d3-a456-426614174003',
                class_name: 'Yoga Matutino',
                available_spots: 5,
                total_capacity: 20
              }
            ],
            error: null
          });
          
        case 'get_daily_kpis':
          return Promise.resolve({
            data: {
              date: parameters?.p_date,
              total_checkins: 25,
              unique_members: 20,
              revenue: 1500
            },
            error: null
          });
          
        case 'get_webhook_stats':
          return Promise.resolve({
            data: [{
              webhook_id: parameters?.p_webhook_id,
              total_deliveries: 100,
              successful_deliveries: 95,
              failed_deliveries: 5,
              pending_deliveries: 0,
              avg_response_time: 250,
              success_rate: 0.95
            }],
            error: null
          });
          
        case 'get_class_recommendations':
          return Promise.resolve({
            data: [
              {
                class_id: '423e4567-e89b-12d3-a456-426614174003',
                class_name: 'Yoga Matutino',
                recommendation_score: 0.85
              },
              {
                class_id: '523e4567-e89b-12d3-a456-426614174004',
                class_name: 'Spinning',
                recommendation_score: 0.75
              }
            ],
            error: null
          });
          
        case 'get_member_current_tier':
          return Promise.resolve({
            data: {
              tier: 'premium',
              benefits: ['unlimited_classes', 'guest_passes']
            },
            error: null
          });
          
        case 'get_webhook_stats':
          return Promise.resolve({
            data: [{
              webhook_id: parameters?.p_webhook_id,
              total_deliveries: 100,
              successful_deliveries: 95,
              failed_deliveries: 5,
              pending_deliveries: 0,
              avg_response_time: 250,
              success_rate: 0.95
            }],
            error: null
          });
          
        default:
          return Promise.resolve({
            data: null,
            error: new Error(`Unknown RPC function: ${functionName}`)
          });
      }
    },
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