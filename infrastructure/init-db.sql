-- Инициализация баз данных для микросервисов Booking System
-- Этот скрипт выполняется автоматически при первом запуске PostgreSQL контейнера
-- и создает отдельные базы данных для каждого микросервиса:
--   - api_service: база данных для API Service
--   - booking_service: база данных для Booking Service

-- Создание базы данных для API Service
CREATE DATABASE api_service;

-- Создание базы данных для Booking Service
CREATE DATABASE booking_service;

-- Предоставление всех прав пользователю postgres на обе базы данных
GRANT ALL PRIVILEGES ON DATABASE api_service TO postgres;
GRANT ALL PRIVILEGES ON DATABASE booking_service TO postgres;

