# 📋 WhatsApp Message Templates - Especificaciones Completas

**Propósito**: Crear los 18 templates en Meta Business Manager  
**Tiempo estimado**: 45-60 minutos  
**Aprobación**: 24-48 horas

---

## 📌 Instrucciones Generales

1. Ir a: https://business.facebook.com/wa/manage/message-templates/
2. Click "Create Template" para cada uno
3. Copiar exactamente el contenido de abajo
4. Categoría: Elegir según indicado
5. Idioma: **Spanish (es)**

---

## 1️⃣ Check-in & Confirmación

### Template: `class_started_confirmation`

**Categoría**: UTILITY  
**Nombre**: class_started_confirmation  
**Idioma**: Spanish (es)

**Header**: Ninguno

**Body**:
```
¡Hola {{1}}! ✅

Tu entrada a la clase de *{{2}}* ha sido confirmada.

🕐 Hora: {{3}}
👨‍🏫 Instructor: {{4}}
📍 Ubicación: {{5}}

¡Disfruta tu entrenamiento! 💪
```

**Footer**: GIM_AI - Tu gimnasio inteligente

**Buttons**: Ninguno

**Variables**:
1. Nombre del miembro
2. Nombre de la clase
3. Hora de inicio
4. Nombre del instructor
5. Ubicación/sala

---

## 2️⃣ Recordatorios

### Template: `checklist_reminder`

**Categoría**: UTILITY  
**Nombre**: checklist_reminder  
**Idioma**: Spanish (es)

**Body**:
```
👋 Hola {{1}}!

Recordatorio: Tienes clase de *{{2}}* programada para hoy.

🕐 Hora: {{3}}
👨‍🏫 Instructor: {{4}}

¿Nos vemos? 😊
```

**Footer**: GIM_AI

**Buttons**:
- Button 1 (QUICK_REPLY): "✅ Confirmar"
- Button 2 (QUICK_REPLY): "❌ Cancelar"

---

### Template: `coaching_session_reminder`

**Categoría**: UTILITY  
**Nombre**: coaching_session_reminder  
**Idioma**: Spanish (es)

**Body**:
```
🎯 Recordatorio de Coaching

Hola {{1}}, tu sesión de coaching personalizado está programada:

📅 Fecha: {{2}}
🕐 Hora: {{3}}
💼 Coach: {{4}}
📍 Sala: {{5}}

Prepara tus preguntas y objetivos. ¡Nos vemos pronto!
```

**Footer**: GIM_AI Coaching

---

## 3️⃣ Cobro Contextual (PROMPT 7)

### Template: `debt_post_workout`

**Categoría**: UTILITY  
**Nombre**: debt_post_workout  
**Idioma**: Spanish (es)

**Body**:
```
¡Excelente clase, {{1}}! 💪

Veo que terminaste un gran entrenamiento de {{2}}.

💳 Tienes un saldo pendiente de ${{3}}.

¿Te gustaría saldar tu deuda ahora que estás con la energía al 100%? Puedes pagar fácilmente con el enlace de abajo.
```

**Footer**: GIM_AI Pagos

**Buttons**:
- Button 1 (URL): "💳 Pagar Ahora" → {{4}} (URL de pago)
- Button 2 (QUICK_REPLY): "⏰ Recordar mañana"

**Variables**:
1. Nombre del miembro
2. Nombre de la clase
3. Monto de deuda
4. URL de pago de MercadoPago

---

### Template: `tier_retention_offer`

**Categoría**: MARKETING  
**Nombre**: tier_retention_offer  
**Idioma**: Spanish (es)

**Body**:
```
{{1}}, ¡te extrañamos! 😢

Tu membresía *{{2}}* está por vencer.

🎁 Oferta especial de renovación:
• {{3}}% de descuento
• Válida hasta {{4}}

¡No pierdas tu ritmo! Renueva ahora.
```

**Footer**: GIM_AI

**Buttons**:
- Button 1 (URL): "✨ Renovar con descuento" → {{5}}

---

## 4️⃣ Encuestas (PROMPT 8)

### Template: `post_class_survey`

**Categoría**: UTILITY  
**Nombre**: post_class_survey  
**Idioma**: Spanish (es)

**Body**:
```
¡Gracias por entrenar con nosotros, {{1}}! 🙏

¿Cómo fue tu clase de *{{2}}* con {{3}}?

Del 1 al 10, ¿qué tan probable es que recomiendes esta clase a un amigo?

Tu opinión nos ayuda a mejorar. 📊
```

**Footer**: GIM_AI Encuestas

