# WhatsApp Templates

Este directorio contiene las definiciones de plantillas HSM (Highly Structured Message) para WhatsApp Business API.

## Plantillas Disponibles

### 1. bienvenida_nuevo_socio
**Uso**: Mensaje de bienvenida para nuevos socios
```
¡Bienvenido {name} a nuestra familia fitness! 🏋️

Tu código QR está listo. Úsalo en cada visita para un check-in rápido.

¿Dudas? Responde este mensaje.
```

### 2. checkin_confirmado
**Uso**: Confirmación de check-in exitoso
```
✅ Check-in confirmado, {name}!

📍 {class}
⏰ {time}

¡Excelente entrenamiento! 💪
```

### 3. recordatorio_clase_24h
**Uso**: Recordatorio de clase 24 horas antes
```
🔔 Hola {name}, recordatorio:

📅 Mañana a las {time}
🏃 {class}

Si no podrás asistir, cancela para liberar tu cupo.
```

### 4. recordatorio_pago_d0
**Uso**: Recordatorio de pago el día del vencimiento
```
Hola {name}! 👋

Tu cuota de ${amount} vence hoy.

Pagá en 1 clic: {link}

¿Necesitás ayuda? Responde AYUDA
```

### 5. recordatorio_pago_d3
**Uso**: Recordatorio de pago 3 días vencido
```
Hola {name},

Tu cuota de ${amount} tiene 3 días de atraso.

Podemos ayudarte con un plan de pago? Respondé SÍ para coordinar.
```

### 6. recordatorio_pago_d7
**Uso**: Recordatorio de pago 7 días vencido
```
Hola {name},

Tu cuota de ${amount} lleva 7 días de atraso.

Para mantener tu membresía activa, necesitamos regularizar.
```

### 7. cobranza_contextual
**Uso**: Cobranza contextual post-entrenamiento
```
💪 {name}, ¡excelente entreno!

Tenés pendiente tu cuota de ${amount}.

¿Querés regularizar ahora? Respondé SÍ y te ayudamos.
```

### 8. cupo_liberado
**Uso**: Notificación de cupo liberado en lista de espera
```
🎉 {name}, hay un cupo disponible!

📅 {date}
⏰ {time}

Tenés 15 minutos para confirmar. Responde SÍ para reservar.
```

### 9. encuesta_satisfaccion
**Uso**: Encuesta de satisfacción post-clase
```
Hola {name}! 👋

¿Cómo estuvo tu clase de {class}?

Tu opinión nos ayuda a mejorar:
{survey_link}

Gracias! 🙏
```

### 10. reactivacion_d10
**Uso**: Mensaje de reactivación 10 días inactivo
```
¡{name}, te extrañamos! 💙

Hace 10 días que no te vemos.

¿Todo bien? ¿Podemos ayudarte en algo?
```

### 11. reactivacion_d14
**Uso**: Mensaje de reactivación 14 días inactivo
```
Hola {name},

Notamos que hace 2 semanas no entrenas.

¿Querés pausar tu membresía? ¿O te ayudamos a retomar?
```

### 12. cambio_instructor
**Uso**: Notificación de cambio de instructor
```
Hola {name}! 👋

Tu clase de {class} a las {time} tendrá un cambio:

👨‍🏫 Instructor: {new_instructor}

Mantené tu reserva. ¡Te esperamos!
```

### 13. promo_valle
**Uso**: Promoción para horarios valle
```
🎁 {name}, oferta especial!

Entrená en horarios de mañana (10-16h) y obtené:

✨ {benefit}

Válido hasta {expiry}.
```

## Proceso de Aprobación

Antes de usar estas plantillas en producción, deben ser:

1. **Enviadas a WhatsApp** para aprobación
2. **Aprobadas por Meta** (puede tomar 24-48h)
3. **Configuradas** con el nombre exacto en el código

## Crear Nueva Plantilla

1. Diseña el mensaje siguiendo las [guías de WhatsApp](https://developers.facebook.com/docs/whatsapp/message-templates)
2. Envía para aprobación en WhatsApp Manager
3. Una vez aprobada, agrégala a `whatsapp/client/templates.js`
4. Documenta aquí con ejemplo

## Mejores Prácticas

- ✅ Usar emojis con moderación
- ✅ Mensajes claros y concisos
- ✅ Call-to-action específico
- ✅ Personalización con nombre
- ❌ Evitar spam
- ❌ No usar mayúsculas excesivas
- ❌ No incluir links no verificados
