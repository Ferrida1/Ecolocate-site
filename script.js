/* ============================================================
   FIREBASE SETUP — paste your project's config here.
   Get this from: Firebase console > Project settings > General
   > "Your apps" > Web app > SDK setup and configuration.
   ============================================================ */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const CONTENT_DOC = db.collection('ecolocate').doc('content');

const DEFAULT_CONTENT = {
  whatsapp: '237682835293',
  statCount: '42',
  statSub: 'Serving 6 neighbourhoods across Douala',
  images: { hero: '', founder: '', gallery: [], tricycle: [] },
  pricing: [
    { name: 'Household', price: 'From XAF 5,000/month', desc: 'Weekly doorstep collection for homes.' },
    { name: 'Small Business', price: 'Custom pricing', desc: 'Higher volume, flexible weekly schedule.' },
    { name: 'Prepay Discount', price: '1 month free', desc: 'Prepay 12 months and get one month free.' }
  ],
  neighbourhoods: ['Bonamoussadi', 'Akwa', 'Bonapriso', 'Deido', 'Ndokoti', 'Bepanda'],
  testimonials: [
    { name: 'Marie, Bonamoussadi', quote: 'They come every week without fail. No more waiting for trucks that never show up.', photo: '' },
    { name: 'Paul, small shop owner, Akwa', quote: 'Affordable and reliable. My street is finally clean.', photo: '' }
  ]
};

let content = null;
let testiIndex = 0;
let isAdmin = false;

async function loadContent(){
  try{
    const snap = await CONTENT_DOC.get();
    content = snap.exists ? snap.data() : structuredClone(DEFAULT_CONTENT);
  }catch(e){
    console.error('load failed, using defaults', e);
    content = structuredClone(DEFAULT_CONTENT);
  }
  // fill in any missing keys from defaults (in case of older saved data)
  content = Object.assign(structuredClone(DEFAULT_CONTENT), content);
  content.images = Object.assign(structuredClone(DEFAULT_CONTENT.images), content.images || {});
}

async function saveContent(){
  try{
    await CONTENT_DOC.set(content);
  }catch(e){
    console.error('save failed', e);
    if(String(e.message || '').toLowerCase().includes('longer than')){
      alert("Couldn't save — the total content is too large for one document (1MB limit). Remove a photo or two and try again.");
    } else {
      alert("Couldn't save — check you're logged in and connected.");
    }
  }
}

function waLink(message){
  return `https://wa.me/${content.whatsapp}?text=${encodeURIComponent(message)}`;
}

function setAllWaButtons(){
  const general = waLink("Hi Ecolocate, I'd like to know more about your service.");
  ['navWaBtn','heroWaBtn','bannerWaBtn','contactWaBtn','fabWaBtn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.href = general;
  });
  document.getElementById('coverageWaBtn').href = waLink("I'd like Ecolocate to expand to my neighbourhood.");
  document.getElementById('footPhone').textContent = '+' + content.whatsapp.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');
  document.getElementById('footPhone2').textContent = '+' + content.whatsapp.replace(/^(\d{3})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');
}

function renderHeroFounder(){
  const heroBox = document.getElementById('heroImgBox');
  if(content.images.hero){
    heroBox.innerHTML = `<img src="${content.images.hero}" alt="Ecolocate tricycle">`;
  } else {
    heroBox.innerHTML = '<span class="placeholder-tag">Upload hero photo in Admin</span>';
  }
  const founderBox = document.getElementById('founderPhotoBox');
  if(content.images.founder){
    founderBox.innerHTML = `<img src="${content.images.founder}" alt="Founder">`;
  } else {
    founderBox.innerHTML = '<span class="placeholder-tag" style="bottom:10px;left:10px;">Upload founder photo</span>';
  }
}

function renderStats(){
  document.getElementById('statCount').textContent = content.statCount;
  document.getElementById('trustSub').textContent = content.statSub;
}

