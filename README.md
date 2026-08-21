# Proxy Chat 🌐

Proxy Chat est une application sociale temps réel : les utilisateurs se déplacent dans un monde partagé et communiquent avec les personnes proches.

## Fonctionnalités actuelles

- Monde 2D fluide avec déplacement WASD / flèches
- Joueurs synchronisés en temps réel via WebSocket
- Chat écrit de proximité (rayon serveur : 360 unités)
- Bulles/identité visuelle des joueurs
- Profil avec pseudo
- Interface responsive PC/mobile
- Base de chat vocal WebRTC avec signalisation serveur
- Contrôle du micro et préparation du rayon vocal (260 unités)
- Endpoint `/health` pour surveiller le serveur

## Lancer le client

```bash
npm install
npm run dev
```

## Lancer le serveur multijoueur

```bash
npm run server
```

Le serveur écoute par défaut sur `http://localhost:3001` et le client se connecte automatiquement à `ws://localhost:3001` en développement.

Pour un serveur distant :

```text
VITE_SERVER_URL=wss://ton-serveur.example.com
```

## Déploiement

Le frontend est compatible avec Vercel. Le serveur WebSocket doit être déployé sur un environnement qui garde une connexion WebSocket persistante (par exemple un VPS, Railway, Render ou Fly.io). Une fonction serverless classique ne remplace pas ce serveur temps réel.

## Prochaine étape recommandée

Pour passer à une version plus proche d'un vrai monde social : moteur 3D, avatars personnalisables, plusieurs zones, matchmaking/rooms, amis/blocage/modération, et audio spatial réellement atténué selon la distance.
