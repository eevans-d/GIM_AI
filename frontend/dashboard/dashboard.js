/**
 * PROMPT 15: EXECUTIVE DASHBOARD - CLIENT-SIDE JAVASCRIPT
 * Maneja carga de KPIs, alertas, decisiones, gráficos y drill-down
 */

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const API_BASE_URL = window.location.origin + '/api/dashboard';
const REFRESH_INTERVAL = 60000; // 1 minuto
let refreshTimer = null;

// Estado global para modales
let currentDecisionId = null;
let currentAlertId = null;

// Charts globales
let revenueTrendChart = null;
let checkinsTrendChart = null;
let occupancyChart = null;
let satisfactionChart = null;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Executive Dashboard inicializando...');
    
    // Cargar datos iniciales
    initializeDashboard();
    
    // Auto-refresh cada 1 minuto
    refreshTimer = setInterval(() => {
        refreshDashboard(true); // silent refresh
    }, REFRESH_INTERVAL);
    
    console.log('✅ Dashboard inicializado - Auto-refresh activo');
});

// ============================================================================
// CARGA DE DATOS PRINCIPAL
// ============================================================================

/**
 * Inicializar dashboard con todas las secciones
 */
async function initializeDashboard() {
    try {
        await Promise.all([
            loadAlerts(),
            loadDecisions(),
            loadKPIs(),
            loadTrendCharts()
        ]);
        
        console.log('✅ Todas las secciones cargadas exitosamente');
    } catch (error) {
        console.error('❌ Error al inicializar dashboard:', error);
        showToast('Error al cargar dashboard', 'error');
    }
}

/**
 * Refrescar todo el dashboard
 */
async function refreshDashboard(silent = false) {
    if (!silent) {
        showToast('Actualizando dashboard...', 'info');
    }
    
    await initializeDashboard();
    
    if (!silent) {
        showToast('Dashboard actualizado exitosamente', 'success');
    }
}

// ============================================================================
// ALERTAS CRÍTICAS
// ============================================================================

/**
 * Cargar alertas activas
 */
async function loadAlerts() {
    try {
        const response = await fetch(`${API_BASE_URL}/alerts/active`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al cargar alertas');
        }
        
        renderAlerts(result.data, result.count);
        
    } catch (error) {
        console.error('Error al cargar alertas:', error);
        document.getElementById('alerts-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error al cargar alertas</div>
            </div>
        `;
    }
}

/**
 * Renderizar alertas en el DOM
 */
function renderAlerts(alerts, count) {
    const container = document.getElementById('alerts-container');
    const countBadge = document.getElementById('alert-count');
    
    countBadge.textContent = count;
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">Sin alertas críticas</div>
                <div class="empty-state-subtext">Todo está funcionando correctamente</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert-item alert-${alert.severity}">
            <div class="alert-content">
                <div class="alert-type">${formatAlertType(alert.alert_type)}</div>
                <div class="alert-message">${alert.message}</div>
            </div>
            <button class="alert-dismiss" onclick="dismissAlert('${alert.id}')">
                Descartar
            </button>
        </div>
    `).join('');
}

/**
 * Descartar alerta
 */
function dismissAlert(alertId) {
    currentAlertId = alertId;
    openModal('dismissAlertModal');
}

/**
 * Enviar descarte de alerta al backend
 */
async function submitDismissAlert() {
    const dismissedBy = document.getElementById('dismissedBy').value.trim();
    const reason = document.getElementById('dismissReason').value.trim();
    
    if (!dismissedBy || !reason) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/alerts/${currentAlertId}/dismiss`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dismissed_by: dismissedBy, reason })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al descartar alerta');
        }
        
        showToast('Alerta descartada exitosamente', 'success');
        closeModal();
        loadAlerts();
        
        // Limpiar formulario
        document.getElementById('dismissedBy').value = '';
        document.getElementById('dismissReason').value = '';
        
    } catch (error) {
        console.error('Error al descartar alerta:', error);
        showToast('Error al descartar alerta', 'error');
    }
}

/**
 * Formatear tipo de alerta a texto legible
 */
function formatAlertType(type) {
    const types = {
        'revenue_drop': '📉 Caída de Ingresos',
        'high_debt': '💰 Deuda Elevada',
        'low_nps': '😞 NPS Bajo',
        'low_occupancy': '📊 Baja Ocupación',
        'high_churn': '🚪 Alta Tasa de Bajas',
        'staff_issue': '👥 Problema de Personal'
    };
    return types[type] || type;
}

// ============================================================================
// DECISIONES PRIORITARIAS (IA)
// ============================================================================

/**
 * Cargar decisiones del día
 */
async function loadDecisions() {
    try {
        const response = await fetch(`${API_BASE_URL}/decisions/today`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al cargar decisiones');
        }
        
        renderDecisions(result.data);
        
    } catch (error) {
        console.error('Error al cargar decisiones:', error);
        document.getElementById('decisions-container').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🤖</div>
                <div class="empty-state-text">Error al cargar decisiones</div>
            </div>
        `;
    }
}

