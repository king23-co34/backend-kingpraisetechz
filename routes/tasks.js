const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', taskController.getTasks);
router.put('/:id', taskController.updateTask);
router.post('/:id/submit', taskController.submitTask);
router.post('/:id/review', requireAdmin, taskController.reviewTask);

module.exports = router;