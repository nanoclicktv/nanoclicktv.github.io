const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VK_CHANNEL_URL = 'https://live.vkvideo.ru/disney';
const OFFLINE_MP4 = path.join(__dirname, 'offline.mp4');
const OUTPUT_DIR = path.join(__dirname, 'disney_channel');
const HLS_DIR = path.join(OUTPUT_DIR, 'hls');
const INDEX_M3U8 = path.join(OUTPUT_DIR, 'index.m3u8');
const HLS_PLAYLIST = path.join(HLS_DIR, 'playlist.m3u8');

// Получение прямой ссылки на VK Live
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
      const match = html.match(/(https?:\\?\/\\?[^"]+?\.m3u8[^"]*)/i);
      if (match) {
        return match[1].replace(/\\/g, '');
      }
    }
  } catch (err) {
    console.error(' Ошибка запроса VK:', err.message);
  }
  return null;
}

// Проверка и разовое создание HLS нарезки (.ts)
function ensureHlsOfflineExists() {
  if (!fs.existsSync(HLS_DIR)) {
    fs.mkdirSync(HLS_DIR, { recursive: true });
  }

  // Если готовый плейлист и сегменты уже существуют — ничего не нарезаем
  if (fs.existsSync(HLS_PLAYLIST)) {
    console.log(' [CACHE] HLS нарезка уже существует в папке hls, используем её.');
    return;
  }

  console.log(' [FFMPEG] Нарезка оффлайн видео в HLS (.ts сегменты)...');
  
  if (!fs.existsSync(OFFLINE_MP4)) {
    console.error(' [ERROR] Файл offline.mp4 не найден в корне!');
    return;
  }

  try {
    // Нарезаем offline.mp4 на .ts файлы по 6 секунд
    const ffmpegCmd = `ffmpeg -i "${OFFLINE_MP4}" -c:v copy -c:a copy -hls_time 6 -hls_list_size 0 -hls_segment_filename "${path.join(HLS_DIR, 'segment_%03d.ts')}" "${HLS_PLAYLIST}"`;
    execSync(ffmpegCmd, { stdio: 'inherit' });
    console.log(' [OK] HLS сегменты успешно созданы!');
  } catch (e) {
    console.error(' [ERROR] Ошибка выполнения FFmpeg:', e.message);
  }
}

async function update() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const activeStreamUrl = await getVkLiveStream();
  let targetM3u8Url = '';

  if (activeStreamUrl) {
    console.log(' [ONLINE] Трансляция в эфире:', activeStreamUrl);
    targetM3u8Url = activeStreamUrl;
  } else {
    console.log(' [OFFLINE] Трансляция завершена.');
    ensureHlsOfflineExists();
    // Относительный путь к нашему HLS-плейлисту в GitHub Pages
    targetM3u8Url = 'hls/playlist.m3u8';
  }

  // Записываем файл index.m3u8
  const indexContent = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\n${targetM3u8Url}\n`;
  fs.writeFileSync(INDEX_M3U8, indexContent, 'utf8');
  console.log(' [DONE] index.m3u8 сохранен.');
}

update();
