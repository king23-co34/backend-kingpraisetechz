const express = require('express');
const router  = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate, adminOnly } = require('../middleware/auth.middleware');
const { uploadProject }           = require('../middleware/upload.middleware');

router.use(authenticate);

router.post('/',                    adminOnly,                                 taskController.createTask);
router.get('/',                                                                taskController.getTasks);
router.get('/:id',                                                             taskController.getTask);
router.patch('/:id',                adminOnly,                                 taskController.updateTask);
router.patch('/:id/status',                                                    taskController.updateTaskStatus);
router.post('/:id/submit',          uploadProject.single('file'),              taskController.submitTask);
router.delete('/:id',               adminOnly,                                 taskController.deleteTask);

module.exports = router;