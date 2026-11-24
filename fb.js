// Firebase につなぐための小さな部品（ログインとクラウド保存）
import { firebaseConfig } from './firebase-config.js';
const V = '10.12.2';
if (firebaseConfig && firebaseConfig.apiKey) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app), fs = F.getFirestore(app), prov = new A.GoogleAuthProvider();
  let user = null, ready; const readyP = new Promise(r => (ready = r));
  window.__login = async () => {
    try { await A.signInWithPopup(auth, prov); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-environment', 'auth/cancelled-popup-request'].includes(e.code)) await A.signInWithRedirect(auth, prov); else throw e; }
  };
  window.__logout = () => A.signOut(auth).then(() => location.reload());
  window.claude = { use: async (n) => {
    await readyP; if (!user) return null;
    if (n === 'user') return { id: async () => user.uid };
    if (n === 'db') return { doc: (p) => { const r = F.doc(fs, p); return {
      get: async () => { const s = await F.getDoc(r); return { exists: s.exists(), data: () => s.data() }; },
      set: (d) => F.setDoc(r, d).catch(e => { throw { code: e.code === 'permission-denied' ? 'invalid_argument' : (e.code || 'unavailable') }; }),
    }; } };
    return null;
  } };
  A.onAuthStateChanged(auth, (u) => {
    user = u; window.__fbUser = u ? { email: u.email } : null; ready();
    if (u && window.__initCloud) window.__initCloud();
    else if (!u && window.__setSync) window.__setSync('local');
  });
}