function renderPricing(){
  const grid = document.getElementById('pricingGrid');
  grid.innerHTML = content.pricing.map(p => `
    <div class="card price-card">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="amount">${escapeHtml(p.price)}</div>
      <p>${escapeHtml(p.desc)}</p>
      <a class="btn btn-clay btn-sm" target="_blank" href="${waLink(`Hi Ecolocate, I'd like to subscribe to the ${p.name} plan.`)}">Subscribe on WhatsApp</a>
    </div>
  `).join('');
}

function renderCoverage(){
  document.getElementById('coverageList').innerHTML = content.neighbourhoods.map(h => `<span class="pill">${escapeHtml(h)}</span>`).join('');
}

function renderGallery(){
  const grid = document.getElementById('galleryGrid');
  const imgs = content.images.gallery.length ? content.images.gallery : [null,null,null,null];
  grid.innerHTML = imgs.map((src,i) => src
    ? `<div class="gallery-item" data-src="${src}"><img src="${src}"></div>`
    : `<div class="gallery-item">Upload photo</div>`
  ).join('');
  document.querySelectorAll('.gallery-item[data-src]').forEach(el=>{
    el.addEventListener('click', ()=>{
      document.getElementById('lightboxImg').src = el.dataset.src;
      document.getElementById('lightbox').classList.add('open');
    });
  });

  const tri = document.getElementById('tricycleGallery');
  const triImgs = content.images.tricycle.length ? content.images.tricycle : [null,null,null];
  tri.innerHTML = triImgs.map(src => src
    ? `<div class="gallery-item"><img src="${src}"></div>`
    : `<div class="gallery-item">Tricycle photo</div>`
  ).join('');
}

function renderTestimonials(){
  const track = document.getElementById('testiTrack');
  const dots = document.getElementById('testiDots');
  if(!content.testimonials.length){
    track.innerHTML = '<p>No testimonials yet.</p>';
    dots.innerHTML = '';
    return;
  }
  if(testiIndex >= content.testimonials.length) testiIndex = 0;
  const t = content.testimonials[testiIndex];
  track.innerHTML = `
    <div class="testi-card">
      <div class="testi-photo">${t.photo ? `<img src="${t.photo}">` : ''}</div>
      <div>
        <blockquote>"${escapeHtml(t.quote)}"</blockquote>
        <div class="testi-name">${escapeHtml(t.name)}</div>
      </div>
    </div>`;
  dots.innerHTML = content.testimonials.map((_,i) => `<button class="testi-dot ${i===testiIndex?'active':''}" data-i="${i}"></button>`).join('');
  dots.querySelectorAll('.testi-dot').forEach(d=>{
    d.addEventListener('click', ()=>{ testiIndex = parseInt(d.dataset.i); renderTestimonials(); });
  });
}

function renderFaq(){
  const faqs = [
    { q: "What if I'm not home?", a: "Just leave your bin at the gate on your collection day — you don't need to be present." },
    { q: 'What if I miss a payment?', a: "Message us on WhatsApp. We'll work with you to get your subscription current — we won't cut you off without a conversation first." },
    { q: 'What areas do you cover?', a: 'See the Coverage Areas section above. Message us if your neighbourhood isn\u2019t listed yet.' },
    { q: 'What happens to the waste?', a: 'It is taken to an approved disposal point, keeping it out of drains, streets and informal dump sites.' }
  ];
  document.getElementById('faqList').innerHTML = faqs.map((f,i) => `
    <div class="faq-item" data-i="${i}">
      <div class="faq-q"><span>${f.q}</span><span class="faq-plus">+</span></div>
      <div class="faq-a"><p>${f.a}</p></div>
    </div>`).join('');
  document.querySelectorAll('.faq-item').forEach(item=>{
    item.querySelector('.faq-q').addEventListener('click', ()=> item.classList.toggle('open'));
  });
}

function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderAll(){
  setAllWaButtons();
  renderHeroFounder();
  renderStats();
  renderPricing();
  renderCoverage();
  renderGallery();
  renderTestimonials();
}

/* NAV */
document.getElementById('burgerBtn').addEventListener('click', ()=>{
  document.getElementById('navLinks').classList.toggle('open');
});
document.querySelectorAll('nav.links a').forEach(a=>{
  a.addEventListener('click', ()=> document.getElementById('navLinks').classList.remove('open'));
});

/* LIGHTBOX */
document.getElementById('lightboxClose').addEventListener('click', ()=> document.getElementById('lightbox').classList.remove('open'));
document.getElementById('lightbox').addEventListener('click', (e)=>{ if(e.target.id==='lightbox') e.currentTarget.classList.remove('open'); });

/* CONTACT FORM -> WhatsApp */
document.getElementById('fSubmit').addEventListener('click', ()=>{
  const name = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();
  const hood = document.getElementById('fHood').value.trim();
  const type = document.getElementById('fType').value;
  const msg = `Hi Ecolocate, I'd like to subscribe.\nName: ${name}\nPhone: ${phone}\nNeighbourhood: ${hood}\nType: ${type}`;
  window.open(waLink(msg), '_blank');
});

