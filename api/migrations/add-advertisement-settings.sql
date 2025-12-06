-- Migration: Adicionar configurações de propaganda e EmployeeCheck
-- Data: 2024-12-02
-- Descrição: Permite configurar propaganda e campos visíveis no EmployeeCheck (consulta pública)

-- Adicionar colunas de propaganda na tabela system_settings
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS ad_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ad_title VARCHAR(255) DEFAULT 'Prefeitura Municipal de Ipixuna',
ADD COLUMN IF NOT EXISTS ad_subtitle VARCHAR(255) DEFAULT 'Juntos por um novo tempo',
ADD COLUMN IF NOT EXISTS ad_image_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ad_bg_color_from VARCHAR(50) DEFAULT '#15803d',
ADD COLUMN IF NOT EXISTS ad_bg_color_to VARCHAR(50) DEFAULT '#16a34a',
ADD COLUMN IF NOT EXISTS ad_delay_seconds INTEGER DEFAULT 3;

-- Adicionar colunas de configuração do EmployeeCheck
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS ec_show_photo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_matricula BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_position BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_department BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_punctuality BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_graph BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_stats BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_vacation_holidays BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_show_records_list BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ec_records_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS ec_custom_title VARCHAR(255) DEFAULT 'Consulta de Frequência',
ADD COLUMN IF NOT EXISTS ec_custom_subtitle VARCHAR(255) DEFAULT 'Digite seu CPF para verificar seus registros de ponto';

-- Comentários para documentação - Propaganda
COMMENT ON COLUMN system_settings.ad_enabled IS 'Habilita/desabilita a propaganda no EmployeeCheck';
COMMENT ON COLUMN system_settings.ad_title IS 'Título principal da propaganda';
COMMENT ON COLUMN system_settings.ad_subtitle IS 'Subtítulo/slogan da propaganda';
COMMENT ON COLUMN system_settings.ad_image_url IS 'URL da imagem/logo da propaganda';
COMMENT ON COLUMN system_settings.ad_bg_color_from IS 'Cor inicial do gradiente de fundo';
COMMENT ON COLUMN system_settings.ad_bg_color_to IS 'Cor final do gradiente de fundo';
COMMENT ON COLUMN system_settings.ad_delay_seconds IS 'Segundos antes de mostrar a propaganda';

-- Comentários para documentação - EmployeeCheck
COMMENT ON COLUMN system_settings.ec_show_photo IS 'Mostrar foto do funcionário';
COMMENT ON COLUMN system_settings.ec_show_matricula IS 'Mostrar número de matrícula';
COMMENT ON COLUMN system_settings.ec_show_position IS 'Mostrar cargo do funcionário';
COMMENT ON COLUMN system_settings.ec_show_department IS 'Mostrar departamento';
COMMENT ON COLUMN system_settings.ec_show_punctuality IS 'Mostrar indicador de pontualidade';
COMMENT ON COLUMN system_settings.ec_show_graph IS 'Mostrar gráfico visual de frequência';
COMMENT ON COLUMN system_settings.ec_show_stats IS 'Mostrar cards de estatísticas (presenças, faltas, horas)';
COMMENT ON COLUMN system_settings.ec_show_vacation_holidays IS 'Mostrar férias e feriados';
COMMENT ON COLUMN system_settings.ec_show_records_list IS 'Mostrar lista de registros detalhados';
COMMENT ON COLUMN system_settings.ec_records_limit IS 'Quantidade máxima de registros a exibir';
COMMENT ON COLUMN system_settings.ec_custom_title IS 'Título personalizado da página';
COMMENT ON COLUMN system_settings.ec_custom_subtitle IS 'Subtítulo personalizado da página';
