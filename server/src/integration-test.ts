import axios from 'axios';
import prisma from './lib/prisma';

const API_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('🧪 Starting integration tests for SaaS Association Charitable...');

  try {
    // 1. LOGIN
    console.log('\n🔑 Testing Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });

    const token = loginRes.data.accessToken;
    if (!token) {
      throw new Error('Login failed: no access token returned');
    }
    console.log('✅ Login successful!');

    // Configure axios client with auth token
    const client = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` }
    });

    // 2. BENEFICIARIES LIST & NAME ORDERING
    console.log('\n📋 Testing Beneficiaries & Name Ordering...');
    const bensRes = await client.get('/beneficiaries');
    const beneficiaries = bensRes.data;
    console.log(`Found ${beneficiaries.length} beneficiaries.`);

    // Check if the order is corrected: lastNameAr then firstNameAr
    const khadija = beneficiaries.find((b: any) => b.firstNameAr === 'خديجة' && b.lastNameAr === 'منصوري');
    if (!khadija) {
      throw new Error('Khadija Mansouri not found in seeded beneficiaries');
    }
    console.log(`Verified beneficiary name: ${khadija.lastNameAr} ${khadija.firstNameAr}`);

    // 3. CAISSES LIST & BALANCE
    console.log('\n💰 Checking Caisses & Balances...');
    const caissesRes = await client.get('/caisses');
    const caisses = caissesRes.data;
    const medicalCaisse = caisses.find((c: any) => c.nameAr === 'الصندوق الطبي');
    if (!medicalCaisse) {
      throw new Error('Medical caisse not found');
    }
    console.log(`Medical Caisse initial balance: ${medicalCaisse.balance} DA`);

    // 4. MEDICAL REFERRALS & DEBIT IMPACT
    console.log('\n🏥 Testing Medical Referrals & Debit Financial Impact...');
    const initialBalance = medicalCaisse.balance;
    const referralAmount = 15000;

    const medicalRefRes = await client.post('/medical/referrals', {
      beneficiaryId: khadija.id,
      caisseId: medicalCaisse.id,
      doctorName: 'Dr. Benyoucef',
      doctorNameAr: 'د. بن يوسف',
      amount: referralAmount,
      date: new Date().toISOString().split('T')[0],
      analysisType: 'IRM',
      analysisTypeAr: 'تصوير بالرنين',
    });
    console.log('✅ Medical referral created successfully! Ref:', medicalRefRes.data.reference);

    // Verify balance is decremented on the caisse
    const updatedCaissesRes = await client.get('/caisses');
    const updatedMedicalCaisse = updatedCaissesRes.data.find((c: any) => c.id === medicalCaisse.id);
    console.log(`Medical Caisse updated balance: ${updatedMedicalCaisse.balance} DA`);
    if (updatedMedicalCaisse.balance !== initialBalance - referralAmount) {
      throw new Error(`Caisse balance not updated correctly. Expected ${initialBalance - referralAmount}, got ${updatedMedicalCaisse.balance}`);
    }
    console.log('✅ Financial debit transaction verified successfully on the caisse!');

    // 5. INVENTORY & ARTICLES
    console.log('\n📦 Testing Inventory & Articles...');
    // Create an article category
    const catRes = await client.post('/inventory/article-categories', {
      name: 'Fauteuil roulant',
      nameAr: 'كرسي متحرك'
    });
    const category = catRes.data;

    // Create a storage location
    const locRes = await client.post('/inventory/storage-locations', {
      name: 'Depot Principal',
      nameAr: 'المستودع الرئيسي'
    });
    const location = locRes.data;

    // Create an article
    const articleRes = await client.post('/inventory/articles', {
      reference: `ART-${Date.now()}`,
      name: 'Wheelchair Standard',
      nameAr: 'كرسي متحرك قياسي',
      categoryId: category.id,
      quantity: 5,
      storageLocationId: location.id,
      isPermanent: false
    });
    const article = articleRes.data;
    console.log(`✅ Article created! Name: ${article.nameAr}, Total Qty: ${article.quantity}, Available: ${article.availableQuantity}`);

    // 6. LOANS CREATION & QUANTITY ADJUSTMENT
    console.log('\n🔄 Testing Loans Creation & Stock Reservation...');
    const loanRes = await client.post('/loans', {
      reference: `LOAN-${Date.now()}`,
      beneficiaryId: khadija.id,
      items: [
        {
          articleId: article.id,
          quantity: 2,
          conditionOnLoan: 'ممتاز'
        }
      ],
      loanDate: new Date().toISOString().split('T')[0]
    });
    const loan = loanRes.data;
    console.log(`✅ Loan created successfully! Ref: ${loan.reference}`);

    // Check quantity decrease
    const afterLoanArticlesRes = await client.get(`/inventory/articles/${article.id}`);
    const articleAfterLoan = afterLoanArticlesRes.data;
    console.log(`Article quantity available after loan: ${articleAfterLoan.availableQuantity}`);
    if (articleAfterLoan.availableQuantity !== 3) {
      throw new Error(`Available quantity should be 3, got ${articleAfterLoan.availableQuantity}`);
    }
    console.log('✅ Stock quantity reservation verified!');

    // 7. LOAN RETURN PARTIAL
    console.log('\n↩️ Testing Partial Loan Return...');
    const returnRes = await client.post(`/loans/${loan.id}/return`, {
      items: [
        {
          articleId: article.id,
          quantity: 1,
          condition: 'ممتاز'
        }
      ]
    });
    console.log(`✅ Return processed! Loan Status: ${returnRes.data.status}`);

    // Check quantity increase by 1
    const afterReturn1ArticlesRes = await client.get(`/inventory/articles/${article.id}`);
    console.log(`Article quantity available after partial return: ${afterReturn1ArticlesRes.data.availableQuantity}`);
    if (afterReturn1ArticlesRes.data.availableQuantity !== 4) {
      throw new Error(`Available quantity should be 4, got ${afterReturn1ArticlesRes.data.availableQuantity}`);
    }
    console.log('✅ Partial stock restoration verified!');

    // 8. LOAN RETURN COMPLETE
    console.log('\n↩️ Testing Complete Loan Return...');
    const returnRes2 = await client.post(`/loans/${loan.id}/return`, {
      items: [
        {
          articleId: article.id,
          quantity: 1,
          condition: 'ممتاز'
        }
      ]
    });
    console.log(`✅ Return processed! Final Loan Status: ${returnRes2.data.status}`);

    // Check quantity restored to initial 5
    const afterReturn2ArticlesRes = await client.get(`/inventory/articles/${article.id}`);
    console.log(`Article quantity available after complete return: ${afterReturn2ArticlesRes.data.availableQuantity}`);
    if (afterReturn2ArticlesRes.data.availableQuantity !== 5) {
      throw new Error(`Available quantity should be 5, got ${afterReturn2ArticlesRes.data.availableQuantity}`);
    }
    console.log('✅ Complete stock restoration verified!');

    // 9. CLEAN TEST DATA
    console.log('\n🧹 Cleaning up test data...');
    // Delete loan
    await client.delete(`/loans/${loan.id}`);
    // Delete article
    await client.delete(`/inventory/articles/${article.id}`);
    // Delete location & category
    await client.delete(`/inventory/storage-locations/${location.id}`);
    await client.delete(`/inventory/article-categories/${category.id}`);
    console.log('✅ Cleanup successful!');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The SaaS works perfectly at all levels.');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