**Buttons**:
- Button 1 (QUICK_REPLY): "⭐ Excelente (9-10)"
- Button 2 (QUICK_REPLY): "👍 Buena (7-8)"
- Button 3 (QUICK_REPLY): "😐 Regular (1-6)"

---

### Template: `survey_low_rating_followup`

**Categoría**: UTILITY  
**Nombre**: survey_low_rating_followup  
**Idioma**: Spanish (es)

**Body**:
```
Hola {{1}},

Lamentamos que tu experiencia en la clase de {{2}} no haya sido óptima. 😔

Nos importa mucho tu satisfacción. ¿Podrías contarnos qué podemos mejorar?

Nuestro equipo está aquí para escucharte.
```

**Footer**: GIM_AI

**Buttons**:
- Button 1 (QUICK_REPLY): "💬 Quiero hablar con gerencia"
- Button 2 (QUICK_REPLY): "📝 Enviar comentarios"

---

## 5️⃣ Reemplazo de Instructores (PROMPT 9)

### Template: `replacement_offer`

**Categoría**: UTILITY  
**Nombre**: replacement_offer  
**Idioma**: Spanish (es)

**Body**:
```
Hola {{1}}! 🏋️

{{2}} no podrá dictar la clase de *{{3}}* el {{4}} a las {{5}}.

¿Podrías reemplazarlo/a? Tu experiencia encaja perfecto con esta clase.

📋 Detalles:
• Alumnos: {{6}}
• Nivel: {{7}}
```

**Footer**: GIM_AI Staff

**Buttons**:
- Button 1 (QUICK_REPLY): "✅ Acepto"
- Button 2 (QUICK_REPLY): "❌ No puedo"

---

### Template: `replacement_accepted_confirmation`

**Categoría**: UTILITY  
**Nombre**: replacement_accepted_confirmation  
**Idioma**: Spanish (es)

**Body**:
```
¡Excelente, {{1}}! 🎉

Has aceptado la clase de reemplazo:

📅 Fecha: {{2}}
🕐 Hora: {{3}}
📝 Clase: {{4}}
👥 Alumnos: {{5}}

Gracias por tu compromiso. ¡Nos vemos allí!
```

**Footer**: GIM_AI

---

### Template: `replacement_original_instructor_notification`

**Categoría**: UTILITY  
**Nombre**: replacement_original_instructor_notification  
**Idioma**: Spanish (es)

**Body**:
```
Hola {{1}},

Tu clase de *{{2}}* del {{3}} a las {{4}} ha sido cubierta por {{5}}.

✅ Todo está en orden. Recuperate pronto!
```

**Footer**: GIM_AI

---

### Template: `replacement_student_notification`

**Categoría**: UTILITY  
**Nombre**: replacement_student_notification  
**Idioma**: Spanish (es)

**Body**:
```
Hola {{1}}! 👋

Cambio de instructor para tu clase de *{{2}}*:

🔄 Instructor original: {{3}}
✨ Instructor de reemplazo: {{4}}

📅 {{5}} a las {{6}}

La clase se mantiene. ¡Nos vemos!
```

**Footer**: GIM_AI

---

## 6️⃣ Alertas para Instructores (PROMPT 10)

### Template: `late_start_alert`

**Categoría**: UTILITY  
**Nombre**: late_start_alert  
**Idioma**: Spanish (es)

**Body**:
```
⚠️ Alerta de Inicio Tardío

{{1}}, tu clase de *{{2}}* debía iniciar a las {{3}}.

🕐 Hora actual: {{4}}
⏱️ Retraso: {{5}} minutos

Por favor, inicia la clase lo antes posible.
```

**Footer**: GIM_AI Sistema

---

### Template: `low_attendance_alert`

**Categoría**: UTILITY  
**Nombre**: low_attendance_alert  
**Idioma**: Spanish (es)

**Body**:
```
📊 Alerta de Asistencia

{{1}}, tu clase de *{{2}}* tiene baja asistencia:

👥 Registrados: {{3}}
✅ Presentes: {{4}}
📉 Asistencia: {{5}}%

Considera estrategias de engagement para la próxima clase.
```

**Footer**: GIM_AI Analytics

---

### Template: `absence_confirmation`

**Categoría**: UTILITY  
**Nombre**: absence_confirmation  
**Idioma**: Spanish (es)

**Body**:
```
Hola {{1}},

Recibimos tu confirmación de ausencia para la clase:

📝 Clase: {{2}}
📅 Fecha: {{3}}
🕐 Hora: {{4}}

✅ Estamos buscando un reemplazo.

Gracias por avisar con tiempo.
```

**Footer**: GIM_AI

---

## 7️⃣ Nutrición Personalizada (PROMPT 11)

