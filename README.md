# GIM_AI 🏋️‍♂️🤖

**Sistema Agéntico Inteligente para Gestión de Gimnasios**

GIM_AI es un sistema completo de gestión para gimnasios que automatiza operaciones mediante IA, WhatsApp Business API y check-in por QR. Diseñado para maximizar eficiencia operativa, reducir morosidad y mejorar la experiencia del cliente.

## 🎯 Características Principales

- **WhatsApp-First**: Comunicación natural con clientes donde ya están
- **Check-in QR**: Registro simple que dispara flujos personalizados
- **Cobranza Contextual**: Mensajes inteligentes post-entrenamiento
- **Dashboard en Tiempo Real**: Visibilidad total de operaciones
- **Gestión Automática**: Reservas, lista de espera y reemplazos
- **Analytics Predictivo**: Optimización de ocupación y promociones

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| **Orquestación** | n8n Desktop (OSS) |
| **Base de Datos** | Google Sheets → Supabase PostgreSQL |
| **Mensajería** | WhatsApp Business Cloud API |
| **Dashboards** | Google Looker Studio |
| **Frontend** | Netlify + AppSheet |
| **IA** | Google Gemini API (free tier) |
| **Backend** | Node.js + Express |
| **Queue** | Bull + Redis |

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Cuenta de Supabase (free tier)
- WhatsApp Business API access
- Redis (opcional, para queues)

## 🚀 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/eevans-d/GIM_AI.git
cd GIM_AI

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar migraciones de base de datos
npm run migrate

# 5. Iniciar el servidor
npm start
```

## 📁 Estructura del Proyecto

```
gim-ai/
├── database/           # Schemas, migraciones y seeds
├── n8n-workflows/      # Flujos de automatización
├── whatsapp/          # Cliente WhatsApp Business API
├── frontend/          # Interfaces web (QR, profesor, admin)
├── scripts/           # Utilidades y mantenimiento
├── docs/              # Documentación completa
├── config/            # Archivos de configuración
└── tests/             # Suite de testing
```

## 🎨 Componentes Principales

### 1. Sistema de Check-in QR
- Código QR personalizado por socio
- Landing page mínima para nuevos usuarios
- Integración automática con WhatsApp
- Registro en tiempo real

### 2. Cliente WhatsApp Business
- Envío de plantillas HSM
- Gestión de conversaciones
- Rate limiting inteligente
- Respeto a ventanas horarias (9-21h)

### 3. Cobranza Contextual
- Mensajes post-entrenamiento
- Secuencia D0/D3/D7/D14
- Tracking de efectividad
- Escalamiento a humano

### 4. Panel Profesor
- Vista "Mi Clase Ahora"
- Check-in rápido de alumnos
- Gestión de incidencias
- Estadísticas personales

### 5. Dashboard Ejecutivo
- Métricas en tiempo real
- Top 3 acciones sugeridas
- Alertas automáticas
- Comparativas históricas

## 📊 KPIs Principales

- **Morosidad**: Objetivo <10%
- **Ocupación**: Optimizar franjas valle
- **Satisfacción**: NPS por instructor
- **Eficiencia**: Tiempo administrativo -40%
- **Cobertura**: 98%+ clases con instructor

## 🔧 Scripts Disponibles

```bash
npm start              # Iniciar servidor
npm run dev           # Modo desarrollo con hot reload
npm test              # Ejecutar todos los tests
npm run migrate       # Migrar datos de Sheets a Supabase
npm run backup        # Backup de base de datos
npm run health-check  # Verificar estado del sistema
npm run lint          # Verificar código
```

## 📖 Documentación

- [Guía de Setup](docs/setup/README.md)
- [Manual de Usuario](docs/user-guides/README.md)
- [Documentación Técnica](docs/technical/README.md)
- [API Reference](docs/technical/api-reference.md)

## 🔐 Seguridad

- Autenticación JWT para APIs
- RLS (Row Level Security) en Supabase
- Rate limiting en endpoints críticos
- Validación de webhooks WhatsApp
- Encriptación de datos sensibles

## 🤝 Contribución

Este proyecto está en desarrollo activo. Para contribuir:

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

- 📧 Email: support@gim-ai.com
- 💬 Discord: [GIM_AI Community](https://discord.gg/gim-ai)
- 📚 Wiki: [github.com/eevans-d/GIM_AI/wiki](https://github.com/eevans-d/GIM_AI/wiki)

## 🙏 Agradecimientos

- n8n Community por la plataforma de automatización
- Supabase por el backend as a service
- WhatsApp Business API por la integración de mensajería
- Google por las APIs de Forms y Sheets

---

**Desarrollado con ❤️ para gimnasios que quieren crecer inteligentemente**
