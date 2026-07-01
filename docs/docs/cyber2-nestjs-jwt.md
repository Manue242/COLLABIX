# 🛡️ Pôle Cyber 2 — Gestion des Accès (IAM) & Protection Périmétrique

Ce composant logiciel constitue le cœur du système de contrôle d'accès de la plateforme COLLABIX. Développé de manière isolée sous forme de microservice avec le framework **NestJS**, il applique un modèle d'architecture *Zero-Trust* : aucun accès aux fragments vidéo chiffrés par le pôle Cyber 1 (Olivier) n'est autorisé sans validation préalable par ce module.

---

## 🛠️ 1. Spécifications Techniques & Initialisation

Le projet a été instancié au sein du répertoire `/frontend` de l'infrastructure globale pour centraliser les mécanismes d'interfaçage.

* **Framework principal :** NestJS (TypeScript)
* **Serveur d'écoute interne :** `http://localhost:3000`
* **Exposition de l'environnement virtuel :** GitHub Codespaces (Port basculé en visibilité `🌐 Public` pour interconnecter l'équipe).

---

## 🔑 2. Gestion Interne de l'Authentification (JWT)

Afin de supprimer le stockage d'états côté serveur (Session Stateless) et de se prémunir contre les menaces de type **Spoofing** (Usurpation), un système d'émission de jetons éphémères a été implémenté via `@nestjs/jwt`.

* **Endpoint d'authentification :** `POST /auth/login`
* **Format du payload attendu :**
```json
{
  "username": "string",
  "password": "string"
}
