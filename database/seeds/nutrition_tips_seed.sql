-- PROMPT 13: NUTRITION TIPS - SEED DATA
-- Tips nutricionales iniciales para diferentes tipos de entrenamiento

-- Tips para CARDIO
INSERT INTO nutrition_tips (class_type, tip_title, tip_description, macro_focus, recipe_name, recipe_ingredients, recipe_instructions, timing_recommendation) VALUES
('cardio', 'Recarga tus reservas de glucógeno', 'Después de cardio intenso, tu cuerpo necesita reponer las reservas de glucógeno con carbohidratos de calidad y una hidratación óptima.', 'carbs', 'Batido recuperador de plátano y avena', '1 plátano maduro, 3 cdas de avena, 1 taza de leche (vegetal o animal), 1 cdta de miel, canela al gusto', 'Licúa todos los ingredientes hasta obtener textura suave. Consume inmediatamente. Aporta carbohidratos de rápida absorción y fibra.', 'Dentro de 30-60 min post-entrenamiento'),

('cardio', 'Hidratación inteligente post-cardio', 'La hidratación no es solo agua. Después de sudar intensamente necesitas reponer electrolitos (sodio, potasio) además de fluidos.', 'hydration', 'Bebida electrolítica casera', '500ml agua de coco, jugo de 1 limón, 1 pizca de sal marina, 1 cdta de miel', 'Mezcla todos los ingredientes. Bebe lentamente en los 60 min post-cardio. El agua de coco aporta potasio natural.', 'Inmediatamente después y durante la siguiente hora'),

('cardio', 'Carbohidratos + proteína para recuperación óptima', 'La combinación 3:1 de carbohidratos a proteína acelera la recuperación muscular y la reposición de glucógeno después de cardio.', 'carbs', 'Tostadas integrales con hummus y fruta', '2 tostadas de pan integral, 3 cdas de hummus, 1 manzana en rodajas, 1 cdta de semillas de chía', 'Unta el hummus en las tostadas, coloca las rodajas de manzana encima y espolvorea con chía. Relación ideal 3:1.', 'Dentro de 45-90 min post-entrenamiento'),

-- Tips para STRENGTH (Fuerza)
('strength', 'Ventana anabólica: maximiza tu ganancia muscular', 'Los primeros 30-120 min post-entrenamiento son cruciales. Tu cuerpo está primed para absorber proteína y construir músculo.', 'protein', 'Batido anabólico de recuperación', '1 scoop proteína whey (25g), 1 plátano, 2 cdas mantequilla de maní, 1 taza leche, hielo', 'Licúa todo hasta textura cremosa. Aporta 30-35g proteína + carbohidratos para insulina. Consume en los primeros 60 min.', 'Dentro de 30-90 min post-entrenamiento'),

('strength', 'Proteína completa para síntesis muscular', 'Necesitas aminoácidos esenciales (especialmente leucina) para activar mTOR y la síntesis de proteína muscular.', 'protein', 'Bowl de quinoa con pollo y aguacate', '1 taza quinoa cocida, 150g pechuga de pollo, 1/2 aguacate, vegetales al vapor, aceite de oliva', 'Mezcla quinoa, pollo desmenuzado, aguacate en cubos y vegetales. Rocía con aceite de oliva. 35-40g proteína completa.', 'Dentro de 60-120 min post-entrenamiento'),

('strength', 'Timing de proteína: frecuencia > cantidad', 'Mejor 20-25g proteína cada 3-4 horas que 50g de una vez. Tu cuerpo solo puede sintetizar ~25g por comida eficientemente.', 'protein', 'Yogurt griego con frutos secos', '200g yogurt griego natural, 30g almendras, 1 cda miel, 1/2 taza frutos rojos', 'Mezcla yogurt con frutos rojos, cubre con almendras picadas y miel. 25g proteína de alta calidad.', 'Dentro de 90 min post-entrenamiento'),

('strength', 'Creatina + carbohidratos: combo perfecto', 'Los carbohidratos post-entrenamiento aumentan la absorción de creatina y ayudan a reponer fosfato de creatina muscular.', 'protein', 'Avena con proteína y plátano', '1 taza avena cocida, 1 scoop proteína, 1 plátano, 1 cdta creatina monohidrato, canela', 'Cocina la avena, mezcla proteína y creatina, añade plátano en rodajas. Potencia máxima recuperación.', 'Dentro de 30-60 min post-entrenamiento'),

-- Tips para FLEXIBILITY (Yoga/Pilates)
('flexibility', 'Antioxidantes para reducir inflamación', 'Yoga y pilates generan micro-inflamación. Los antioxidantes (vitamina C, E, polifenoles) aceleran recuperación del tejido conectivo.', 'fats', 'Bowl antioxidante de açaí', '1 pack açaí congelado, 1/2 taza frutos rojos, 1 plátano, granola, coco rallado, semillas de chía', 'Licúa açaí con frutos rojos, sirve en bowl, cubre con plátano, granola, coco y chía. Bomba antioxidante.', 'Dentro de 60-90 min post-clase'),

('flexibility', 'Grasas saludables para movilidad articular', 'Omega-3 y omega-6 reducen inflamación articular y mejoran lubricación. Esencial después de trabajo de movilidad intenso.', 'fats', 'Salmón con aguacate y espinaca', '150g salmón al horno, 1/2 aguacate, 2 tazas espinaca fresca, limón, aceite de oliva', 'Hornea salmón 15 min a 180°C, sirve sobre espinaca, añade aguacate y limón. Omega-3 + grasas monoinsaturadas.', 'Dentro de 90-120 min post-clase'),

('flexibility', 'Hidratación + minerales para elasticidad', 'Magnesio, potasio y calcio son cruciales para función muscular y prevención de calambres después de stretching profundo.', 'hydration', 'Smoothie verde mineral', '2 tazas espinaca, 1 plátano, 1/2 pepino, 1 cdta espirulina, 1 taza agua de coco, jugo de limón', 'Licúa todo hasta suave. Rico en magnesio (espinaca), potasio (plátano), hidratación (agua de coco).', 'Inmediatamente después de clase');

-- Marcar todos como activos
UPDATE nutrition_tips SET active = TRUE;

COMMENT ON TABLE nutrition_tips IS 'Seed inicial: 10 tips nutricionales (3 cardio, 4 strength, 3 flexibility)';
