const fileInput = document.getElementById('fileInput');
const pixelSizeInput = document.getElementById('pixelSize');
const pixelSizeValue = document.getElementById('pixelSizeValue');
const pixelateBtn = document.getElementById('pixelateBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pixelCountInput = document.getElementById('pixelCount');
const pixelRatioLabel = document.getElementById('pixelRatioLabel');
const paletteInput = document.getElementById('paletteInput');
const paletteList = document.getElementById('paletteList');
const paletteColorInput = document.getElementById('paletteColorInput');
const addPaletteColorBtn = document.getElementById('addPaletteColorBtn');
const downloadBtn = document.getElementById('downloadBtn');

let img = new Image();
let palette = [];

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => img.src = evt.target.result;
    reader.readAsDataURL(file);
});

function getPixelSize() {
    const pixelCount = parseInt(pixelCountInput.value, 10);
    if (pixelCount && pixelCount > 0 && canvas.width) {
        return Math.max(1, Math.floor(canvas.width / pixelCount));
    }
    return parseInt(pixelSizeInput.value, 10) || 10;
}

function getPixelCountX() {
    const pixelCount = parseInt(pixelCountInput.value, 10);
    if (pixelCount && pixelCount > 0) return pixelCount;
    const size = getPixelSize();
    return Math.floor(canvas.width / size);
}

function getPixelCountY() {
    const size = getPixelSize();
    return Math.floor(canvas.height / size);
}

function updatePixelRatio() {
    if (img.width && img.height) {
        pixelRatioLabel.textContent = `Пикселей по ширине: ${getPixelCountX()}, по высоте: ${getPixelCountY()}`;
    } else {
        pixelRatioLabel.textContent = '';
    }
}

function parsePalette() {
    return palette.length > 0 ? palette : null;
}

// Функция поиска ближайшего цвета из палитры
function findNearestColor(r, g, b, palette) {
    let minDist = Infinity, nearest = palette[0];
    for (const hex of palette) {
        const rgb = hexToRgb(hex);
        if (!rgb) continue;
        const dist = Math.pow(r - rgb.r, 2) + Math.pow(g - rgb.g, 2) + Math.pow(b - rgb.b, 2);
        if (dist < minDist) {
            minDist = dist;
            nearest = hex;
        }
    }
    return nearest;
}

// Преобразование HEX в RGB
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    if (hex.length !== 6) return null;
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function pixelize() {
    if (!img.src) return;
    const pixelSize = getPixelSize();
    const palette = parsePalette();
    ctx.drawImage(img, 0, 0);
    const { width, height } = canvas;
    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            const imageData = ctx.getImageData(x, y, pixelSize, pixelSize);
            const data = imageData.data;
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                a += data[i + 3];
                count++;
            }
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);
            a = Math.round(a / count);

            let fillStyle;
            if (palette && palette.length > 0) {
                fillStyle = findNearestColor(r, g, b, palette);
            } else {
                fillStyle = `rgba(${r},${g},${b},${a / 255})`;
            }
            ctx.fillStyle = fillStyle;
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
    }
}

function syncInputsFromCount() {
    const pixelCount = parseInt(pixelCountInput.value, 10);
    if (pixelCount && pixelCount > 0 && img.width) {
        pixelSizeInput.disabled = true;
        pixelSizeValue.style.opacity = 0.5;
        const newPixelSize = Math.max(1, Math.floor(canvas.width / pixelCount));
        pixelSizeInput.value = newPixelSize;
        pixelSizeValue.textContent = newPixelSize;
    } else {
        pixelSizeInput.disabled = false;
        pixelSizeValue.style.opacity = 1;
    }
}

function syncInputsFromSize() {
    if (!pixelSizeInput.disabled) {
        pixelCountInput.value = '';
        pixelSizeInput.disabled = false;
        pixelSizeValue.style.opacity = 1;
    }
    pixelSizeValue.textContent = pixelSizeInput.value;
}

// --- Сохранение палитры в localStorage ---
const PALETTE_STORAGE_KEY = 'pixelizator_palette';

