const express = require('express');
const BidService = require('../services/BidService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, createBidSchema } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/bids/task/{taskId}:
 *   post:
 *     tags: [Bids]
 *     summary: Create a bid for a task
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
 *               - proposal
 *               - amount
 *               - timeline
 *             properties:
 *               proposal:
 *                 type: string
 *               amount:
 *                 type: number
 *               timeline:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bid created successfully
 */
router.post('/task/:taskId', 
  authenticateToken,
  authorizeRoles('FREELANCER'),
  validate(createBidSchema),
  async (req, res, next) => {
    try {
      const bid = await BidService.createBid(
        req.user.id,
        req.params.taskId,
        req.body
      );
      res.status(201).json({
        message: 'Bid created successfully',
        data: bid
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bids/task/{taskId}:
 *   get:
 *     tags: [Bids]
 *     summary: Get bids for a task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bids for the task
 */
router.get('/task/:taskId', async (req, res, next) => {
  try {
    const bids = await BidService.getBidsByTask(req.params.taskId, req.user?.id);
    res.json({
      message: 'Bids retrieved successfully',
      data: bids
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/bids/{id}/accept:
 *   post:
 *     tags: [Bids]
 *     summary: Accept a bid
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
 *         description: Bid accepted successfully
 */
router.post('/:id/accept', 
  authenticateToken,
  authorizeRoles('CLIENT'),
  async (req, res, next) => {
    try {
      const result = await BidService.acceptBid(req.params.id, req.user.id);
      res.json({
        message: 'Bid accepted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bids/my/bids:
 *   get:
 *     tags: [Bids]
 *     summary: Get current user's bids
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's bids
 */
router.get('/my/bids', 
  authenticateToken,
  authorizeRoles('FREELANCER'),
  async (req, res, next) => {
    try {
      const bids = await BidService.getUserBids(req.user.id);
      res.json({
        message: 'Bids retrieved successfully',
        data: bids
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;