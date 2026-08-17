const fs = require('fs');
const path = require('path');

const VK_CHANNEL_URL = 'https://live.vkvideo.ru/disney';

// Стабильная внешняя HLS-заглушка (.m3u8) для оффлайн режима
const OFFLINE_HLS_STREAM = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const OUTPUT_DIR = path.join(__dirname, 'disney_channel');
const INDEX_M3U8 = path.join(OUTPUT_DIR, 'index.m3u8');

async function getVkLiveStream() {
  try {
    const response = await fetch(VK_CHANNEL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      }
    });

    if (response.ok) {
      const html = await response.text();
      // Ищем .m3u8 в конфигурации VK Video Live
      const match = html.match(/(https?:\\?\/\\?[^"]+?\.m3u8[^"]*)/i);
      if (match) {
        return match[1].replace(/\\/g, '');
      }
    }
  } catch (err) {
    console.error('Ошибка запроса к VK:', err.message);
  }
  return null;
}

async function update() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const activeVkStream = await getVkLiveStream();
  
  let m3u8Content = '';

  if (activeVkStream) {
    console.log(' [ONLINE] Трансляция в эфире VK:', activeVkStream);
    // Для прямого эфира VK передаем ссылку через редирект-манифест
    m3u8Content = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\n${activeVkStream}\n`;
  } else {
    console.log(' [OFFLINE] Канал оффлайн. Подключаем HLS-заглушку.');
    
    // Если на сервере есть ваша локальная нарезка в disney_channel/hls/playlist.m3u8:
    const localHlsPath = path.join(OUTPUT_DIR, 'hls', 'playlist.m3u8');
    
    if (fs.existsSync(localHlsPath)) {
      // Подставляем содержимое вашего собственного HLS-плейлиста
      const localContent = fs.readFileSync(localHlsPath, 'utf8');
      // Корректируем относительные пути к .ts сегментам
      m3u8Content = localContent.replace(/(segment_\d+\.ts)/g, 'hls/$1');
    } else {
      // Если локальной нарезки нет — берем внешнюю заведомо рабочую HLS-заглушку
      m3u8Content = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\n${OFFLINE_HLS_STREAM}\n`;
    }
  }

  fs.writeFileSync(INDEX_M3U8, m3u8Content, 'utf8');
  console.log(' [DONE] Файл index.m3u8 успешно записан!');
}

update();
