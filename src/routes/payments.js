const express = require('express');
const PaymentService = require('../services/PaymentService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     tags: [Payments]
 *     summary: Create payment intent for milestone
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - milestoneId
 *             properties:
 *               taskId:
 *                 type: string
 *               milestoneId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment intent created
 */
router.post('/create-intent', 
  authenticateToken,
  authorizeRoles('CLIENT'),
  async (req, res, next) => {
    try {
      const { taskId, milestoneId } = req.body;
      const result = await PaymentService.createPaymentIntent(taskId, milestoneId, req.user.id);
      res.status(201).json({
        message: 'Payment intent created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Handle Stripe webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    await PaymentService.handleWebhook(signature, req.body);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment history for current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const payments = await PaymentService.getPaymentHistory(req.user.id, req.user.role);
    res.json({
      message: 'Payment history retrieved successfully',
      data: payments
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;