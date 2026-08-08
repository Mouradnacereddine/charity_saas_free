/**
 * Integration tests — Module Inventaire (StockTake)
 *
 * Reproduit le flux complet d'une session d'inventaire :
 *   1. Login admin
 *   2. Création article + catégorie + lieu de stockage
 *   3. POST /stock-takes  → snapshot (theoretical = availableQuantity, catégorie & lieu inclus)
 *   4. PUT  /stock-takes/:id/items → enregistre les comptages
 *   5. POST /stock-takes/:id/complete → ajuste availableQuantity par delta
 *   6. Rejets : items non comptés / counted négatif / doublon de complétion
 *   7. Cancel d'une session
 *   8. Nettoyage des données de test
 *
 * Lancement : `cd server && npx ts-node src/integration-test-stocktakes.ts`
 * (serveur API sur :3001 requis)
 */
import axios from 'axios';
import prisma from './lib/prisma';

const API_URL = 'http://localhost:3001/api';

interface TestIds {
  categoryId?: string;
  locationId?: string;
  articleId?: string;
}

async function runStockTakeTests() {
  console.log('\n🧪 Integration tests — MODULE INVENTAIRE');
  const created: TestIds = {};
  let stockTakeId: string | null = null;

  try {
    // 1. LOGIN
    console.log('\n🔑 Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123',
    });
    const token = loginRes.data.accessToken;
    if (!token) throw new Error('Login failed');
    const client = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Login OK');

    // 2. Créer catégorie, lieu, article
    const cat = await client.post('/inventory/article-categories', { name: '__stk_test_cat__' });
    const loc = await client.post('/inventory/storage-locations', { name: '__stk_test_loc__' });
    created.categoryId = cat.data.id;
    created.locationId = loc.data.id;
    const art = await client.post('/inventory/articles', {
      name: '__stk_test_article__',
      category: cat.data.id,
      storageLocation: loc.data.id,
      quantity: 5,
    });
    created.articleId = art.data.id;
    console.log(`✅ Article créé id=${art.data.id} availableQuantity=${art.data.availableQuantity}`);

    // 3. CREATE stock-take → snapshot
    console.log('\n📦 POST /stock-takes...');
    const stRes = await client.post('/inventory/stock-takes', {});
    const st = stRes.data;
    stockTakeId = st.id;
    console.log(`✅ Session créée ref=${st.reference} status=${st.status} items=${st.items.length}`);
    const item = st.items[0];
    console.log(`   item[0]: name=${item.articleName} theoretical=${item.theoretical} counted=${item.counted}`);
    if (st.status !== 'in_progress') throw new Error('Statut initial doit être in_progress');
    if (st.items.length !== 1) throw new Error('Attendu 1 item dans le snapshot');
    if (item.theoretical !== 5) throw new Error(`theoretical attendu 5, obtenu ${item.theoretical}`);
    if (!item.categoryName || !item.storageName) throw new Error('Snapshot doit inclure catégorie + lieu (pour le filtre avancé)');

    // 4. SAVE items → comptage
    console.log('\n✏️ PUT /stock-takes/:id/items (counted=3)...');
    const saveRes = await client.put(`/stock-takes/${st.id}/items`, {
      items: [{ articleId: created.articleId, counted: 3 }],
    });
    const savedItem = saveRes.data.items.find((i: any) => i.articleId === created.articleId);
    if (savedItem.counted !== 3) throw new Error(`counted attendu 3, obtenu ${savedItem.counted}`);
    if (savedItem.diff !== -2) throw new Error(`diff attendu -2, obtenu ${savedItem.diff}`);
    console.log('✅ Comptage enregistré (counted=3, diff=-2)');

    // 5. COMPLETE → availableQuantity: 5 + (3-5) = 3
    console.log('\n✅ POST /stock-takes/:id/complete...');
    const completeRes = await client.post(`/stock-takes/${st.id}/complete`);
    console.log(`   status après complete = ${completeRes.data.status}`);
    if (completeRes.data.status !== 'completed') throw new Error('Statut attendu completed');
    const artAfter = await client.get(`/inventory/articles/${created.articleId}`);
    console.log(`   availableQuantity après = ${artAfter.data.availableQuantity}`);
    if (artAfter.data.availableQuantity !== 3) throw new Error(`availableQuantity attendu 3, obtenu ${artAfter.data.availableQuantity}`);
    if (artAfter.data.quantity !== 5) throw new Error(`quantity (total) ne doit pas changer, obtenu ${artAfter.data.quantity}`);

    // 6. REJETS
    console.log('\n🚫 Tests de rejets...');
    // counted négatif
    const badCat = await client.post('/inventory/article-categories', { name: '__stk_test_cat2__' });
    const badLoc = await client.post('/inventory/storage-locations', { name: '__stk_test_loc2__' });
    const badArt = await client.post('/inventory/articles', {
      name: '__stk_test_article2__',
      category: badCat.data.id,
      storageLocation: badLoc.data.id,
      quantity: 4,
    });
    const st2 = await client.post('/inventory/stock-takes', {});
    const st2Id = st2.data.id;
    try {
      await client.put(`/stock-takes/${st2Id}/items`, { items: [{ articleId: badArt.data.id, counted: -3 }] });
      throw new Error('PUT avec counted négatif aurait dû être rejeté');
    } catch (e: any) {
      if (e.response?.status !== 400) throw new Error(`Attendu 400 pour counted négatif, obtenu ${e.response?.status}`);
    }
    // Complete sans comptage → 400 (inventaire incomplet)
    const st3 = await client.post('/inventory/stock-takes', {});
    const st3Id = st3.data.id;
    try {
      await client.post(`/stock-takes/${st3Id}/complete`);
      throw new Error('Complete sans comptage aurait dû être rejeté');
    } catch (e: any) {
      if (e.response?.status !== 400) throw new Error(`Attendu 400 (incomplet), obtenu ${e.response?.status}`);
    }
    console.log('✅ Rejets validés (counted négatif → 400, incomplete → 400)');

    // 7. CANCEL
    console.log('\n🗑️ Cancel session...');
    const cancel = await client.delete(`/stock-takes/${st3Id}`);
    if (cancel.data.message !== 'Stock take cancelled successfully') throw new Error('Cancel inattendu');
    const st3After = await client.get(`/stock-takes/${st3Id}`);
    if (st3After.data.status !== 'cancelled') throw new Error('Statut attendu cancelled');
    console.log('✅ Cancel OK');

    // 8. Double complétion → 400 (déjà fermé)
    try {
      await client.post(`/stock-takes/${st.id}/complete`);
      throw new Error('Double complete aurait dû être rejeté');
    } catch (e: any) {
      if (e.response?.status !== 400) throw new Error(`Attendu 400 (déjà fermé), obtenu ${e.response?.status}`);
    }

    // Nettoyage
    console.log('\n🧹 Cleanup ...');
    await client.delete(`/stock-takes/${st2Id}`);
    await client.delete(`/inventory/articles/${badArt.data.id}`);
    await client.delete(`/inventory/articles/${created.articleId}`);
    await client.delete(`/inventory/storage-locations/${badLoc.data.id}`);
    await client.delete(`/inventory/article-categories/${badCat.data.id}`);
    await client.delete(`/inventory/storage-locations/${loc.data.id}`);
    await client.delete(`/inventory/article-categories/${cat.data.id}`);

    console.log('\n🎉 TOUS LES TESTS D\'INVENTAIRE PASSENT ! Le module est fonctionnel.');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void runStockTakeTests();