### Template: `nutrition_post_strength`

**Categoría**: UTILITY  
**Nombre**: nutrition_post_strength  
**Idioma**: Spanish (es)

**Body**:
```
💪 Post-Entrenamiento de Fuerza

¡Gran trabajo, {{1}}!

Después de tu sesión de {{2}}, tu cuerpo necesita:

🥩 Proteínas: {{3}}g
🍚 Carbohidratos: {{4}}g
💧 Agua: {{5}}L

Recomendación: {{6}}

Consume en las próximas 2 horas para máxima recuperación.
```

**Footer**: GIM_AI Nutrición

---

### Template: `nutrition_post_cardio`

**Categoría**: UTILITY  
**Nombre**: nutrition_post_cardio  
**Idioma**: Spanish (es)

**Body**:
```
🏃 Post-Cardio Nutrition

¡Excelente sesión, {{1}}!

Después de {{2}} minutos de cardio intenso:

🍌 Carbohidratos de rápida absorción
💧 Hidratación inmediata: {{3}}L
⚡ Electrolitos recomendados

Sugerencia: {{4}}
```

**Footer**: GIM_AI Nutrición

---

### Template: `nutrition_post_flexibility`

**Categoría**: UTILITY  
**Nombre**: nutrition_post_flexibility  
**Idioma**: Spanish (es)

**Body**:
```
🧘 Post-Flexibilidad y Recuperación

Namaste, {{1}}! 🙏

Después de tu sesión de {{2}}:

💚 Hidratación suave
🥗 Alimentos antiinflamatorios
🍵 Infusiones recomendadas

Tip: {{3}}

Tu cuerpo agradece el cuidado.
```

**Footer**: GIM_AI Wellness

---

## 8️⃣ Reactivación (PROMPT 12)

### Template: `reactivation_miss_you`

**Categoría**: MARKETING  
**Nombre**: reactivation_miss_you  
**Idioma**: Spanish (es)

**Body**:
```
¡Te extrañamos, {{1}}! 😢

Han pasado {{2}} días desde tu última visita.

Tu lugar en *{{3}}* sigue esperándote.

¿Qué te parece volver? Tenemos clases nuevas que te encantarán.
```

**Footer**: GIM_AI

**Buttons**:
- Button 1 (URL): "📅 Ver horarios" → {{4}}
- Button 2 (QUICK_REPLY): "💬 Hablar con asesor"

---

### Template: `reactivation_social_proof`

**Categoría**: MARKETING  
**Nombre**: reactivation_social_proof  
**Idioma**: Spanish (es)

**Body**:
```
Hola {{1}}! 👋

¿Sabías que {{2}} miembros entrenaron esta semana?

🏆 Logros destacados:
• {{3}}
• {{4}}

¡No te quedes afuera! Vuelve y alcanza tus metas con nosotros.
```

**Footer**: GIM_AI Community

---

### Template: `reactivation_special_offer`

**Categoría**: MARKETING  
**Nombre**: reactivation_special_offer  
**Idioma**: Spanish (es)

**Body**:
```
🎁 Oferta Especial para Ti, {{1}}!

Como miembro valorado, tenemos una propuesta exclusiva:

✨ {{2}}% de descuento en tu reactivación
⏰ Válido hasta {{3}}

Código: {{4}}

¡No dejes pasar esta oportunidad!
```

**Footer**: GIM_AI

**Buttons**:
- Button 1 (URL): "🎟️ Reactivar ahora" → {{5}}

---

## 9️⃣ Membresías Escalonadas (PROMPT 13)

### Template: `tier_upgrade_offer_plus`

**Categoría**: MARKETING  
**Nombre**: tier_upgrade_offer_plus  
**Idioma**: Spanish (es)

**Body**:
```
¡Hola {{1}}! ⬆️

Notamos que estás aprovechando al máximo tu membresía *Basic*.

¿Qué te parece hacer el upgrade a *Plus*?

✨ Beneficios:
• Clases ilimitadas
• 2 clases de coaching/mes
• Acceso a horarios premium
• {{2}}% de descuento en productos

Inversión: ${{3}}/mes
```

**Footer**: GIM_AI

**Buttons**:
- Button 1 (URL): "⬆️ Upgrade a Plus" → {{4}}

---

### Template: `tier_upgrade_offer_pro`

**Categoría**: MARKETING  
**Nombre**: tier_upgrade_offer_pro  
**Idioma**: Spanish (es)

