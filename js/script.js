// スムーススクロール
const smoothScrollAnchors = document.querySelectorAll('a[href^="#"]');
smoothScrollAnchors.forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ギャラリーの Lightbox 表示
const galleryImages = document.querySelectorAll('.gallery-grid img');
galleryImages.forEach(img => {
  img.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.innerHTML = `
      <div class="lightbox-content">
        <img src="${img.src}" alt="${img.alt}">
        <span class="lightbox-close">&times;</span>
      </div>
    `;
    document.body.appendChild(overlay);

    // 閉じる処理
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
        overlay.remove();
      }
    });
  });
});

// Contact フォーム送信後の表示切り替え
const form = document.getElementById('contact-form');
const thankYou = document.getElementById('thank-you');
if (form && thankYou) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    // ここで fetch() を使ってバックエンドにデータを送信できます
    form.reset();
    form.classList.add('hidden');
    thankYou.classList.remove('hidden');
  });
}
