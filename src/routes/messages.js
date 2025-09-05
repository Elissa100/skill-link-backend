const express = require('express');
const MessageService = require('../services/MessageService');
const { authenticateToken } = require('../middleware/auth');
const { validate, createMessageSchema } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/messages/task/{taskId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get messages for a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages for the task
 */
router.get('/task/:taskId', authenticateToken, async (req, res, next) => {
  try {
    const messages = await MessageService.getTaskMessages(req.params.taskId, req.user.id);
    res.json({
      message: 'Messages retrieved successfully',
      data: messages
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/messages/task/{taskId}:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message to a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/task/:taskId', 
  authenticateToken,
  validate(createMessageSchema),
  async (req, res, next) => {
    try {
      const message = await MessageService.createMessage({
        content: req.body.content,
        senderId: req.user.id,
        taskId: req.params.taskId
      });

      res.status(201).json({
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/messages/{id}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mark message as read
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
 *         description: Message marked as read
 */
router.patch('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const message = await MessageService.markAsRead(req.params.id, req.user.id);
    res.json({
      message: 'Message marked as read',
      data: message
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;