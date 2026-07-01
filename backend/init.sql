SELECT 'CREATE DATABASE collabix_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'collabix_test')\gexec