/**
 * Renderizar decisiones en el DOM
 */
function renderDecisions(decisions) {
    const container = document.getElementById('decisions-container');
    
    if (decisions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-text">Sin decisiones pendientes</div>
                <div class="empty-state-subtext">Las decisiones del día ya fueron completadas</div>
            </div>
        `;
        return;
    }
    
    // Filtrar solo decisiones pendientes
    const pending = decisions.filter(d => d.status === 'pending');
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-text">Todas las decisiones completadas</div>
                <div class="empty-state-subtext">¡Excelente trabajo!</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pending.map(decision => `
        <div class="decision-item">
            <div class="decision-header">
                <div class="decision-rank">#${decision.priority_rank}</div>
                <div class="decision-title">${decision.decision_title}</div>
                <div class="decision-urgency urgency-${decision.urgency_level}">
                    ${decision.urgency_level}
                </div>
            </div>
            
            <div class="decision-description">
                ${decision.decision_description}
            </div>
            
            <div class="decision-action">
                <div class="decision-action-label">🎯 ACCIÓN RECOMENDADA</div>
                <div class="decision-action-text">${decision.recommended_action}</div>
            </div>
            
            <div class="decision-action">
                <div class="decision-action-label">💡 POR QUÉ ES IMPORTANTE</div>
                <div class="decision-action-text">${decision.decision_rationale}</div>
            </div>
            
            <div class="decision-footer">
                <div class="decision-meta">
                    👤 ${decision.action_owner} | ⏱️ ${decision.estimated_time_minutes} min | 
                    📊 Impacto: ${decision.impact_score}/100
                </div>
                <div class="decision-actions">
                    <button class="decision-btn decision-btn-complete" onclick="completeDecision('${decision.id}')">
                        ✅ Completar
                    </button>
                    <button class="decision-btn decision-btn-dismiss" onclick="dismissDecision('${decision.id}')">
                        ❌ Descartar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Completar decisión
 */
function completeDecision(decisionId) {
    currentDecisionId = decisionId;
    openModal('completeDecisionModal');
}

/**
 * Enviar completación de decisión al backend
 */
async function submitCompleteDecision() {
    const notes = document.getElementById('completionNotes').value.trim();
    
    if (!notes) {
        showToast('Ingresa notas de completación', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/decisions/${currentDecisionId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completion_notes: notes })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al completar decisión');
        }
        
        showToast('¡Decisión completada exitosamente!', 'success');
        closeModal();
        loadDecisions();
        
        // Limpiar formulario
        document.getElementById('completionNotes').value = '';
        
    } catch (error) {
        console.error('Error al completar decisión:', error);
        showToast('Error al completar decisión', 'error');
    }
}

/**
 * Descartar decisión
 */
async function dismissDecision(decisionId) {
    const reason = prompt('¿Por qué descartas esta decisión?');
    
    if (!reason) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}/dismiss`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al descartar decisión');
        }
        
        showToast('Decisión descartada', 'success');
        loadDecisions();
        
    } catch (error) {
        console.error('Error al descartar decisión:', error);
        showToast('Error al descartar decisión', 'error');
    }
}

// ============================================================================
// KPIs
// ============================================================================

/**
 * Cargar KPIs en tiempo real
 */
async function loadKPIs() {
    try {
        const response = await fetch(`${API_BASE_URL}/kpis/realtime`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al cargar KPIs');
        }
        
        renderKPIs(result.data);
        
    } catch (error) {
        console.error('Error al cargar KPIs:', error);
        document.getElementById('kpi-grid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">Error al cargar KPIs</div>
            </div>
        `;
    }
}

/**
 * Renderizar KPIs en cards
 */
