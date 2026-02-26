const express = require('express');
const router  = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');
const { uploadProject }           = require('../middleware/upload.middleware');

router.use(authenticate);

router.post('/',          adminOnly,                               projectController.createProject);
router.get('/',                                                    projectController.getProjects);
router.get('/:id',                                                 projectController.getProject);
router.patch('/:id',      adminOnly,                               projectController.updateProject);
router.delete('/:id',     adminOnly,                               projectController.deleteProject);
router.post('/:id/upload',adminOnly, uploadProject.single('file'), projectController.uploadAttachment);

module.exports = router;