// Загрузка палитры из localStorage
function loadPalette() {
    try {
        const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
        if (saved) {
            const arr = JSON.parse(saved);
            if (Array.isArray(arr)) {
                palette = arr;
            }
        }
    } catch (e) {
        palette = [];
    }
    renderPalette();
    pixelize();
}

// Сохранение палитры в localStorage
function savePalette() {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palette));
}

// Модифицируем renderPalette для сохранения
function renderPalette() {
    paletteList.innerHTML = '';
    palette.forEach((color, idx) => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'palette-color';
        colorDiv.style.background = color;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'palette-color-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Удалить цвет';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            palette.splice(idx, 1);
            renderPalette();
            pixelize();
            savePalette();
        };

        colorDiv.appendChild(removeBtn);
        paletteList.appendChild(colorDiv);
    });
    savePalette();
}

// --- Кнопка очистки палитры ---
let clearPaletteBtn = document.getElementById('clearPaletteBtn');
if (!clearPaletteBtn) {
    clearPaletteBtn = document.createElement('button');
    clearPaletteBtn.id = 'clearPaletteBtn';
    clearPaletteBtn.textContent = 'Очистить палитру';
    clearPaletteBtn.style.marginTop = '8px';
    clearPaletteBtn.style.background = 'linear-gradient(90deg, #ff4f4f 0%, #ff8a65 100%)';
    clearPaletteBtn.style.color = '#fff';
    clearPaletteBtn.style.border = 'none';
    clearPaletteBtn.style.borderRadius = '5px';
    clearPaletteBtn.style.padding = '6px 14px';
    clearPaletteBtn.style.fontSize = '15px';
    clearPaletteBtn.style.cursor = 'pointer';
    clearPaletteBtn.style.fontWeight = '500';
    clearPaletteBtn.style.transition = 'background 0.2s';
    clearPaletteBtn.onmouseover = () => clearPaletteBtn.style.background = 'linear-gradient(90deg, #ff8a65 0%, #ff4f4f 100%)';
    clearPaletteBtn.onmouseout = () => clearPaletteBtn.style.background = 'linear-gradient(90deg, #ff4f4f 0%, #ff8a65 100%)';
    document.querySelector('.palette-panel').appendChild(clearPaletteBtn);
}

clearPaletteBtn.addEventListener('click', () => {
    if (confirm('Вы действительно хотите очистить палитру?')) {
        palette = [];
        renderPalette();
        pixelize();
        savePalette();
    }
});

// Добавление цвета или палитры через запятую
addPaletteColorBtn.addEventListener('click', () => {
    let val = paletteColorInput.value.trim();
    if (!val) return;

    // Разбиваем по запятой, пробелы убираем
    let colors = val.split(',').map(c => c.trim()).filter(Boolean);

    let added = false;
    for (let color of colors) {
        if (!color.startsWith('#')) color = '#' + color;
        // Проверка HEX
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
            continue;
        }
        if (!palette.includes(color)) {
            palette.push(color);
            added = true;
        }
    }

    if (!added && colors.length === 1) {
        paletteColorInput.value = '';
        paletteColorInput.placeholder = 'Некорректный HEX';
        return;
    }

    renderPalette();
    pixelize();
    savePalette();
    paletteColorInput.value = '';
    paletteColorInput.placeholder = '#RRGGBB';
});

// ENTER для добавления
paletteColorInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addPaletteColorBtn.click();
});

pixelCountInput.addEventListener('input', () => {
    syncInputsFromCount();
    updatePixelRatio();
    pixelize();
});

pixelSizeInput.addEventListener('input', () => {
    syncInputsFromSize();
    updatePixelRatio();
    pixelize();
});

pixelateBtn.addEventListener('click', pixelize);

downloadBtn.addEventListener('click', () => {
    // Проверяем, есть ли что скачивать
    if (!canvas.width || !canvas.height) return;
    const link = document.createElement('a');
    link.download = 'pixelized.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link); // Для Firefox
    link.click();
    document.body.removeChild(link);
});

img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    syncInputsFromCount();
    updatePixelRatio();
    pixelize();
};

// Вызов загрузки палитры при старте
loadPalette();