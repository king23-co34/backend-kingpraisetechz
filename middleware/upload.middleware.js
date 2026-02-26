const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ── Cloudinary Configuration ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Project / Generic File Storage ──────────────────────────────────
const projectStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `dashboard/projects/${req.params.projectId || 'general'}`,
    resource_type: 'auto',
    allowed_formats: ['jpg','jpeg','png','gif','pdf','doc','docx','xls','xlsx','zip','mp4','mov'],
    transformation: [{ quality: 'auto' }]
  })
});

// ── Avatar Storage ─────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: (req) => ({
    folder: 'dashboard/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg','jpeg','png','webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
  })
});

// ── File Filter ────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB default
  if (file.size > MAX_SIZE) {
    return cb(new Error('File too large. Max 10MB.'), false);
  }
  cb(null, true);
};

// ── Multer Upload Instances ─────────────────────────────────────────
const uploadProject = multer({
  storage: projectStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ── Cloudinary Delete Utility ──────────────────────────────────────
const deleteFile = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

// ── Exports ────────────────────────────────────────────────────────
module.exports = { uploadProject, uploadAvatar, deleteFile, cloudinary };
