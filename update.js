const fs = require('fs');
const path = require('path');

// Ссылка на канал VK Video Live и видео-заглушку
const VK_CHANNEL_URL = 'https://live.vkvideo.ru/disney';
const OFFLINE_URL = 'https://nanoclicktv.github.io/offline.mp4';

// Папка и итоговый файл m3u8
const OUTPUT_DIR = path.join(__dirname, 'disney_channel');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.m3u8');

async function updateStream() {
  let targetUrl = OFFLINE_URL;

  try {
    const response = await fetch(VK_CHANNEL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Ищем .m3u8 ссылку в коде VK
      const match = html.match(/(https?:\\?\/\\?[^"]+?\.m3u8[^"]*)/i);

      if (match) {
        targetUrl = match[1].replace(/\\/g, '');
        console.log(' [OK] Активный поток VK Live найден!');
      } else {
        console.log(' [OFFLINE] Трансляция не идет. Подключаем заглушку.');
      }
    } else {
      console.log(` [ERROR] Ошибка ответа VK: ${response.status}`);
    }
  } catch (err) {
    console.error(' [ERROR] Ошибка при парсинге:', err.message);
  }

  // Формируем редирект-манифест HLS, понятный для IPTV плееров
  const m3u8Content = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\n${targetUrl}\n`;

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, m3u8Content, 'utf8');
  console.log(` [DONE] Файл сохранен в ${OUTPUT_FILE}`);
}

updateStream();
