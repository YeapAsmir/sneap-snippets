# Guide de Test - Sneap

## 1. Démarrage

### Backend

```bash
# Terminal 1 - Démarrer le backend
cd packages/back
npm run dev
```

### Extension

```bash
# Terminal 2 - Compiler l'extension
cd packages/front
npm run compile

# Puis dans VS Code : F5 pour lancer une nouvelle fenêtre
```

## 2. Tests de Performance

### Test 1: Recherche par préfixe (Trie)

1. Dans la nouvelle fenêtre VS Code, créez un fichier `.js`
2. Tapez `y` et observez les suggestions
3. Continuez avec `ya`, `yap`, `yapi`
4. Vérifiez dans la console du backend les temps de recherche

### Test 2: Cache multi-niveaux

1. Tapez `ytest` plusieurs fois
2. Observez que les suggestions deviennent plus rapides
3. Utilisez la commande : `Cmd+Shift+P` → "Sneap: Show Info"
4. Vérifiez le nombre d'éléments en cache mémoire

### Test 3: Recherche floue

Testez l'API directement :

```bash
# Recherche exacte
curl "http://localhost:3000/api/snippets/prefix?prefix=yap&limit=5"

# Recherche floue (typo)
curl "http://localhost:3000/api/snippets/prefix?prefix=yaip&fuzzy=true"
```

### Test 4: Performance avec volume

```bash
# Créer un script pour ajouter 10k snippets
cat > test-load.js << 'EOF'
// Dans packages/back/src/snippets.ts, ajoutez :
for (let i = 0; i < 10000; i++) {
  snippets.push({
    name: `Test Snippet ${i}`,
    prefix: `test${i}`,
    body: [`console.log('Test ${i}');`],
    description: `Test snippet number ${i}`,
    scope: ['javascript']
  });
}
EOF
```

## 3. Métriques à Observer

### Console Backend

-   Temps de recherche Trie : `searchTime: "Xms"`
-   Stats du Trie au démarrage : `totalNodes`, `avgDepth`

### Console Extension (Dev Tools)

-   `Search completed in Xms`
-   `Loaded X snippets from server`

### Commandes de Debug

-   `Yeap Snippets: Show Info` - Voir stats du cache
-   `Yeap Snippets: Clear Cache` - Réinitialiser le cache
-   `Yeap Snippets: Refresh from Server` - Recharger les snippets

## 4. Tests de Réseau

### Test Offline

1. Démarrez l'extension avec le backend
2. Tapez quelques préfixes pour remplir le cache
3. Arrêtez le backend (Ctrl+C)
4. Continuez à taper - devrait utiliser le cache local

### Test Latence

```bash
# Simuler une latence réseau (macOS)
sudo dnctl pipe 1 config delay 200ms
sudo dnctl pipe 1 config bw 1Mbit/s
```

## 5. Benchmarks

### Script de test de charge

```javascript
// test-performance.js
const iterations = 1000;
const prefixes = ['y', 'ya', 'yap', 'yapi', 'ytest', 'yfetch'];

async function benchmark() {
    for (const prefix of prefixes) {
        const start = Date.now();

        for (let i = 0; i < iterations; i++) {
            await fetch(`http://localhost:3000/api/snippets/prefix?prefix=${prefix}`);
        }

        const time = Date.now() - start;
        console.log(`${prefix}: ${time}ms total, ${time / iterations}ms avg`);
    }
}

benchmark();
```

## 6. Résultats Attendus

| Opération         | Temps Cible | Cache       |
| ----------------- | ----------- | ----------- |
| Préfixe 1-2 chars | < 50ms      | Mémoire     |
| Préfixe 3+ chars  | < 100ms     | Storage/API |
| Recherche floue   | < 150ms     | API         |
| Fallback offline  | < 20ms      | Local       |

## 7. Monitoring

### VS Code Output

1. View → Output → Select "Sneap Front Snippets"
2. Observez les logs de performance

### Network Tab

1. Ouvrez DevTools dans la fenêtre d'extension
2. Onglet Network pour voir les requêtes
3. Vérifiez que les requêtes sont bien debounced

## Troubleshooting

-   **Pas de suggestions** : Vérifiez que le backend est démarré
-   **Suggestions lentes** : Clearhez le cache et redémarrez
-   **Erreurs TypeScript** : Recompilez avec `npm run compile`