/* ===== ADMIN ===== */
const adminOverlay = document.getElementById('adminOverlay');
document.getElementById('openAdminLink').addEventListener('click', (e)=>{
  e.preventDefault();
  adminOverlay.classList.add('open');
  showLogin();
});
document.getElementById('adminCloseBtn').addEventListener('click', ()=> adminOverlay.classList.remove('open'));

function showLogin(){
  document.getElementById('adminLoginView').style.display = 'block';
  document.getElementById('adminPanelView').style.display = 'none';
}
async function showPanel(){
  document.getElementById('adminLoginView').style.display = 'none';
  document.getElementById('adminPanelView').style.display = 'block';
  fillAdminForm();
}

document.getElementById('adminLoginBtn').addEventListener('click', async ()=>{
  const email = document.getElementById('adminEmailInput').value.trim();
  const pass = document.getElementById('adminPassInput').value;
  document.getElementById('adminLoginError').textContent = '';
  try{
    await auth.signInWithEmailAndPassword(email, pass);
    // showPanel() runs from the onAuthStateChanged listener below
  } catch(e){
    document.getElementById('adminLoginError').textContent = 'Login failed: ' + e.message;
  }
});
document.getElementById('adminLogoutBtn').addEventListener('click', ()=>{
  auth.signOut();
});
auth.onAuthStateChanged(user => {
  isAdmin = !!user;
  if(user) showPanel(); else showLogin();
});

document.getElementById('adminChangePassBtn').addEventListener('click', async ()=>{
  const val = document.getElementById('adminNewPass').value.trim();
  if(val.length < 6){ alert('Password must be at least 6 characters.'); return; }
  try{
    await auth.currentUser.updatePassword(val);
    document.getElementById('adminNewPass').value = '';
    flashSaved();
  }catch(e){
    alert("Couldn't update password: " + e.message + ' (you may need to log out and back in first, then retry.)');
  }
});

function flashSaved(){
  const el = document.getElementById('adminSaveMsg');
  el.textContent = 'Saved ✓';
  setTimeout(()=> el.textContent = '', 1500);
}

function fillAdminForm(){
  document.getElementById('adminWaNumber').value = content.whatsapp;
  document.getElementById('adminStatCount').value = content.statCount;
  document.getElementById('adminStatSub').value = content.statSub;
  document.getElementById('prevHero').src = content.images.hero || '';
  document.getElementById('prevFounder').src = content.images.founder || '';
  renderAdminGalleryList();
  renderAdminPricingList();
  renderAdminHoodList();
  renderAdminTestiList();
}

document.querySelectorAll('[data-save]').forEach(btn=>{
  btn.addEventListener('click', async ()=>{
    const type = btn.dataset.save;
    if(type==='whatsapp') content.whatsapp = document.getElementById('adminWaNumber').value.replace(/\D/g,'');
    if(type==='stat'){
      content.statCount = document.getElementById('adminStatCount').value;
      content.statSub = document.getElementById('adminStatSub').value;
    }
    await saveContent();
    renderAll();
    flashSaved();
  });
});

// Compresses an image in the browser and returns a JPEG data URL.
// Keeps photos small enough to store directly in a Firestore document
// (no Firebase Storage / billing account required).
function compressImage(file, maxDim = 900, quality = 0.72){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
      else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.querySelectorAll('[data-img]').forEach(input=>{
  input.addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const key = input.dataset.img;
    try{
      content.images[key] = await compressImage(file);
      await saveContent();
      fillAdminForm();
      renderAll();
      flashSaved();
    }catch(err){
      alert('Upload failed: ' + err.message);
    }
  });
});

document.getElementById('adminGalleryAdd').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  try{
    content.images.gallery.push(await compressImage(file));
    await saveContent();
    fillAdminForm();
    renderAll();
    flashSaved();
  }catch(err){
    alert('Upload failed: ' + err.message);
  }
  e.target.value = '';
});

function renderAdminGalleryList(){
  const list = document.getElementById('adminGalleryList');
  list.innerHTML = content.images.gallery.map((src,i) => `
    <div class="img-upload-row">
      <img class="img-preview" src="${src}">
      <button class="mini-btn danger" data-remove-gallery="${i}">Remove</button>
    </div>`).join('') || '<p style="font-size:.85rem;color:var(--ink-soft);">No gallery photos yet.</p>';
  list.querySelectorAll('[data-remove-gallery]').forEach(b=>{
    b.addEventListener('click', async ()=>{
      content.images.gallery.splice(parseInt(b.dataset.removeGallery),1);
      await saveContent();
      fillAdminForm(); renderAll(); flashSaved();
    });
  });
}