function renderKPIs(kpis) {
    const grid = document.getElementById('kpi-grid');
    
    const kpiCards = [
        {
            label: 'Ingresos del Día',
            value: `$${formatNumber(kpis.revenue_total || 0)}`,
            icon: '💰',
            iconBg: '#c6f6d5',
            iconColor: '#276749',
            change: calculateChange(kpis.revenue_total, 50000), // vs objetivo
            changeLabel: 'vs objetivo $50k'
        },
        {
            label: 'Check-ins',
            value: formatNumber(kpis.total_checkins || 0),
            icon: '✅',
            iconBg: '#bee3f8',
            iconColor: '#2c5282',
            change: '+12%',
            changeLabel: 'vs ayer'
        },
        {
            label: 'Deuda Total',
            value: `$${formatNumber(kpis.total_debt || 0)}`,
            icon: '⚠️',
            iconBg: '#fed7d7',
            iconColor: '#c53030',
            change: `${(kpis.debt_percentage || 0).toFixed(1)}%`,
            changeLabel: 'de miembros'
        },
        {
            label: 'NPS Score',
            value: Math.round(kpis.nps_score || 0),
            icon: '😊',
            iconBg: '#feebc8',
            iconColor: '#dd6b20',
            change: getNPSStatus(kpis.nps_score),
            changeLabel: '7 días'
        },
        {
            label: 'Ocupación Promedio',
            value: `${(kpis.avg_class_occupancy || 0).toFixed(0)}%`,
            icon: '📊',
            iconBg: '#e9d8fd',
            iconColor: '#6b46c1',
            change: getOccupancyStatus(kpis.avg_class_occupancy),
            changeLabel: 'vs capacidad'
        },
        {
            label: 'Miembros Activos',
            value: formatNumber(kpis.active_members || 0),
            icon: '👥',
            iconBg: '#c4f1f9',
            iconColor: '#086f83',
            change: `${(kpis.retention_rate || 0).toFixed(1)}%`,
            changeLabel: 'retención'
        }
    ];
    
    grid.innerHTML = kpiCards.map(kpi => `
        <div class="kpi-card">
            <div class="kpi-header">
                <div class="kpi-label">${kpi.label}</div>
                <div class="kpi-icon" style="background: ${kpi.iconBg}; color: ${kpi.iconColor};">
                    ${kpi.icon}
                </div>
            </div>
            <div class="kpi-value">${kpi.value}</div>
            <div class="kpi-change ${getChangeClass(kpi.change)}">
                ${kpi.change} <span style="color: #718096; font-weight: 400;">${kpi.changeLabel}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Calcular cambio porcentual vs objetivo
 */
function calculateChange(current, target) {
    if (!current || !target) return '0%';
    const change = ((current - target) / target) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

/**
 * Obtener clase CSS para cambio (positivo/negativo/neutral)
 */
function getChangeClass(change) {
    if (typeof change !== 'string') return 'neutral';
    if (change.startsWith('+')) return 'positive';
    if (change.startsWith('-')) return 'negative';
    return 'neutral';
}

/**
 * Obtener status de NPS
 */
function getNPSStatus(nps) {
    if (!nps) return 'N/A';
    if (nps >= 50) return '🔥 Excelente';
    if (nps >= 30) return '👍 Bueno';
    if (nps >= 0) return '😐 Regular';
    return '😞 Crítico';
}

/**
 * Obtener status de ocupación
 */
function getOccupancyStatus(occupancy) {
    if (!occupancy) return 'N/A';
    if (occupancy >= 75) return '🔥 Óptimo';
    if (occupancy >= 60) return '👍 Bueno';
    return '⚠️ Bajo';
}

// ============================================================================
// GRÁFICOS (CHART.JS)
// ============================================================================

/**
 * Cargar gráficos de tendencias
 */
async function loadTrendCharts() {
    try {
        await Promise.all([
            loadRevenueTrend(),
            loadCheckinsTrend(),
            loadOccupancyToday(),
            loadSatisfactionMetrics()
        ]);
    } catch (error) {
        console.error('Error al cargar gráficos:', error);
    }
}

/**
 * Tendencia de ingresos (7 días)
 */
async function loadRevenueTrend() {
    try {
        const response = await fetch(`${API_BASE_URL}/trends/revenue_total?days=7`);
        const result = await response.json();
        
        if (!result.success) throw new Error('Error al cargar tendencia de ingresos');
        
        const chartData = result.data.data;
        const labels = chartData.map(d => formatDate(d.snapshot_date));
        const values = chartData.map(d => d.revenue_total || 0);
        
        const ctx = document.getElementById('revenueTrendChart').getContext('2d');
        
        if (revenueTrendChart) {
            revenueTrendChart.destroy();
        }
        
        revenueTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos ($)',
                    data: values,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `$${formatNumber(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `$${formatNumber(value)}`
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error al cargar tendencia de ingresos:', error);
    }
}

/**
 * Tendencia de check-ins (7 días)
 */
async function loadCheckinsTrend() {
    try {
        const response = await fetch(`${API_BASE_URL}/trends/total_checkins?days=7`);
        const result = await response.json();
        
        if (!result.success) throw new Error('Error al cargar tendencia de check-ins');
        
        const chartData = result.data.data;
        const labels = chartData.map(d => formatDate(d.snapshot_date));
        const values = chartData.map(d => d.total_checkins || 0);
        
        const ctx = document.getElementById('checkinsTrendChart').getContext('2d');
        
        if (checkinsTrendChart) {
            checkinsTrendChart.destroy();
        }
        
        checkinsTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Check-ins',
                    data: values,
                    backgroundColor: '#667eea',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error al cargar tendencia de check-ins:', error);
    }
}

/**
 * Ocupación de clases hoy
 */
async function loadOccupancyToday() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE_URL}/drilldown/occupancy/${today}`);
        const result = await response.json();
        
        if (!result.success) throw new Error('Error al cargar ocupación');
        
        const classes = result.data.slice(0, 10); // Primeras 10 clases
        const labels = classes.map(c => c.nombre_clase);
        const values = classes.map(c => c.occupancyPercent);
        
        const ctx = document.getElementById('occupancyChart').getContext('2d');
        
        if (occupancyChart) {
            occupancyChart.destroy();
        }
        
        occupancyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ocupación (%)',
                    data: values,
                    backgroundColor: values.map(v => 
                        v >= 75 ? '#48bb78' : v >= 60 ? '#ecc94b' : '#f56565'
                    ),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error al cargar ocupación:', error);
    }
}

/**
 * Métricas de satisfacción
 */
async function loadSatisfactionMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/kpis/satisfaction`);
        const result = await response.json();
        
        if (!result.success) throw new Error('Error al cargar satisfacción');
        
        const kpis = result.data;
        
        const ctx = document.getElementById('satisfactionChart').getContext('2d');
        
        if (satisfactionChart) {
            satisfactionChart.destroy();
        }
        
        satisfactionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Promotores', 'Pasivos', 'Detractores'],
                datasets: [{
                    data: [
                        kpis.promoters_count || 0,
                        kpis.passives_count || 0,
                        kpis.detractors_count || 0
                    ],
                    backgroundColor: ['#48bb78', '#ecc94b', '#f56565'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error al cargar satisfacción:', error);
    }
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

/**
 * Crear snapshot manualmente
 */
async function createSnapshot() {
    if (!confirm('¿Crear snapshot diario manualmente? (Normalmente se crea automáticamente a las 23:59)')) {
        return;
    }
    
    try {
        showToast('Creando snapshot...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/snapshots/create`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error('Error al crear snapshot');
        }
        
        showToast('Snapshot creado exitosamente', 'success');
        refreshDashboard();
        
    } catch (error) {
        console.error('Error al crear snapshot:', error);
        showToast('Error al crear snapshot', 'error');
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Formatear número con separadores de miles
 */
function formatNumber(num) {
    return new Intl.NumberFormat('es-MX').format(Math.round(num));
}

/**
 * Formatear fecha a formato corto
 */
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('es-MX', { month: 'short' });
    return `${day} ${month}`;
}

// ============================================================================
// MODALES
// ============================================================================

/**
 * Abrir modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Cerrar modal
 */
function closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.classList.remove('active'));
}

/**
 * Cerrar modal al hacer clic fuera
 */
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

/**
 * Mostrar toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toast.className = `toast toast-${type} active`;
    toastMessage.textContent = message;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Limpiar al cerrar página
 */
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    // Destruir charts
    if (revenueTrendChart) revenueTrendChart.destroy();
    if (checkinsTrendChart) checkinsTrendChart.destroy();
    if (occupancyChart) occupancyChart.destroy();
    if (satisfactionChart) satisfactionChart.destroy();
});

console.log('✅ Dashboard JavaScript cargado exitosamente');
