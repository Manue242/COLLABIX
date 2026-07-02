FROM python:3.12-slim

WORKDIR /app

# On copie et on installe les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie le reste du code source du backend
COPY . .

# Sécurisation Cyber 3 : Création d'un utilisateur non-privilégié (pas de root)
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Commande de production (sans le --reload pour la stabilité et la sécurité)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]