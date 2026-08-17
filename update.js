const fs = require('fs');
const path = require('path');

const VK_CHANNEL_URL = 'https://live.vkvideo.ru/disney';

// Прямая ссылка на ваш .ts файл на raw.githubusercontent.com (как у Kinowalk)
const OFFLINE_TS_URL = 'https://raw.githubusercontent.com/nanoclicktv/nanoclicktv.github.io/main/offline.ts';

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
      // Ищем .m3u8 ссылку в конфигурации VK Video Live
      const match = html.match(/(https?:\\?\/\\?[^"]+?\.m3u8[^"]*)/i);
      if (match) {
        return match[1].replace(/\\/g, '');
      }
    }
  } catch (err) {
    console.error('Ошибка запроса VK:', err.message);
  }
  return null;
}

async function update() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const activeStreamUrl = await getVkLiveStream();
  let m3u8Content = '';

  if (activeStreamUrl) {
    console.log(' [ONLINE] Трансляция в эфире VK:', activeStreamUrl);
    m3u8Content = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\n${activeStreamUrl}\n`;
  } else {
    console.log(' [OFFLINE] Канал оффлайн. Подключаем HLS-заглушку Kinowalk.');
    
    // Формат точь-в-точь как у Kinowalk
    m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
${OFFLINE_TS_URL}
#EXTINF:10.0,
${OFFLINE_TS_URL}
`;
  }

  fs.writeFileSync(INDEX_M3U8, m3u8Content, 'utf8');
  console.log(' [DONE] Файл index.m3u8 обновлен.');
}

update();