**Body**:
```
💎 Invitación Exclusiva - Membresía PRO

{{1}}, por tu compromiso con tu salud, te invitamos a nuestra membresía *Pro*:

🏆 Beneficios Premium:
• Todas las clases + coaching ilimitado
• Nutricionista personal
• Acceso 24/7
• Invitados gratis ({{2}}/mes)
• Descuentos en retail

Inversión: ${{3}}/mes

Cupos limitados.
```

**Footer**: GIM_AI Elite

**Buttons**:
- Button 1 (URL): "💎 Solicitar PRO" → {{4}}

---

## 🔟 Optimización Valle-Pico (PROMPT 14)

### Template: `valley_promotion_offer`

**Categoría**: MARKETING  
**Nombre**: valley_promotion_offer  
**Idioma**: Spanish (es)

**Body**:
```
⏰ Entrena en Horario Valle y Ahorra

Hola {{1}}! 💚

Tenemos disponibilidad en horarios menos concurridos:

📅 {{2}} de {{3}} a {{4}}

🎁 Beneficios:
• Equipos disponibles
• Atención personalizada
• {{5}}% de descuento en productos
• Puntos dobles

¿Reservamos?
```

**Footer**: GIM_AI Smart

**Buttons**:
- Button 1 (QUICK_REPLY): "✅ Reservar"
- Button 2 (QUICK_REPLY): "📅 Ver otros horarios"

---

## ✅ Checklist de Creación

Para cada template:

- [ ] Nombre correcto (sin espacios, lowercase con guiones bajos)
- [ ] Categoría correcta (UTILITY o MARKETING)
- [ ] Idioma: Spanish (es)
- [ ] Todas las variables {{X}} numeradas correctamente
- [ ] Botones configurados (si aplica)
- [ ] Footer incluido
- [ ] Preview verificado
- [ ] Submit para aprobación

---

## 📊 Resumen de Templates

| # | Nombre | Categoría | Botones | Prioridad |
|---|--------|-----------|---------|-----------|
| 1 | class_started_confirmation | UTILITY | 0 | 🔴 ALTA |
| 2 | checklist_reminder | UTILITY | 2 | 🔴 ALTA |
| 3 | coaching_session_reminder | UTILITY | 0 | 🟡 MEDIA |
| 4 | debt_post_workout | UTILITY | 2 | 🔴 ALTA |
| 5 | tier_retention_offer | MARKETING | 1 | 🟡 MEDIA |
| 6 | post_class_survey | UTILITY | 3 | 🔴 ALTA |
| 7 | survey_low_rating_followup | UTILITY | 2 | 🟡 MEDIA |
| 8 | replacement_offer | UTILITY | 2 | 🔴 ALTA |
| 9 | replacement_accepted_confirmation | UTILITY | 0 | 🟡 MEDIA |
| 10 | replacement_original_instructor_notification | UTILITY | 0 | 🟡 MEDIA |
| 11 | replacement_student_notification | UTILITY | 0 | 🟡 MEDIA |
| 12 | late_start_alert | UTILITY | 0 | 🔴 ALTA |
| 13 | low_attendance_alert | UTILITY | 0 | 🟡 MEDIA |
| 14 | absence_confirmation | UTILITY | 0 | 🟡 MEDIA |
| 15 | nutrition_post_strength | UTILITY | 0 | 🟢 BAJA |
| 16 | nutrition_post_cardio | UTILITY | 0 | 🟢 BAJA |
| 17 | nutrition_post_flexibility | UTILITY | 0 | 🟢 BAJA |
| 18 | reactivation_miss_you | MARKETING | 2 | 🟡 MEDIA |
| 19 | reactivation_social_proof | MARKETING | 0 | 🟢 BAJA |
| 20 | reactivation_special_offer | MARKETING | 1 | 🟡 MEDIA |
| 21 | tier_upgrade_offer_plus | MARKETING | 1 | 🟢 BAJA |
| 22 | tier_upgrade_offer_pro | MARKETING | 1 | 🟢 BAJA |
| 23 | valley_promotion_offer | MARKETING | 2 | 🟡 MEDIA |

**Total**: 23 templates (18 core + 5 adicionales)

---

## 🚀 Orden Recomendado de Creación

### Fase 1: Templates Críticos (Crear PRIMERO)
1. class_started_confirmation
2. debt_post_workout
3. post_class_survey
4. replacement_offer
5. late_start_alert
6. checklist_reminder

### Fase 2: Templates Importantes
7-14: Resto de UTILITY templates

### Fase 3: Templates Marketing
15-23: Templates de MARKETING

---

**Tiempo estimado total**: 1-2 horas para crear todos  
**Tiempo de aprobación**: 24-48 horas  
**Acción**: Iniciar creación HOY para tener aprobados antes del deployment

---

**Última actualización**: Octubre 3, 2025