function renderAdminPricingList(){
  const list = document.getElementById('adminPricingList');
  list.innerHTML = content.pricing.map((p,i) => `
    <div class="admin-row" data-p="${i}">
      <input type="text" value="${escapeAttr(p.name)}" data-field="name">
      <input type="text" value="${escapeAttr(p.price)}" data-field="price">
      <input type="text" value="${escapeAttr(p.desc)}" data-field="desc">
      <button class="mini-btn" data-save-price="${i}">Save</button>
    </div>`).join('');
  list.querySelectorAll('[data-save-price]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const row = btn.closest('.admin-row');
      const i = parseInt(btn.dataset.savePrice);
      content.pricing[i] = {
        name: row.querySelector('[data-field="name"]').value,
        price: row.querySelector('[data-field="price"]').value,
        desc: row.querySelector('[data-field="desc"]').value
      };
      await saveContent();
      renderPricing();
      flashSaved();
    });
  });
}

function renderAdminHoodList(){
  const list = document.getElementById('adminHoodList');
  list.innerHTML = content.neighbourhoods.map((h,i) => `
    <div class="admin-row">
      <input type="text" value="${escapeAttr(h)}" data-hood="${i}">
      <button class="mini-btn danger" data-remove-hood="${i}">Remove</button>
    </div>`).join('');
  list.querySelectorAll('[data-hood]').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      content.neighbourhoods[parseInt(inp.dataset.hood)] = inp.value;
      await saveContent();
      renderCoverage();
      flashSaved();
    });
  });
  list.querySelectorAll('[data-remove-hood]').forEach(b=>{
    b.addEventListener('click', async ()=>{
      content.neighbourhoods.splice(parseInt(b.dataset.removeHood),1);
      await saveContent();
      fillAdminForm(); renderCoverage(); flashSaved();
    });
  });
}
document.getElementById('adminHoodAddBtn').addEventListener('click', async ()=>{
  const val = document.getElementById('adminHoodNew').value.trim();
  if(!val) return;
  content.neighbourhoods.push(val);
  document.getElementById('adminHoodNew').value = '';
  await saveContent();
  fillAdminForm(); renderCoverage(); flashSaved();
});

function renderAdminTestiList(){
  const list = document.getElementById('adminTestiList');
  list.innerHTML = content.testimonials.map((t,i) => `
    <div class="admin-row" data-t="${i}">
      <input type="text" value="${escapeAttr(t.name)}" data-field="name" placeholder="Name / area">
      <textarea data-field="quote" rows="2" placeholder="Quote">${escapeHtml(t.quote)}</textarea>
      <input type="file" accept="image/*" data-field="photo">
      <button class="mini-btn" data-save-testi="${i}">Save</button>
      <button class="mini-btn danger" data-remove-testi="${i}">Remove</button>
    </div>`).join('') || '<p style="font-size:.85rem;color:var(--ink-soft);">No testimonials yet.</p>';

  list.querySelectorAll('[data-save-testi]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const row = btn.closest('.admin-row');
      const i = parseInt(btn.dataset.saveTesti);
      const fileInput = row.querySelector('[data-field="photo"]');
      let photo = content.testimonials[i].photo;
      if(fileInput.files[0]) photo = await compressImage(fileInput.files[0], 300, 0.7);
      content.testimonials[i] = {
        name: row.querySelector('[data-field="name"]').value,
        quote: row.querySelector('[data-field="quote"]').value,
        photo
      };
      await saveContent();
      renderTestimonials();
      flashSaved();
    });
  });
  list.querySelectorAll('[data-remove-testi]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      content.testimonials.splice(parseInt(btn.dataset.removeTesti),1);
      await saveContent();
      fillAdminForm(); renderTestimonials(); flashSaved();
    });
  });
}
document.getElementById('adminTestiAddBtn').addEventListener('click', async ()=>{
  content.testimonials.push({ name:'', quote:'', photo:'' });
  await saveContent();
  fillAdminForm();
  flashSaved();
});

function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }

/* INIT */
(async function init(){
  await loadContent();
  renderAll();
  renderFaq();
})();
