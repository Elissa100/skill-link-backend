const express = require('express');
const TaskService = require('../services/TaskService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, createTaskSchema, updateTaskSchema } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks with filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: minBudget
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxBudget
 *         schema:
 *           type: number
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await TaskService.getAllTasks(req.query);
    res.json({
      message: 'Tasks retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - budget
 *               - deadline
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('CLIENT', 'ADMIN'),
  upload.array('attachments', 5),
  validate(createTaskSchema),
  async (req, res, next) => {
    try {
      const taskData = {
        ...req.body,
        budget: parseFloat(req.body.budget),
        deadline: new Date(req.body.deadline)
      };

      // Handle file attachments
      if (req.files && req.files.length > 0) {
        taskData.attachments = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        }));
      }

      const task = await TaskService.createTask(req.user.id, taskData);
      res.status(201).json({
        message: 'Task created successfully',
        data: task
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const task = await TaskService.getTaskById(req.params.id, req.user?.id);
    res.json({
      message: 'Task retrieved successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Update task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.put('/:id', 
  authenticateToken, 
  validate(updateTaskSchema),
  async (req, res, next) => {
    try {
      const updateData = { ...req.body };
      if (updateData.budget) updateData.budget = parseFloat(updateData.budget);
      if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);

      const task = await TaskService.updateTask(req.params.id, req.user.id, updateData);
      res.json({
        message: 'Task updated successfully',
        data: task
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await TaskService.deleteTask(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tasks/my/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get current user's tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's tasks
 */
router.get('/my/tasks', authenticateToken, async (req, res, next) => {
  try {
    const tasks = await TaskService.getUserTasks(req.user.id, req.user.role);
    res.json({
      message: 'Tasks retrieved successfully',
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;