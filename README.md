[English](#english) | [Русский](#русский)

---

## English

# SVG to TGS Converter

> Convert SVG files to Telegram Animated Stickers (.tgs) — entirely in your browser.

<img width="1623" height="1082" alt="SVG_TGS_EN_scr" src="https://github.com/user-attachments/assets/226d888c-2d3b-4c67-8a81-c213457d2649" />


**[→ Try it online](https://svg-to-tgs-converter-gamma.vercel.app/)**

---

### Features

- **Batch mode** — convert multiple SVGs to individual `.tgs` files at once
- **Sequence mode** — combine multiple SVGs into a single animated sticker (frame-by-frame)
- **Live preview** — side-by-side SVG source and Lottie animation preview
- **30 / 60 FPS** — choose the frame rate before converting
- **Download as ZIP** — grab all converted stickers in one click
- **Privacy-first** — everything runs client-side, no files leave your browser
- **EN / RU** interface

### Telegram sticker requirements

| Property | Value |
|---|---|
| Format | Lottie JSON gzip-compressed (`.tgs`) |
| Canvas size | 512 × 512 px |
| Max duration | 3 seconds |
| Max file size | 64 KB |

The converter enforces all constraints and shows an error if a file exceeds the size limit.

### Getting started

**Prerequisites:** Node.js ≥ 18

```bash
git clone https://github.com/slovesnij-wq/SVG_to_TGS_Converter.git
cd SVG_to_TGS_Converter
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Limitations

- Raster images embedded in SVG are ignored
- Filters, masks, clip-paths, and gradients are not rendered
- Very complex SVGs may exceed the 64 KB limit after conversion
- Animated SVGs (SMIL / CSS animations) are not supported — only the static structure is converted

### License

[MIT](LICENSE)

---

## Русский

# SVG в TGS Конвертер

> Конвертируй SVG файлы в анимированные стикеры Telegram (.tgs) — прямо в браузере.

**[→ Открыть онлайн](https://svg-to-tgs-converter-gamma.vercel.app/)**

---

### Возможности

- **Пакетный режим** — конвертация нескольких SVG в отдельные `.tgs` файлы за один раз
- **Режим последовательности** — объединение нескольких SVG в один анимированный стикер (покадрово)
- **Предпросмотр** — SVG источник и Lottie анимация рядом
- **30 / 60 FPS** — выбор частоты кадров перед конвертацией
- **Скачать ZIP** — все стикеры одним архивом
- **Без загрузки на сервер** — всё работает в браузере, файлы никуда не отправляются
- **Интерфейс на EN / RU**

### Требования Telegram к стикерам

| Параметр | Значение |
|---|---|
| Формат | Lottie JSON, сжатый gzip (`.tgs`) |
| Размер холста | 512 × 512 пикселей |
| Длительность | не более 3 секунд |
| Размер файла | не более 64 КБ |

Конвертер проверяет все ограничения и сообщает об ошибке, если файл превышает допустимый размер.

### Запуск локально

**Требования:** Node.js ≥ 18

```bash
git clone https://github.com/slovesnij-wq/SVG_to_TGS_Converter.git
cd SVG_to_TGS_Converter
npm install
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000) в браузере.

### Ограничения

- Растровые изображения внутри SVG игнорируются
- Фильтры, маски, clip-path и градиенты не поддерживаются
- Сложные SVG могут превысить лимит 64 КБ после конвертации
- Анимированные SVG (SMIL / CSS анимации) не поддерживаются — конвертируется только статическая структура

### Лицензия

[MIT](LICENSE)
