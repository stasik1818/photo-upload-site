console.log('script.js loaded');

// Ждём загрузки EmailJS
function initEmailJS() {
  if (typeof emailjs === 'undefined') {
    console.error('EmailJS not loaded, retrying in 500ms');
    setTimeout(initEmailJS, 500);
    return;
  }
  emailjs.init("LLTnqHOpCj7sKSuda").then(() => {
    console.log('EmailJS initialized');
  }).catch((error) => {
    console.error('EmailJS initialization failed:', error);
  });
}
initEmailJS();

const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const nameInput = document.getElementById('nameInput');
const commentInput = document.getElementById('commentInput');
const frame = document.getElementById('frame');
let isDragging = false;
let offsetX, offsetY;
let scale = 1;

// Загрузка изображения
imageUpload.addEventListener('change', function (e) {
  console.log('File input changed');
  const file = e.target.files[0];
  if (!file) {
    console.log('No file selected');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    alert('Файл слишком большой! Максимум 25 МБ.');
    console.log('File too large:', file.size);
    return;
  }
  if (!file.type.startsWith('image/')) {
    alert('Пожалуйста, выберите изображение (PNG, JPEG и т.д.).');
    console.log('Invalid file type:', file.type);
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      console.log('FileReader loaded data');
      imagePreview.src = event.target.result;
      // Сбрасываем состояние
      scale = 1;
      imagePreview.style.transform = `scale(${scale})`;
      imagePreview.style.left = '0px';
      imagePreview.style.top = '0px';
      imagePreview.classList.add('loaded');
      console.log('Image loaded successfully, src set');
    } catch (error) {
      console.error('Error setting image:', error);
      alert('Ошибка при загрузке изображения.');
    }
  };
  reader.onerror = function (error) {
    console.error('FileReader error:', error);
    alert('Ошибка при чтении файла.');
  };
  reader.readAsDataURL(file);
  console.log('FileReader started reading:', file.name);
});

// Перетаскивание мышью
imagePreview.addEventListener('mousedown', function (e) {
  isDragging = true;
  offsetX = e.clientX - imagePreview.getBoundingClientRect().left;
  offsetY = e.clientY - imagePreview.getBoundingClientRect().top;
  imagePreview.style.cursor = 'grabbing';
  console.log('Drag started (mouse)');
});

// Перетаскивание сенсором
imagePreview.addEventListener('touchstart', function (e) {
  e.preventDefault();
  isDragging = true;
  const touch = e.touches[0];
  offsetX = touch.clientX - imagePreview.getBoundingClientRect().left;
  offsetY = touch.clientY - imagePreview.getBoundingClientRect().top;
  console.log('Drag started (touch)');
});

document.addEventListener('mousemove', function (e) {
  if (isDragging) {
    const frameRect = frame.getBoundingClientRect();
    let newLeft = e.clientX - offsetX - frameRect.left;
    let newTop = e.clientY - offsetY - frameRect.top;
    imagePreview.style.left = `${newLeft}px`;
    imagePreview.style.top = `${newTop}px`;
  }
});

document.addEventListener('touchmove', function (e) {
  if (isDragging) {
    e.preventDefault();
    const touch = e.touches[0];
    const frameRect = frame.getBoundingClientRect();
    let newLeft = touch.clientX - offsetX - frameRect.left;
    let newTop = touch.clientY - offsetY - frameRect.top;
    imagePreview.style.left = `${newLeft}px`;
    imagePreview.style.top = `${newTop}px`;
  }
});

document.addEventListener('mouseup', function () {
  isDragging = false;
  imagePreview.style.cursor = 'grab';
  console.log('Drag ended (mouse)');
});

document.addEventListener('touchend', function () {
  isDragging = false;
  console.log('Drag ended (touch)');
});

// Масштабирование колесом мыши
imagePreview.addEventListener('wheel', function (e) {
  e.preventDefault();
  if (e.deltaY < 0) {
    scale += 0.1;
  } else {
    scale -= 0.1;
  }
  scale = Math.min(Math.max(0.01, scale), 25);
  imagePreview.style.transform = `scale(${scale})`;
  console.log(`Scale updated to: ${scale}`);
});

// Отправка изображения
function submitImage() {
  if (!imagePreview.src || !imagePreview.classList.contains('loaded')) {
    alert('Сначала загрузите изображение!');
    console.log('No image loaded');
    return;
  }
  if (!nameInput.value.trim()) {
    alert('Пожалуйста, введите ваше имя.');
    console.log('No name entered');
    return;
  }

  console.log('Submit button clicked');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1011; // ~300 DPI
  canvas.height = 638;

  const frameRect = frame.getBoundingClientRect();
  const imageRect = imagePreview.getBoundingClientRect();

  const sx = (frameRect.left - imageRect.left) / scale;
  const sy = (frameRect.top - imageRect.top) / scale;
  const sWidth = 428 / scale;
  const sHeight = 270 / scale;

  const img = new Image();
  img.src = imagePreview.src;

  img.onload = () => {
    try {
      console.log('Canvas image loaded');
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1011, 638);
      const base64data = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

      console.log('Sending EmailJS request');
      emailjs.send('service_91166rkvva2', 'template_1e7wmua', {
        name: nameInput.value,
        comment: commentInput.value,
        image_data: base64data
      }).then(() => {
        alert('Заказ отправлен на почту!');
        console.log('Order sent via EmailJS');
      }).catch((error) => {
        console.error('Ошибка отправки:', error);
        alert('Ошибка при отправке заказа.');
      });

      canvas.toBlob((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cropped_image.jpg';
        link.click();
        window.URL.revokeObjectURL(url);
        console.log('Image downloaded');
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Error processing canvas:', error);
      alert('Ошибка при обработке изображения.');
    }
  };
  img.onerror = function () {
    console.error('Error loading image for canvas');
    alert('Ошибка при загрузке изображения для обработки.');
  };
}