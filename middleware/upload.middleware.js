const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ─────────────────────────────────────────────────────────────
// 1️⃣ Validate Environment Variables (Fail Fast)
// ─────────────────────────────────────────────────────────────
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("❌ Cloudinary environment variables are missing");
}

// ─────────────────────────────────────────────────────────────
// 2️⃣ Configure Cloudinary
// ─────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────────────────────────
// 3️⃣ Helper: Sanitize Folder Name
// ─────────────────────────────────────────────────────────────
const sanitize = (value) => {
  if (!value) return "general";
  return value.toString().replace(/[^a-zA-Z0-9-_]/g, "");
};

// ─────────────────────────────────────────────────────────────
// 4️⃣ Project Storage
// ─────────────────────────────────────────────────────────────
const projectStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const projectId = sanitize(req.params.projectId);

    return {
      folder: `dashboard/projects/${projectId}`,
      resource_type: "auto",
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "zip",
        "mp4",
        "mov",
      ],
      transformation: [{ quality: "auto" }],
    };
  },
});

// ─────────────────────────────────────────────────────────────
// 5️⃣ Avatar Storage
// ─────────────────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "dashboard/avatars",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 300,
        height: 300,
        crop: "fill",
        gravity: "face",
        quality: "auto",
      },
    ],
  }),
});

// ─────────────────────────────────────────────────────────────
// 6️⃣ File Filter (Type Validation)
// ─────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "video/mp4",
    "video/quicktime",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("❌ Unsupported file type"), false);
  }

  cb(null, true);
};

// ─────────────────────────────────────────────────────────────
// 7️⃣ Multer Upload Instances
// ─────────────────────────────────────────────────────────────
const uploadProject = multer({
  storage: projectStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─────────────────────────────────────────────────────────────
// 8️⃣ Cloudinary Delete Utility (Safe)
// ─────────────────────────────────────────────────────────────
const deleteFile = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

// ─────────────────────────────────────────────────────────────
// 9️⃣ Export
// ─────────────────────────────────────────────────────────────
module.exports = {
  uploadProject,
  uploadAvatar,
  deleteFile,
  cloudinary,
};
