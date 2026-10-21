CREATE TABLE IF NOT EXISTS productos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    marca VARCHAR(80) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    categoria ENUM('Calzado', 'Indumentaria', 'Accesorios') NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    imagen VARCHAR(2048) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT precio_positivo CHECK (precio > 0),
    CONSTRAINT estado_valido CHECK (activo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
