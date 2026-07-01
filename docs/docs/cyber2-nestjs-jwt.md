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

---


## 🚀 3. Routage Sécurisé & Contrat d'Interface

Le microservice intercepte les requêtes de déchiffrement vidéo légitimes. Nginx (Arcy - Cyber 3) est configuré pour interdire l'accès statique direct au fichier de clé et délègue la vérification de confiance à cette API.

* **Endpoint de distribution de clés :** `GET /api/video/key`
* **Condition d'accès :** Présence obligatoire du jeton dans les en-têtes HTTP.
* **En-tête requis :** `Authorization: Bearer <votre_jwt_token>`
* **Processus de validation :** Utilisation de la méthode `jwtService.verifyAsync()`. Si le token est altéré, expiré ou absent, le serveur lève immédiatement une exception `401 Unauthorized`.

---

## 🧱 4. Bouclier Défensif Périmétrique (Rate-Limiting)

Pour neutraliser les attaques par force brute sur la page de connexion et le scraping automatisé de segments vidéos (simulé par Valence - Cyber 5), un mécanisme de limitation de requêtes a été adossé au microservice via le package `@nestjs/throttler`.

* **Intercepteur activé :** `ThrottlerGuard` appliqué globalement sur l'ensemble des contrôleurs.
* **Seuil de tolérance configuré :** **10 requêtes maximum** autorisées sur une fenêtre glissante de **60 secondes** par adresse IP.

### 📊 Validation Réelle en Test d'Intrusion (Red Team / Blue Team)
Lors des simulations offensives réelles menées via scripts de requêtage automatisés :
1. **Requêtes 1 à 10 :** Traitées normalement par l'application (Statut HTTP `201` ou `401/200` selon la validité).
2. **À partir de la 11ème requête :** Le bouclier se lève. L'infrastructure bloque l'accès et renvoie instantanément un code d'erreur **`HTTP 429 Too Many Requests`**.

---

## 📑 5. Alignement Gouvernance (STRIDE & RGPD)

Cette implémentation technique couvre directement les risques identifiés par le pôle Gouvernance (Steve - Cyber 4) :
* **Elevation of Privilege (Couverte) :** Le serveur vérifie la structure interne du JWT avant de délivrer la clé premium, empêchant la modification malveillante des privilèges client.
* **Denial of Service & Asphyxie (Couverte) :** Le Rate-Limiter NestJS absorbe la charge des scripts malveillants avant qu'ils n'atteignent la couche applicative lourde.
* **Traçabilité RGPD :** Les rejets d'attaques (Erreurs 429) génèrent des logs horodatés (IP, Timestamp, Route ciblée) isolés, essentiels pour la détection d'incidents par l'équipe d'exploitation.
  
```json
{
  "username": "string",
  "password": "string"
}
