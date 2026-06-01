const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { describeImage } = require('../services/visionService');

// 配置multer
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.upload.dir, 'images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.upload.dir, 'audio');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'));
    }
  },
}).single('image');

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.aac', '.m4a', '.silk'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  },
}).single('audio');

/**
 * POST /api/upload/image
 * 上传图片并返回AI描述
 */
function uploadImageHandler(req, res) {
  uploadImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }

    const imageUrl = `/uploads/images/${req.file.filename}`;
    const fullPath = req.file.path;

    // 生成AI描述
    const description = await describeImage(fullPath);

    res.json({
      image_url: imageUrl,
      image_description: description,
      file_name: req.file.originalname,
      file_size: req.file.size,
    });
  });
}

/**
 * POST /api/upload/audio
 * 上传音频文件（存档/备用）
 */
function uploadAudioHandler(req, res) {
  uploadAudio(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择音频文件' });
    }

    const audioUrl = `/uploads/audio/${req.file.filename}`;

    res.json({
      audio_url: audioUrl,
      file_name: req.file.originalname,
      file_size: req.file.size,
    });
  });
}

module.exports = { uploadImageHandler, uploadAudioHandler };
