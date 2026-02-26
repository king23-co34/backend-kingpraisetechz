const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/', requireAdmin, projectController.createProject);
router.put('/:id', requireAdmin, projectController.updateProject);
router.delete('/:id', requireAdmin, projectController.deleteProject);
router.get('/stats/dashboard', projectController.getDashboardStats);

module.exports = router;